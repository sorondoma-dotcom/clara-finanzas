from fastapi import APIRouter
from sqlalchemy import select

from ..errors import ApiError
from ..models import Plan
from ..plan_store import load_plan, save_plan
from ..schemas import SavePlanIn
from ..sessions import CurrentUser, Db, Now

router = APIRouter(prefix='/api/plan', tags=['plan'])


@router.get('')
def read_plan(session: CurrentUser, db: Db):
    document, plan = load_plan(db, session.user_id)
    return {'data': document, 'revision': plan.revision, 'updatedAt': plan.updated_at.isoformat()}


@router.get('/revision')
def read_revision(session: CurrentUser, db: Db):
    # Consulta ligera para detectar cambios sin transferir el plan completo.
    return {'revision': db.scalar(select(Plan.revision).where(Plan.user_id == session.user_id))}


@router.put('')
def save(body: SavePlanIn, session: CurrentUser, db: Db, now: Now):
    # Control optimista: solo se guarda si nadie ha modificado la revisión que tenía el cliente.
    result = save_plan(db, session.user_id, body.revision, body.data, now)
    if result is None:
        db.rollback()
        raise ApiError(409, 'El plan cambió en otro dispositivo. Descarga tus cambios o carga la versión guardada antes de continuar.')
    db.commit()
    return {'revision': result.revision, 'updatedAt': result.updated_at.isoformat()}
