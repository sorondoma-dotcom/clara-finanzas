"""Plan normalizado en tablas tipadas e ingreso variable por mes

Sustituye el documento JSONB de `plans` por columnas con restricciones y las tablas
`expenses`, `monthly_incomes` y `paid_charges`. Migra los planes existentes.

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-24
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None

MONTH = "~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])$'"
RANGE = 'BETWEEN 0 AND 100000000'
money = lambda: sa.Numeric(11, 2)  # noqa: E731
user_fk = lambda: sa.ForeignKey('plans.user_id', ondelete='CASCADE')  # noqa: E731


def upgrade() -> None:
    op.add_column('plans', sa.Column('start_month', sa.String(7)))
    op.add_column('plans', sa.Column('income_mode', sa.String(8), nullable=False, server_default='fixed'))
    op.add_column('plans', sa.Column('income', money(), nullable=False, server_default='0'))
    op.add_column('plans', sa.Column('variable_budget', money(), nullable=False, server_default='0'))
    op.add_column('plans', sa.Column('cushion', money(), nullable=False, server_default='0'))
    op.add_column('plans', sa.Column('demo', sa.Boolean(), nullable=False, server_default='false'))

    op.create_table(
        'expenses',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), user_fk(), primary_key=True),
        sa.Column('id', sa.String(80), primary_key=True),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('amount', money(), nullable=False),
        sa.Column('category', sa.String(20), nullable=False),
        sa.Column('frequency', sa.String(10), nullable=False),
        sa.Column('day', sa.SmallInteger(), nullable=False),
        sa.Column('start_month', sa.String(7), nullable=False),
        sa.Column('end_month', sa.String(7)),
        sa.Column('fund', money(), nullable=False, server_default='0'),
        sa.CheckConstraint(f'amount > 0 AND amount {RANGE}', name='expenses_amount_range'),
        sa.CheckConstraint(f'fund {RANGE}', name='expenses_fund_range'),
        sa.CheckConstraint('day BETWEEN 1 AND 31', name='expenses_day_range'),
        sa.CheckConstraint("category IN ('Vivienda', 'Suscripciones', 'Suministros', 'Transporte', 'Salud', 'Seguros', 'Otros')", name='expenses_category'),
        sa.CheckConstraint("frequency IN ('monthly', 'quarterly', 'yearly', 'once')", name='expenses_frequency'),
        sa.CheckConstraint(f'start_month {MONTH}', name='expenses_start_month_format'),
        sa.CheckConstraint(f'end_month IS NULL OR (end_month {MONTH} AND end_month >= start_month)', name='expenses_end_month'),
        sa.CheckConstraint('length(btrim(name)) BETWEEN 1 AND 100', name='expenses_name_length'),
    )
    op.create_table(
        'monthly_incomes',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), user_fk(), primary_key=True),
        sa.Column('month', sa.String(7), primary_key=True),
        sa.Column('amount', money(), nullable=False),
        sa.CheckConstraint(f'month {MONTH}', name='monthly_incomes_month_format'),
        sa.CheckConstraint(f'amount {RANGE}', name='monthly_incomes_amount_range'),
    )
    op.create_table(
        'paid_charges',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), user_fk(), primary_key=True),
        sa.Column('month', sa.String(7), primary_key=True),
        sa.Column('expense_id', sa.String(80), primary_key=True),
        sa.Column('paid', sa.Boolean(), nullable=False),
        sa.CheckConstraint(f'month {MONTH}', name='paid_charges_month_format'),
    )

    # Migración de los documentos JSON existentes.
    op.execute("""
        UPDATE plans SET
          start_month = document->>'startMonth',
          income = (document->>'income')::numeric,
          variable_budget = (document->>'variable')::numeric,
          cushion = (document->>'cushion')::numeric,
          demo = coalesce((document->>'demo')::boolean, false)
    """)
    op.execute("""
        INSERT INTO expenses (user_id, id, position, name, amount, category, frequency, day, start_month, end_month, fund)
        SELECT p.user_id, e.value->>'id', e.ordinality - 1, e.value->>'name', (e.value->>'amount')::numeric,
               e.value->>'category', e.value->>'frequency', (e.value->>'day')::smallint, e.value->>'start',
               nullif(e.value->>'end', ''), coalesce((e.value->>'fund')::numeric, 0)
        FROM plans p, jsonb_array_elements(p.document->'expenses') WITH ORDINALITY AS e(value, ordinality)
    """)
    op.execute("""
        INSERT INTO paid_charges (user_id, month, expense_id, paid)
        SELECT p.user_id, split_part(k.key, ':', 1), split_part(k.key, ':', 2), k.value::boolean
        FROM plans p, jsonb_each_text(p.document->'paid') AS k
    """)
    op.alter_column('plans', 'start_month', nullable=False)
    op.drop_constraint('plans_document_object', 'plans', type_='check')
    op.drop_column('plans', 'document')
    op.create_check_constraint('plans_start_month_format', 'plans', f'start_month {MONTH}')
    op.create_check_constraint('plans_income_mode', 'plans', "income_mode IN ('fixed', 'variable')")
    op.create_check_constraint('plans_income_range', 'plans', f'income {RANGE}')
    op.create_check_constraint('plans_variable_budget_range', 'plans', f'variable_budget {RANGE}')
    op.create_check_constraint('plans_cushion_range', 'plans', f'cushion {RANGE}')


def downgrade() -> None:
    # Reconstruye el documento JSON (se pierden los ingresos por mes y el modo variable).
    op.add_column('plans', sa.Column('document', postgresql.JSONB()))
    op.execute("""
        UPDATE plans p SET document = jsonb_build_object(
          'version', 1, 'demo', p.demo, 'startMonth', p.start_month,
          'income', p.income, 'variable', p.variable_budget, 'cushion', p.cushion,
          'expenses', coalesce((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
              'id', e.id, 'name', e.name, 'amount', e.amount, 'category', e.category, 'frequency', e.frequency,
              'day', e.day, 'start', e.start_month, 'end', e.end_month, 'fund', e.fund)) ORDER BY e.position)
            FROM expenses e WHERE e.user_id = p.user_id), '[]'::jsonb),
          'paid', coalesce((SELECT jsonb_object_agg(c.month || ':' || c.expense_id, c.paid)
            FROM paid_charges c WHERE c.user_id = p.user_id), '{}'::jsonb))
    """)
    op.alter_column('plans', 'document', nullable=False)
    op.create_check_constraint('plans_document_object', 'plans', "jsonb_typeof(document) = 'object'")
    op.drop_table('paid_charges')
    op.drop_table('monthly_incomes')
    op.drop_table('expenses')
    for name in ('plans_start_month_format', 'plans_income_mode', 'plans_income_range', 'plans_variable_budget_range', 'plans_cushion_range'):
        op.drop_constraint(name, 'plans', type_='check')
    for column in ('start_month', 'income_mode', 'income', 'variable_budget', 'cushion', 'demo'):
        op.drop_column('plans', column)
