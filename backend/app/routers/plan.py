from fastapi import APIRouter
from sqlalchemy import select, update

from ..errors import ApiError
from ..models import Plan
from ..schemas import SavePlanIn
from ..sessions import CurrentUser, Db, Now

router = APIRouter(prefix='/api/plan', tags=['plan'])


@router.get('')
def read_plan(session: CurrentUser, db: Db):
    plan = db.get(Plan, session.user_id)
    return {'data': plan.document, 'revision': plan.revision, 'updatedAt': plan.updated_at.isoformat()}


@router.get('/revision')
def read_revision(session: CurrentUser, db: Db):
    # Consulta ligera para detectar cambios sin transferir el plan completo.
    return {'revision': db.scalar(select(Plan.revision).where(Plan.user_id == session.user_id))}


@router.put('')
def save_plan(body: SavePlanIn, session: CurrentUser, db: Db, now: Now):
    # Control optimista: solo se guarda si nadie ha modificado la revisión que tenía el cliente.
    result = db.execute(
        update(Plan)
        .where(Plan.user_id == session.user_id, Plan.revision == body.revision)
        .values(document=body.data.model_dump(mode='json', exclude_unset=True), revision=Plan.revision + 1, updated_at=now)
        .returning(Plan.revision, Plan.updated_at)
    ).one_or_none()
    if result is None:
        db.rollback()
        raise ApiError(409, 'El plan cambió en otro dispositivo. Descarga tus cambios o carga la versión guardada antes de continuar.')
    db.commit()
    return {'revision': result.revision, 'updatedAt': result.updated_at.isoformat()}
