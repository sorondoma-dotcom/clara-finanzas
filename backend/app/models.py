import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, SmallInteger, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Importes en euros con dos decimales exactos (sin errores de coma flotante).
Money = Numeric(11, 2)
MONTH_CHECK = "~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])$'"
MONEY_RANGE = 'BETWEEN 0 AND 100000000'


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = 'users'
    __table_args__ = (CheckConstraint('email = lower(email)', name='users_email_lowercase'),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    recovery_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Plan(Base):
    """Configuración financiera de cada usuario. La revisión permite detectar ediciones concurrentes."""

    __tablename__ = 'plans'
    __table_args__ = (
        CheckConstraint('revision >= 0', name='plans_revision_positive'),
        CheckConstraint(f'start_month {MONTH_CHECK}', name='plans_start_month_format'),
        CheckConstraint("income_mode IN ('fixed', 'variable')", name='plans_income_mode'),
        CheckConstraint(f'income {MONEY_RANGE}', name='plans_income_range'),
        CheckConstraint(f'variable_budget {MONEY_RANGE}', name='plans_variable_budget_range'),
        CheckConstraint(f'cushion {MONEY_RANGE}', name='plans_cushion_range'),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    start_month: Mapped[str] = mapped_column(String(7), nullable=False)
    income_mode: Mapped[str] = mapped_column(String(8), nullable=False, server_default='fixed')
    # En modo variable es el ingreso estimado para los meses sin importe propio.
    income: Mapped[Decimal] = mapped_column(Money, nullable=False, server_default='0')
    variable_budget: Mapped[Decimal] = mapped_column(Money, nullable=False, server_default='0')
    cushion: Mapped[Decimal] = mapped_column(Money, nullable=False, server_default='0')
    demo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default='false')
    revision: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default=text('0'))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Expense(Base):
    __tablename__ = 'expenses'
    __table_args__ = (
        CheckConstraint(f'amount > 0 AND amount {MONEY_RANGE}', name='expenses_amount_range'),
        CheckConstraint(f'fund {MONEY_RANGE}', name='expenses_fund_range'),
        CheckConstraint('day BETWEEN 1 AND 31', name='expenses_day_range'),
        CheckConstraint("category IN ('Vivienda', 'Suscripciones', 'Suministros', 'Transporte', 'Salud', 'Seguros', 'Otros')", name='expenses_category'),
        CheckConstraint("frequency IN ('monthly', 'quarterly', 'yearly', 'once')", name='expenses_frequency'),
        CheckConstraint(f'start_month {MONTH_CHECK}', name='expenses_start_month_format'),
        CheckConstraint(f"end_month IS NULL OR (end_month {MONTH_CHECK} AND end_month >= start_month)", name='expenses_end_month'),
        CheckConstraint('length(btrim(name)) BETWEEN 1 AND 100', name='expenses_name_length'),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('plans.user_id', ondelete='CASCADE'), primary_key=True)
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Money, nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    frequency: Mapped[str] = mapped_column(String(10), nullable=False)
    day: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    start_month: Mapped[str] = mapped_column(String(7), nullable=False)
    end_month: Mapped[str | None] = mapped_column(String(7))
    fund: Mapped[Decimal] = mapped_column(Money, nullable=False, server_default='0')


class MonthlyIncome(Base):
    """Ingreso concreto de un mes cuando el ingreso es variable (paro, trabajo por horas…)."""

    __tablename__ = 'monthly_incomes'
    __table_args__ = (
        CheckConstraint(f'month {MONTH_CHECK}', name='monthly_incomes_month_format'),
        CheckConstraint(f'amount {MONEY_RANGE}', name='monthly_incomes_amount_range'),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('plans.user_id', ondelete='CASCADE'), primary_key=True)
    month: Mapped[str] = mapped_column(String(7), primary_key=True)
    amount: Mapped[Decimal] = mapped_column(Money, nullable=False)


class PaidCharge(Base):
    """Estado pagado/pendiente de un cobro concreto en el calendario."""

    __tablename__ = 'paid_charges'
    __table_args__ = (
        CheckConstraint(f'month {MONTH_CHECK}', name='paid_charges_month_format'),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('plans.user_id', ondelete='CASCADE'), primary_key=True)
    month: Mapped[str] = mapped_column(String(7), primary_key=True)
    expense_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    paid: Mapped[bool] = mapped_column(Boolean, nullable=False)


class AuthSession(Base):
    """Sesión de navegador. Solo se guarda el SHA-256 del token de la cookie."""

    __tablename__ = 'sessions'
    __table_args__ = (
        Index('sessions_user_created', 'user_id', text('created_at DESC')),
        Index('sessions_expires_at', 'expires_at'),
        Index('sessions_last_seen', 'last_seen'),
    )

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    device: Mapped[str] = mapped_column(String(180), nullable=False)


class RateLimit(Base):
    __tablename__ = 'rate_limits'
    __table_args__ = (Index('rate_limits_expires_at', 'expires_at'),)

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    count: Mapped[int] = mapped_column(Integer, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
