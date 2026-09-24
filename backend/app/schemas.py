import math
import re
from typing import Annotated, Any, Literal

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, EmailStr, Field, StrictBool, StrictInt, StringConstraints, model_validator

# Deben coincidir con `src/lib/finance.js`.
CATEGORIES = ('Vivienda', 'Suscripciones', 'Suministros', 'Transporte', 'Salud', 'Seguros', 'Otros')
MONTH_PATTERN = r'^(20\d{2}|2100)-(0[1-9]|1[0-2])$'
ID_PATTERN = r'^[a-zA-Z0-9_-]{1,80}$'
MONTH = re.compile(MONTH_PATTERN)
PAID_KEY = re.compile(r'^(20\d{2}|2100)-(0[1-9]|1[0-2]):[a-zA-Z0-9_-]{1,80}$')


def _money(value: Any) -> float | int:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError('importe no válido')
    if not math.isfinite(value) or not 0 <= value <= 100_000_000:
        raise ValueError('importe fuera de rango')
    if abs(value * 100 - round(value * 100)) >= 1e-5:
        raise ValueError('como máximo dos decimales')
    return value


def _positive_money(value: Any) -> float | int:
    value = _money(value)
    if value <= 0:
        raise ValueError('el importe debe ser positivo')
    return value


def _not_repeated(value: str) -> str:
    if len(set(value)) == 1:
        raise ValueError('Usa una contraseña menos predecible.')
    return value


def _normalize_email(value: Any) -> Any:
    return value.strip().lower() if isinstance(value, str) else value


def _max_email(value: str) -> str:
    if len(value) > 254:
        raise ValueError('correo demasiado largo')
    return value


Money = Annotated[float | int, BeforeValidator(_money)]
PositiveMoney = Annotated[float | int, BeforeValidator(_positive_money)]
Month = Annotated[str, StringConstraints(pattern=MONTH_PATTERN)]
Identifier = Annotated[str, StringConstraints(pattern=ID_PATTERN)]
Email = Annotated[EmailStr, BeforeValidator(_normalize_email), AfterValidator(_max_email)]
NewPassword = Annotated[str, StringConstraints(min_length=15, max_length=128), AfterValidator(_not_repeated)]


class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)


class Expense(Strict):
    id: Identifier
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    amount: PositiveMoney
    category: Literal[CATEGORIES]
    frequency: Literal['monthly', 'quarterly', 'yearly', 'once']
    day: Annotated[StrictInt, Field(ge=1, le=31)]
    start: Month
    end: Month | Literal[''] | None = None
    fund: Money = 0

    @model_validator(mode='after')
    def end_after_start(self) -> 'Expense':
        if self.end and self.end < self.start:
            raise ValueError('el último mes es anterior al inicio')
        return self


class PlanDocument(Strict):
    version: Literal[1]
    demo: StrictBool | None = None
    startMonth: Month
    # 'fixed': mismo ingreso cada mes. 'variable': importe por mes en `incomes`; `income` es la estimación por defecto.
    incomeMode: Literal['fixed', 'variable'] = 'fixed'
    income: Money
    incomes: Annotated[dict[str, Money], Field(max_length=600)] = {}
    variable: Money
    cushion: Money
    expenses: Annotated[list[Expense], Field(max_length=1000)]
    paid: dict[str, StrictBool]

    @model_validator(mode='after')
    def consistent(self) -> 'PlanDocument':
        if len({e.id for e in self.expenses}) != len(self.expenses):
            raise ValueError('identificadores de gasto repetidos')
        if len(self.paid) > 24_000 or not all(PAID_KEY.match(key) for key in self.paid):
            raise ValueError('estados de pago no válidos')
        if not all(MONTH.match(key) for key in self.incomes):
            raise ValueError('meses de ingreso no válidos')
        return self


class SavePlanIn(Strict):
    revision: Annotated[StrictInt, Field(ge=0, le=2**53 - 2)]
    data: PlanDocument


class LoginIn(Strict):
    email: Email
    password: Annotated[str, StringConstraints(min_length=1, max_length=128)]


class RegisterIn(Strict):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
    email: Email
    password: NewPassword


class RecoverIn(Strict):
    email: Email
    recoveryCode: Annotated[str, StringConstraints(strip_whitespace=True, pattern=r'^[A-Za-z0-9_-]{43}$')]
    password: NewPassword


class PasswordChangeIn(Strict):
    currentPassword: Annotated[str, StringConstraints(min_length=1, max_length=128)]
    password: NewPassword
