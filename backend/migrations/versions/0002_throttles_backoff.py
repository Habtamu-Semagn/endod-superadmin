"""per (account, address) throttles, per-account backoff, stand-in sessions

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-24 16:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('login_throttles',
    sa.Column('id', sa.String(length=32), nullable=False),
    sa.Column('admin_id', sa.String(length=32), nullable=False),
    sa.Column('ip', sa.String(length=64), nullable=False),
    sa.Column('failures', sa.Integer(), nullable=False),
    sa.Column('last_failed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['admin_id'], ['admins.id'], name=op.f('fk_login_throttles_admin_id_admins'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_login_throttles')),
    sa.UniqueConstraint('admin_id', 'ip', name='uq_login_throttles_admin_ip')
    )
    with op.batch_alter_table('admins', schema=None) as batch_op:
        # The old account-wide lock is gone; nothing in it is worth keeping.
        batch_op.drop_column('locked_until')
        batch_op.add_column(sa.Column('backoff_until', sa.DateTime(timezone=True), nullable=True))
    with op.batch_alter_table('admin_sessions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('password_ok', sa.Boolean(), server_default=sa.true(), nullable=False))


def downgrade() -> None:
    with op.batch_alter_table('admin_sessions', schema=None) as batch_op:
        batch_op.drop_column('password_ok')
    with op.batch_alter_table('admins', schema=None) as batch_op:
        batch_op.drop_column('backoff_until')
        batch_op.add_column(sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True))
    op.drop_table('login_throttles')
