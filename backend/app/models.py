"""Tables of the admin service: admins, their sign-in state, and the audit log."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, true
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, new_id, utcnow


class SessionStage:
    """How far a sign-in has got. Only FULL sessions reach the admin API."""

    #: Password checked; a TOTP (or recovery) code is next.
    TOTP = "totp"
    #: Password checked (or set through a setup link); the admin must enrol
    #: an authenticator before anything else.
    ENROLL = "enroll"
    #: Signed in.
    FULL = "full"
    ALL = (TOTP, ENROLL, FULL)


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    #: argon2id; None until the admin sets one through a setup link.
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    #: The TOTP secret, encrypted (app.security.seal); None until enrolled.
    totp_secret: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    #: A secret shown during enrolment, kept until the admin confirms a code.
    totp_pending_secret: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    #: The last TOTP time step accepted: each code works once.
    totp_last_step: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    totp_enrolled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    #: Failed sign-in steps against this account from any address (app.auth backoff).
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_failed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    #: Until then, the password step never says whether a password is right
    #: (it always moves on to the code step), so guessing it is pointless.
    backoff_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class LoginThrottle(Base):
    """Failed sign-in steps against one account from one address; enough of
    them lock that pair (only that address, only that account) for a while."""

    __tablename__ = "login_throttles"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    admin_id: Mapped[str] = mapped_column(ForeignKey("admins.id", ondelete="CASCADE"))
    ip: Mapped[str] = mapped_column(String(64))
    failures: Mapped[int] = mapped_column(Integer, default=0)
    last_failed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (UniqueConstraint("admin_id", "ip", name="uq_login_throttles_admin_ip"),)


class SetupToken(Base):
    """A one-time link to set a password and enrol TOTP (from the CLI)."""

    __tablename__ = "setup_tokens"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    admin_id: Mapped[str] = mapped_column(ForeignKey("admins.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AdminSession(Base):
    """A server-side session; the browser holds only its random token (in an
    httpOnly cookie set by the web app), stored here as a keyed hash."""

    __tablename__ = "admin_sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    admin_id: Mapped[str] = mapped_column(ForeignKey("admins.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    stage: Mapped[str] = mapped_column(String(16))
    #: False for a stand-in session opened during backoff for a wrong
    #: password: it looks the same, and no code ever completes it.
    password_ok: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    #: The absolute end (12 hours after sign-in; minutes for a half-finished one).
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    #: The last fresh TOTP given for a sensitive action.
    reauth_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)


class RecoveryCode(Base):
    __tablename__ = "recovery_codes"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    admin_id: Mapped[str] = mapped_column(ForeignKey("admins.id", ondelete="CASCADE"), index=True)
    code_hash: Mapped[str] = mapped_column(String(64))
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuthFailure(Base):
    """A failed sign-in step, by address (the per-address rate limit)."""

    __tablename__ = "auth_failures"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    ip: Mapped[str] = mapped_column(String(64))
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (Index("ix_auth_failures_ip_at", "ip", "at"),)


class AuditResult:
    SUCCESS = "success"
    FAILURE = "failure"
    ALL = (SUCCESS, FAILURE)


class AuditEvent(Base):
    """Append-only: who did what, when, from where, to what, and how it went."""

    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    admin_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("admins.id", ondelete="SET NULL"), nullable=True, index=True)
    #: The email as given (kept for failed sign-ins and after an admin is gone).
    admin_email: Mapped[Optional[str]] = mapped_column(String(254), nullable=True)
    action: Mapped[str] = mapped_column(String(64), index=True)
    result: Mapped[str] = mapped_column(String(16))
    ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    target_type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    target_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    target_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    #: JSON (a reason, the hospital service's error, ...).
    detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
