from datetime import timedelta

from fastapi import APIRouter, Request, Response
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError

from ..errors import ApiError
from ..models import AuthSession, Plan, User
from ..rate_limit import consume
from ..schemas import LoginIn, PasswordChangeIn, PlanDocument, RecoverIn, RegisterIn
from ..security import csrf_for, hash_password, hash_token, needs_rehash, new_token, safe_equal, verify_password
from ..sessions import IDLE_AGE, MAX_SESSIONS, Config, CurrentUser, Db, Now, issue_session, public_user

router = APIRouter(prefix='/api/auth', tags=['auth'])
WINDOW = timedelta(minutes=15)
INVALID_LOGIN = 'Correo o contraseña incorrectos.'
INVALID_RECOVERY = 'No se puede recuperar la cuenta con estos datos.'


def throttle(request: Request, now, scope: str, limit: int, email: str | None = None) -> None:
    engine = request.app.state.engine
    client = request.client.host if request.client else 'unknown'
    consume(engine, now, f'{scope}:ip:{client}', limit, WINDOW)
    if email:
        consume(engine, now, f'{scope}:email:{email}', 10, WINDOW)


@router.post('/register', status_code=201)
def register(body: RegisterIn, request: Request, response: Response, db: Db, settings: Config, now: Now):
    throttle(request, now, 'register', 5)
    with request.app.state.password_worker.slot():
        password_hash = hash_password(body.password)
    recovery_code = new_token()
    user = User(email=body.email, name=body.name, password_hash=password_hash, recovery_hash=hash_token(recovery_code), created_at=now, updated_at=now)
    try:
        db.add(user)
        db.flush()
        db.add(Plan(user_id=user.id, document=PlanDocument.empty(now.strftime('%Y-%m')), revision=0, updated_at=now))
        auth = issue_session(db, request, response, settings, now, user)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiError(400, 'No se puede crear la cuenta con estos datos. Prueba a iniciar sesión o recuperar el acceso.')
    return {**auth, 'recoveryCode': recovery_code}


@router.post('/login')
def login(body: LoginIn, request: Request, response: Response, db: Db, settings: Config, now: Now):
    throttle(request, now, 'login', settings.auth_rate_limit, body.email)
    user = db.scalars(select(User).where(User.email == body.email)).one_or_none()
    # Se verifica siempre un hash, exista o no el correo, para no revelar cuentas por tiempo de respuesta.
    with request.app.state.password_worker.slot():
        valid = verify_password(user.password_hash if user else None, body.password)
        new_hash = hash_password(body.password) if valid and needs_rehash(user.password_hash) else None
    if not user or not valid:
        raise ApiError(401, INVALID_LOGIN)
    # Bloqueo de fila: si una recuperación cambió la contraseña durante la verificación, se rechaza.
    current_hash = db.scalar(select(User.password_hash).where(User.id == user.id).with_for_update())
    if current_hash != user.password_hash:
        raise ApiError(401, INVALID_LOGIN)
    if new_hash:
        user.password_hash = new_hash
    auth = issue_session(db, request, response, settings, now, user)
    db.commit()
    return auth


@router.post('/recover')
def recover(body: RecoverIn, request: Request, response: Response, db: Db, settings: Config, now: Now):
    throttle(request, now, 'recover', 10, body.email)
    user = db.scalars(select(User).where(User.email == body.email)).one_or_none()
    recovery_hash = hash_token(body.recoveryCode)
    with request.app.state.password_worker.slot():
        next_hash = hash_password(body.password)
    if not user or not safe_equal(user.recovery_hash, recovery_hash):
        raise ApiError(400, INVALID_RECOVERY)
    recovery_code = new_token()
    changed = db.execute(
        update(User).where(User.id == user.id, User.recovery_hash == recovery_hash)
        .values(password_hash=next_hash, recovery_hash=hash_token(recovery_code), updated_at=now)
    ).rowcount
    if not changed:
        db.rollback()
        raise ApiError(400, INVALID_RECOVERY)
    db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    db.commit()
    response.delete_cookie(settings.cookie_name, path='/', secure=settings.production, httponly=True, samesite='strict')
    return {'recoveryCode': recovery_code, 'message': 'Contraseña actualizada. Inicia sesión con la nueva contraseña.'}


@router.get('/session')
def current_session(session: CurrentUser, settings: Config):
    return {'user': public_user(session.user_id, session.name, session.email), 'csrfToken': csrf_for(session.token, settings.secret_key)}


@router.post('/logout', status_code=204)
def logout(session: CurrentUser, response: Response, db: Db, settings: Config):
    db.execute(delete(AuthSession).where(AuthSession.token_hash == session.token_hash))
    db.commit()
    response.delete_cookie(settings.cookie_name, path='/', secure=settings.production, httponly=True, samesite='strict')


@router.post('/logout-all', status_code=204)
def logout_all(session: CurrentUser, response: Response, db: Db, settings: Config):
    db.execute(delete(AuthSession).where(AuthSession.user_id == session.user_id))
    db.commit()
    response.delete_cookie(settings.cookie_name, path='/', secure=settings.production, httponly=True, samesite='strict')


@router.get('/sessions')
def list_sessions(session: CurrentUser, db: Db, now: Now):
    rows = db.scalars(
        select(AuthSession)
        .where(AuthSession.user_id == session.user_id, AuthSession.expires_at > now, AuthSession.last_seen > now - IDLE_AGE)
        .order_by(AuthSession.created_at.desc()).limit(MAX_SESSIONS)
    ).all()
    return {'sessions': [{
        'created_at': s.created_at.isoformat(), 'last_seen': s.last_seen.isoformat(), 'expires_at': s.expires_at.isoformat(),
        'device': s.device, 'current': s.token_hash == session.token_hash,
    } for s in rows]}


@router.post('/password')
def change_password(body: PasswordChangeIn, session: CurrentUser, request: Request, response: Response, db: Db, settings: Config, now: Now):
    throttle(request, now, 'password', 10, session.email)
    user = db.get(User, session.user_id)
    with request.app.state.password_worker.slot():
        if not verify_password(user.password_hash, body.currentPassword):
            raise ApiError(400, 'Contraseña actual incorrecta.')
        password_hash = hash_password(body.password)
    recovery_code = new_token()
    changed = db.execute(
        update(User).where(User.id == user.id, User.password_hash == user.password_hash)
        .values(password_hash=password_hash, recovery_hash=hash_token(recovery_code), updated_at=now)
        .execution_options(synchronize_session=False)
    ).rowcount
    if not changed:
        db.rollback()
        raise ApiError(409, 'La contraseña ha cambiado. Vuelve a iniciar sesión.')
    db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    db.refresh(user)
    auth = issue_session(db, request, response, settings, now, user)
    db.commit()
    return {**auth, 'recoveryCode': recovery_code}
