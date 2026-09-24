"""Traducción entre el plan que usa el frontend (un objeto JSON) y las tablas normalizadas."""
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import delete, insert, select, update
from sqlalchemy.orm import Session

from .models import Expense, MonthlyIncome, PaidCharge, Plan
from .schemas import PlanDocument


def _number(value: Decimal) -> int | float:
    return int(value) if value == value.to_integral_value() else float(value)


def _money(value: float | int) -> Decimal:
    return Decimal(str(value)).quantize(Decimal('0.01'))


def create_empty_plan(db: Session, user_id: uuid.UUID, now: datetime) -> None:
    db.add(Plan(user_id=user_id, start_month=now.strftime('%Y-%m'), income_mode='fixed', income=0, variable_budget=0, cushion=0, demo=False, revision=0, updated_at=now))


def load_plan(db: Session, user_id: uuid.UUID) -> tuple[dict, Plan]:
    plan = db.get(Plan, user_id)
    expenses = db.scalars(select(Expense).where(Expense.user_id == user_id).order_by(Expense.position)).all()
    incomes = db.execute(select(MonthlyIncome.month, MonthlyIncome.amount).where(MonthlyIncome.user_id == user_id)).all()
    paid = db.execute(select(PaidCharge.month, PaidCharge.expense_id, PaidCharge.paid).where(PaidCharge.user_id == user_id)).all()
    document = {
        'version': 1,
        'demo': plan.demo,
        'startMonth': plan.start_month,
        'incomeMode': plan.income_mode,
        'income': _number(plan.income),
        'incomes': {month: _number(amount) for month, amount in incomes},
        'variable': _number(plan.variable_budget),
        'cushion': _number(plan.cushion),
        'expenses': [{
            'id': e.id, 'name': e.name, 'amount': _number(e.amount), 'category': e.category, 'frequency': e.frequency,
            'day': e.day, 'start': e.start_month, **({'end': e.end_month} if e.end_month else {}), 'fund': _number(e.fund),
        } for e in expenses],
        'paid': {f'{month}:{expense_id}': value for month, expense_id, value in paid},
    }
    return document, plan


def save_plan(db: Session, user_id: uuid.UUID, revision: int, data: PlanDocument, now: datetime):
    """Sustituye el plan completo si la revisión coincide. Devuelve la nueva fila (revision, updated_at) o None."""
    result = db.execute(
        update(Plan)
        .where(Plan.user_id == user_id, Plan.revision == revision)
        .values(
            start_month=data.startMonth, income_mode=data.incomeMode, income=_money(data.income),
            variable_budget=_money(data.variable), cushion=_money(data.cushion), demo=bool(data.demo),
            revision=Plan.revision + 1, updated_at=now,
        )
        .returning(Plan.revision, Plan.updated_at)
    ).one_or_none()
    if result is None:
        return None
    for table in (Expense, MonthlyIncome, PaidCharge):
        db.execute(delete(table).where(table.user_id == user_id))
    if data.expenses:
        db.execute(insert(Expense), [{
            'user_id': user_id, 'id': e.id, 'position': index, 'name': e.name, 'amount': _money(e.amount),
            'category': e.category, 'frequency': e.frequency, 'day': e.day, 'start_month': e.start,
            'end_month': e.end or None, 'fund': _money(e.fund),
        } for index, e in enumerate(data.expenses)])
    if data.incomes:
        db.execute(insert(MonthlyIncome), [{'user_id': user_id, 'month': month, 'amount': _money(amount)} for month, amount in data.incomes.items()])
    if data.paid:
        db.execute(insert(PaidCharge), [
            {'user_id': user_id, 'month': key[:7], 'expense_id': key[8:], 'paid': value} for key, value in data.paid.items()
        ])
    return result
