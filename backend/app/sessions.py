import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Annotated, Iterator

from fastapi import Depends, Request, Response
from sqlalchemy import delete, select, text, update
from sqlalchemy.orm import Session

from .config import Settings
from .errors import ApiError
from .models import AuthSession, RateLimit, User
from .security import csrf_for, hash_token, new_token, safe_equal

SESSION_AGE = timedelta(days=7)
IDLE_AGE = timedelta(days=1)
TOUCH_INTERVAL = timedelta(minutes=5)
MAX_SESSIONS = 5
TOKEN_PATTERN = re.compile(r'^[\w-]{43}$')


def get_db(request: Request) -> Iterator[Session]:
    with request.app.state.sessionmaker() as db:
        yield db


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_now(request: Request) -> datetime:
    return request.app.state.clock()


Db = Annotated[Session, Depends(get_db)]
Config = Annotated[Settings, Depends(get_settings)]
Now = Annotated[datetime, Depends(get_now)]


@dataclass(frozen=True)
class CurrentSession:
    token: str
    token_hash: str
    user_id: uuid.UUID
    email: str
    name: str


def public_user(user_id: uuid.UUID, name: str, email: str) -> dict:
    return {'id': str(user_id), 'name': name, 'email': email}


def issue_session(db: Session, request: Request, response: Response, settings: Settings, now: datetime, user: User) -> dict:
    """Crea una sesión nueva, sustituye la de esta cookie y conserva solo las cinco más recientes."""
    token = new_token()
    previous = request.cookies.get(settings.cookie_name)
    if isinstance(previous, str) and TOKEN_PATTERN.match(previous):
        db.execute(delete(AuthSession).where(AuthSession.token_hash == hash_token(previous)))
    db.add(AuthSession(
        token_hash=hash_token(token), user_id=user.id, created_at=now, last_seen=now,
        expires_at=now + SESSION_AGE, device=(request.headers.get('user-agent') or 'Dispositivo desconocido')[:180],
    ))
    db.flush()
    db.execute(text("""
        DELETE FROM sessions WHERE user_id = :user_id AND token_hash NOT IN (
          SELECT token_hash FROM sessions WHERE user_id = :user_id ORDER BY created_at DESC LIMIT :keep)
    """), {'user_id': user.id, 'keep': MAX_SESSIONS})
    response.set_cookie(
        settings.cookie_name, token, max_age=int(SESSION_AGE.total_seconds()), path='/',
        secure=settings.production, httponly=True, samesite='strict',
    )
    return {'user': public_user(user.id, user.name, user.email), 'csrfToken': csrf_for(token, settings.secret_key)}


def require_session(request: Request, db: Db, settings: Config, now: Now) -> CurrentSession:
    token = request.cookies.get(settings.cookie_name)
    if not isinstance(token, str) or not TOKEN_PATTERN.match(token):
        raise ApiError(401, 'Inicia sesión para continuar.')
    token_hash = hash_token(token)
    row = db.execute(
        select(AuthSession.user_id, AuthSession.last_seen, User.email, User.name)
        .join(User, User.id == AuthSession.user_id)
        .where(AuthSession.token_hash == token_hash, AuthSession.expires_at > now, AuthSession.last_seen > now - IDLE_AGE)
    ).one_or_none()
    if row is None:
        raise ApiError(401, 'Tu sesión ha caducado. Vuelve a entrar.', clear_cookie=True)
    expected_user = request.headers.get('x-clara-user')
    if expected_user and expected_user != str(row.user_id):
        raise ApiError(401, 'La cuenta cambió en otra pestaña. Vuelve a identificarte.')
    if request.method not in ('GET', 'HEAD') and not safe_equal(request.headers.get('x-csrf-token'), csrf_for(token, settings.secret_key)):
        raise ApiError(403, 'La sesión de esta página necesita actualizarse.')
    # La actividad se registra como mucho cada cinco minutos para evitar escrituras constantes.
    if row.last_seen < now - TOUCH_INTERVAL:
        db.execute(update(AuthSession).where(AuthSession.token_hash == token_hash, AuthSession.last_seen < now - TOUCH_INTERVAL).values(last_seen=now))
        db.commit()
    return CurrentSession(token=token, token_hash=token_hash, user_id=row.user_id, email=row.email, name=row.name)


CurrentUser = Annotated[CurrentSession, Depends(require_session)]


def cleanup_expired(db: Session, now: datetime) -> None:
    db.execute(delete(AuthSession).where((AuthSession.expires_at <= now) | (AuthSession.last_seen <= now - IDLE_AGE)))
    db.execute(delete(RateLimit).where(RateLimit.expires_at <= now))
    db.commit()
