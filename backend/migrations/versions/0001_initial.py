"""Usuarios, planes, sesiones y límites de peticiones

Revision ID: 0001
Revises:
Create Date: 2026-09-24
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None

timestamp = lambda: sa.DateTime(timezone=True)  # noqa: E731


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(254), nullable=False, unique=True),
        sa.Column('name', sa.String(80), nullable=False),
        sa.Column('password_hash', sa.Text(), nullable=False),
        sa.Column('recovery_hash', sa.String(64), nullable=False),
        sa.Column('created_at', timestamp(), nullable=False),
        sa.Column('updated_at', timestamp(), nullable=False),
        sa.CheckConstraint('email = lower(email)', name='users_email_lowercase'),
    )
    op.create_table(
        'plans',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('document', postgresql.JSONB(), nullable=False),
        sa.Column('revision', sa.BigInteger(), nullable=False, server_default=sa.text('0')),
        sa.Column('updated_at', timestamp(), nullable=False),
        sa.CheckConstraint('revision >= 0', name='plans_revision_positive'),
        sa.CheckConstraint("jsonb_typeof(document) = 'object'", name='plans_document_object'),
    )
    op.create_table(
        'sessions',
        sa.Column('token_hash', sa.String(64), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', timestamp(), nullable=False),
        sa.Column('last_seen', timestamp(), nullable=False),
        sa.Column('expires_at', timestamp(), nullable=False),
        sa.Column('device', sa.String(180), nullable=False),
    )
    op.create_index('sessions_user_created', 'sessions', ['user_id', sa.text('created_at DESC')])
    op.create_index('sessions_expires_at', 'sessions', ['expires_at'])
    op.create_index('sessions_last_seen', 'sessions', ['last_seen'])
    op.create_table(
        'rate_limits',
        sa.Column('key', sa.String(64), primary_key=True),
        sa.Column('count', sa.Integer(), nullable=False),
        sa.Column('expires_at', timestamp(), nullable=False),
    )
    op.create_index('rate_limits_expires_at', 'rate_limits', ['expires_at'])


def downgrade() -> None:
    op.drop_table('rate_limits')
    op.drop_table('sessions')
    op.drop_table('plans')
    op.drop_table('users')
