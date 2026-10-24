"""Admin sign-in: password, then TOTP (or enrolment), server-side sessions,
lockout, rate limits, re-authentication, and setup links.

A sign-in goes through stages (app.models.SessionStage). The password opens a
short *pending* session (stage ``totp``, or ``enroll`` for an admin without an
authenticator); the second step revokes it and opens a new *full* session, so
the token changes at every step (no fixation). Only full sessions reach the
admin API. Every failed step counts against the account and the address, and
is committed before the error is raised.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Depends, Header, Request
from sqlalchemy import delete, func, select, update

from app import audit, security, totp
from app.config import Settings, get_settings
from app.db import ensure_aware, iso, session_scope, utcnow
from app.errors import ApiError
from app.models import Admin, AdminSession, AuditResult, AuthFailure, RecoveryCode, SessionStage, SetupToken

INVALID_LOGIN = "Incorrect email or password."
TOO_MANY = "Too many failed attempts from this address. Try again later."
INVALID_CODE = "That code is not valid. Check your authenticator app and try again."
LOCKED = "Too many failed attempts. Sign in again later."
SESSION_REQUIRED = "Authentication required."
SESSION_ENDED = "Your session has ended. Please sign in again."
INCOMPLETE = "Finish signing in first."
REAUTH_REQUIRED = "Confirm it is you: enter a code from your authenticator app."
INVALID_SETUP_LINK = "This setup link is invalid or has expired. Ask for a new one."

SUCCESS, FAILURE = AuditResult.SUCCESS, AuditResult.FAILURE


@dataclass(frozen=True)
class Principal:
    """The session behind a request."""

    admin_id: str
    email: str
    name: str
    session_id: str
    stage: str
    reauth_at: Optional[datetime]
    ip: str


@dataclass(frozen=True)
class Opened:
    token: str
    stage: str
    max_age: int


# --- helpers -----------------------------------------------------------------------------

def _normal_email(email: str) -> str:
    return email.strip().lower()


def _ip_blocked(session, ip: str, now: datetime, settings: Settings) -> bool:
    since = now - timedelta(minutes=settings.ADMIN_IP_WINDOW_MINUTES)
    count = session.scalar(select(func.count()).select_from(AuthFailure)
                           .where(AuthFailure.ip == ip, AuthFailure.at > since))
    return (count or 0) >= settings.ADMIN_IP_FAILURE_LIMIT


def _note_ip_failure(session, ip: str, now: datetime) -> None:
    session.add(AuthFailure(ip=ip, at=now))
    # Old rows are of no use; dropped as new ones come in.
    session.execute(delete(AuthFailure).where(AuthFailure.at < now - timedelta(days=1)))


def _account_locked(admin: Admin, now: datetime) -> bool:
    return admin.locked_until is not None and ensure_aware(admin.locked_until) > now


def _record_failure(session, admin: Admin, now: datetime, settings: Settings, ip: str) -> bool:
    """Count a failed step for ``admin`` (row already locked); True if this locked it.
    Failures older than the lockout window are forgotten."""
    window = timedelta(minutes=settings.ADMIN_LOCKOUT_MINUTES)
    if admin.last_failed_at is None or ensure_aware(admin.last_failed_at) < now - window:
        admin.failed_attempts = 0
    admin.failed_attempts += 1
    admin.last_failed_at = now
    if admin.failed_attempts >= settings.ADMIN_LOCKOUT_ATTEMPTS:
        admin.locked_until = now + window
        admin.failed_attempts = 0
        revoke_all(session, admin.id, now)
        audit.record(session, audit.LOCKED_OUT, SUCCESS, admin_id=admin.id, admin_email=admin.email, ip=ip,
                     detail={"minutes": settings.ADMIN_LOCKOUT_MINUTES})
        return True
    return False


def _clear_failures(admin: Admin) -> None:
    admin.failed_attempts = 0
    admin.last_failed_at = None
    admin.locked_until = None


def revoke_all(session, admin_id: str, now: datetime) -> None:
    session.execute(update(AdminSession)
                    .where(AdminSession.admin_id == admin_id, AdminSession.revoked_at.is_(None))
                    .values(revoked_at=now))


def _locked_admin(session, admin_id: str) -> Optional[Admin]:
    """The admin row, locked for this transaction so parallel attempts cannot
    lose failure counts or reuse a TOTP step (no-op on SQLite, which serialises writers)."""
    return session.scalar(select(Admin).where(Admin.id == admin_id).with_for_update())


def _open_session(session, admin: Admin, stage: str, now: datetime, settings: Settings,
                  ip: str, user_agent: Optional[str]) -> Opened:
    token = security.new_token()
    if stage == SessionStage.FULL:
        lifetime = timedelta(hours=settings.ADMIN_SESSION_MAX_HOURS)
    else:
        lifetime = timedelta(minutes=settings.ADMIN_PENDING_SESSION_MINUTES)
    session.add(AdminSession(admin_id=admin.id, token_hash=security.token_hash(token), stage=stage,
                             created_at=now, last_seen_at=now, expires_at=now + lifetime, ip=ip,
                             user_agent=(user_agent or "")[:200] or None))
    return Opened(token=token, stage=stage, max_age=int(lifetime.total_seconds()))


def _revoke(session, session_id: str, now: datetime) -> None:
    session.execute(update(AdminSession).where(AdminSession.id == session_id).values(revoked_at=now))


def opened_payload(opened: Opened, **extra: Any) -> Dict[str, Any]:
    """What the web app receives: it moves ``session_token`` into the
    httpOnly cookie and never passes it to the page."""
    return {"stage": opened.stage, "session_token": opened.token, "session_max_age": opened.max_age, **extra}


# --- password step -----------------------------------------------------------------------

def login(email: str, password: str, ip: str, user_agent: Optional[str]) -> Opened:
    """Check the password; open a pending session (TOTP or enrolment next).

    Unknown email, wrong password, disabled or locked account all answer the
    same, with the same argon2 work, so the answer never tells whether an
    account exists.
    """
    settings = get_settings()
    now = utcnow()
    email = _normal_email(email)
    failure: Optional[ApiError] = None
    with session_scope() as session:
        if _ip_blocked(session, ip, now, settings):
            security.verify_password(password, security.DUMMY_HASH)
            audit.record(session, audit.SIGN_IN, FAILURE, admin_email=email, ip=ip,
                         detail={"step": "password", "reason": "address_rate_limited"})
            failure = ApiError(429, TOO_MANY, "RATE_LIMITED")
        else:
            found = session.scalar(select(Admin.id).where(Admin.email == email))
            admin = _locked_admin(session, found) if found else None
            reason = None
            if admin is None:
                security.verify_password(password, security.DUMMY_HASH)
                reason = "unknown_email"
            else:
                correct = security.verify_password(password, admin.password_hash or security.DUMMY_HASH) \
                    and admin.password_hash is not None
                if _account_locked(admin, now):
                    reason = "account_locked"
                elif not correct:
                    reason = "wrong_password" if admin.password_hash else "no_password_set"
                    _record_failure(session, admin, now, settings, ip)
                elif not admin.active:
                    reason = "account_disabled"
            if reason is not None:
                _note_ip_failure(session, ip, now)
                audit.record(session, audit.SIGN_IN, FAILURE, admin_id=admin.id if admin else None,
                             admin_email=email, ip=ip, detail={"step": "password", "reason": reason})
                failure = ApiError(401, INVALID_LOGIN, "INVALID_LOGIN")
            else:
                if security.needs_rehash(admin.password_hash):
                    admin.password_hash = security.hash_password(password)
                stage = SessionStage.TOTP if admin.totp_secret else SessionStage.ENROLL
                opened = _open_session(session, admin, stage, now, settings, ip, user_agent)
                audit.record(session, audit.SIGN_IN_PASSWORD, SUCCESS, admin_id=admin.id, admin_email=admin.email,
                             ip=ip, detail={"next": stage})
                return opened
    raise failure


# --- sessions ----------------------------------------------------------------------------

def resolve(token: str, ip: str) -> Principal:
    """The session for ``token``, or ApiError(401). Ends sessions idle for
    longer than the idle timeout; refreshes the idle clock otherwise."""
    settings = get_settings()
    now = utcnow()
    with session_scope() as session:
        row = session.execute(
            select(AdminSession, Admin).join(Admin, Admin.id == AdminSession.admin_id)
            .where(AdminSession.token_hash == security.token_hash(token))
        ).first()
        if row is None:
            raise ApiError(401, SESSION_REQUIRED, "AUTH_REQUIRED")
        sess, admin = row
        idle = timedelta(minutes=settings.ADMIN_SESSION_IDLE_MINUTES)
        ended = (sess.revoked_at is not None or ensure_aware(sess.expires_at) <= now
                 or ensure_aware(sess.last_seen_at) + idle <= now or not admin.active)
        if ended:
            if sess.revoked_at is None:
                sess.revoked_at = now
                session.commit()
            raise ApiError(401, SESSION_ENDED, "SESSION_ENDED")
        sess.last_seen_at = now
        return Principal(admin_id=admin.id, email=admin.email, name=admin.name, session_id=sess.id,
                         stage=sess.stage, reauth_at=ensure_aware(sess.reauth_at), ip=ip)


def _bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    scheme, _, value = authorization.strip().partition(" ")
    return value.strip() if scheme.lower() == "bearer" and value.strip() else None


def any_session(request_ip: str, authorization: Optional[str]) -> Principal:
    token = _bearer(authorization)
    if not token:
        raise ApiError(401, SESSION_REQUIRED, "AUTH_REQUIRED")
    return resolve(token, request_ip)


def reauth_valid_until(principal: Principal) -> Optional[datetime]:
    if principal.reauth_at is None:
        return None
    return principal.reauth_at + timedelta(minutes=get_settings().ADMIN_REAUTH_MINUTES)


def require_fresh(principal: Principal) -> None:
    until = reauth_valid_until(principal)
    if until is None or until <= utcnow():
        raise ApiError(403, REAUTH_REQUIRED, "REAUTH_REQUIRED")


def logout(principal: Principal) -> None:
    now = utcnow()
    with session_scope() as session:
        _revoke(session, principal.session_id, now)
        audit.record(session, audit.SIGN_OUT, SUCCESS, admin_id=principal.admin_id, admin_email=principal.email,
                     ip=principal.ip)


# --- second step: TOTP or a recovery code ------------------------------------------------

def _check_code(session, admin: Admin, code: Optional[str], recovery_code: Optional[str],
                now: datetime) -> Optional[str]:
    """The method that worked ("totp" or "recovery_code"), or None. Marks the
    TOTP step or the recovery code as used."""
    if code:
        if not admin.totp_secret:
            return None
        step = totp.verify(security.unseal(admin.totp_secret), code, admin.totp_last_step)
        if step is not None:
            admin.totp_last_step = step
            return "totp"
        return None
    if recovery_code:
        wanted = security.recovery_code_hash(recovery_code)
        row = session.scalar(select(RecoveryCode).where(
            RecoveryCode.admin_id == admin.id, RecoveryCode.code_hash == wanted, RecoveryCode.used_at.is_(None)))
        if row is not None:
            row.used_at = now
            return "recovery_code"
    return None


def complete_sign_in(principal: Principal, code: Optional[str], recovery_code: Optional[str],
                     user_agent: Optional[str]) -> Tuple[Opened, Dict[str, Any]]:
    if principal.stage != SessionStage.TOTP:
        raise ApiError(409, "This sign-in does not need a code now.", "WRONG_STAGE")
    settings = get_settings()
    now = utcnow()
    ip = principal.ip
    failure: Optional[ApiError] = None
    with session_scope() as session:
        admin = _locked_admin(session, principal.admin_id)
        if _ip_blocked(session, ip, now, settings):
            audit.record(session, audit.SIGN_IN, FAILURE, admin_id=admin.id, admin_email=admin.email, ip=ip,
                         detail={"step": "totp", "reason": "address_rate_limited"})
            failure = ApiError(429, TOO_MANY, "RATE_LIMITED")
        elif _account_locked(admin, now):
            _revoke(session, principal.session_id, now)
            audit.record(session, audit.SIGN_IN, FAILURE, admin_id=admin.id, admin_email=admin.email, ip=ip,
                         detail={"step": "totp", "reason": "account_locked"})
            failure = ApiError(401, LOCKED, "LOCKED")
        else:
            method = _check_code(session, admin, code, recovery_code, now)
            if method is None:
                _note_ip_failure(session, ip, now)
                locked = _record_failure(session, admin, now, settings, ip)
                audit.record(session, audit.SIGN_IN, FAILURE, admin_id=admin.id, admin_email=admin.email, ip=ip,
                             detail={"step": "recovery_code" if recovery_code and not code else "totp",
                                     "reason": "invalid_code"})
                failure = ApiError(401, LOCKED, "LOCKED") if locked else ApiError(400, INVALID_CODE, "INVALID_CODE")
            else:
                _revoke(session, principal.session_id, now)
                _clear_failures(admin)
                admin.last_login_at = now
                opened = _open_session(session, admin, SessionStage.FULL, now, settings, ip, user_agent)
                remaining = session.scalar(select(func.count()).select_from(RecoveryCode).where(
                    RecoveryCode.admin_id == admin.id, RecoveryCode.used_at.is_(None))) or 0
                audit.record(session, audit.SIGN_IN, SUCCESS, admin_id=admin.id, admin_email=admin.email, ip=ip,
                             detail={"method": method, "recovery_codes_left": remaining})
                return opened, {"recovery_codes_left": remaining}
    raise failure


# --- enrolment ---------------------------------------------------------------------------

def enrolment_start(principal: Principal) -> Dict[str, Any]:
    """The secret to add to the authenticator (as a QR code's otpauth URI and as text).
    Asking again shows the same secret until it is confirmed."""
    if principal.stage != SessionStage.ENROLL:
        raise ApiError(409, "Two-factor sign-in is already set up.", "WRONG_STAGE")
    with session_scope() as session:
        admin = _locked_admin(session, principal.admin_id)
        if admin.totp_pending_secret:
            secret = security.unseal(admin.totp_pending_secret)
        else:
            secret = totp.new_secret()
            admin.totp_pending_secret = security.seal(secret)
            audit.record(session, audit.ENROLMENT_STARTED, SUCCESS, admin_id=admin.id, admin_email=admin.email,
                         ip=principal.ip)
        return {"secret": secret, "otpauth_uri": totp.provisioning_uri(secret, admin.email),
                "issuer": totp.ISSUER, "account": admin.email}


def enrolment_confirm(principal: Principal, code: str, user_agent: Optional[str]) -> Tuple[Opened, List[str]]:
    """Confirm the first code; store the secret; issue 10 recovery codes (shown once)."""
    if principal.stage != SessionStage.ENROLL:
        raise ApiError(409, "Two-factor sign-in is already set up.", "WRONG_STAGE")
    settings = get_settings()
    now = utcnow()
    ip = principal.ip
    failure: Optional[ApiError] = None
    with session_scope() as session:
        admin = _locked_admin(session, principal.admin_id)
        if _ip_blocked(session, ip, now, settings):
            failure = ApiError(429, TOO_MANY, "RATE_LIMITED")
        elif _account_locked(admin, now):
            _revoke(session, principal.session_id, now)
            failure = ApiError(401, LOCKED, "LOCKED")
        elif not admin.totp_pending_secret:
            failure = ApiError(409, "Start the set-up again: no authenticator is waiting for a code.", "NO_SECRET")
        else:
            secret = security.unseal(admin.totp_pending_secret)
            step = totp.verify(secret, code, None)
            if step is None:
                _note_ip_failure(session, ip, now)
                locked = _record_failure(session, admin, now, settings, ip)
                audit.record(session, audit.ENROLLED, FAILURE, admin_id=admin.id, admin_email=admin.email, ip=ip,
                             detail={"reason": "invalid_code"})
                failure = ApiError(401, LOCKED, "LOCKED") if locked else ApiError(400, INVALID_CODE, "INVALID_CODE")
            else:
                admin.totp_secret = admin.totp_pending_secret
                admin.totp_pending_secret = None
                admin.totp_last_step = step
                admin.totp_enrolled_at = now
                admin.last_login_at = now
                _clear_failures(admin)
                codes = _replace_recovery_codes(session, admin.id, now)
                _revoke(session, principal.session_id, now)
                opened = _open_session(session, admin, SessionStage.FULL, now, settings, ip, user_agent)
                audit.record(session, audit.ENROLLED, SUCCESS, admin_id=admin.id, admin_email=admin.email, ip=ip,
                             detail={"recovery_codes": len(codes)})
                audit.record(session, audit.SIGN_IN, SUCCESS, admin_id=admin.id, admin_email=admin.email, ip=ip,
                             detail={"method": "enrolment"})
                return opened, codes
        if failure.code in ("RATE_LIMITED", "LOCKED"):
            audit.record(session, audit.ENROLLED, FAILURE, admin_id=admin.id, admin_email=admin.email, ip=ip,
                         detail={"reason": failure.code.lower()})
    raise failure


def _replace_recovery_codes(session, admin_id: str, now: datetime) -> List[str]:
    session.execute(delete(RecoveryCode).where(RecoveryCode.admin_id == admin_id))
    codes = [security.new_recovery_code() for _ in range(security.RECOVERY_CODE_COUNT)]
    for code in codes:
        session.add(RecoveryCode(admin_id=admin_id, code_hash=security.recovery_code_hash(code), created_at=now))
    return codes


# --- re-authentication -------------------------------------------------------------------

def reauthenticate(principal: Principal, code: str) -> datetime:
    """A fresh TOTP for sensitive actions; returns until when it is good."""
    settings = get_settings()
    now = utcnow()
    ip = principal.ip
    failure: Optional[ApiError] = None
    with session_scope() as session:
        admin = _locked_admin(session, principal.admin_id)
        if _ip_blocked(session, ip, now, settings):
            failure = ApiError(429, TOO_MANY, "RATE_LIMITED")
            reason = "address_rate_limited"
        elif not admin.totp_secret:
            failure, reason = ApiError(409, "No authenticator is set up.", "NO_SECRET"), "no_secret"
        else:
            step = totp.verify(security.unseal(admin.totp_secret), code, admin.totp_last_step)
            if step is not None:
                admin.totp_last_step = step
                _clear_failures(admin)
                session.execute(update(AdminSession).where(AdminSession.id == principal.session_id)
                                .values(reauth_at=now))
                audit.record(session, audit.REAUTH, SUCCESS, admin_id=admin.id, admin_email=admin.email, ip=ip)
                return now + timedelta(minutes=settings.ADMIN_REAUTH_MINUTES)
            _note_ip_failure(session, ip, now)
            # Reaching the limit ends every session of the account.
            locked = _record_failure(session, admin, now, settings, ip)
            failure = ApiError(401, LOCKED, "LOCKED") if locked else ApiError(400, INVALID_CODE, "INVALID_CODE")
            reason = "invalid_code"
        audit.record(session, audit.REAUTH, FAILURE, admin_id=admin.id, admin_email=admin.email, ip=ip,
                     detail={"reason": reason})
    raise failure


# --- setup links -------------------------------------------------------------------------

def issue_setup_link(session, admin: Admin, now: Optional[datetime] = None) -> str:
    """A new one-time setup link for ``admin`` (earlier unused ones stop working)."""
    settings = get_settings()
    now = now or utcnow()
    session.execute(update(SetupToken).where(SetupToken.admin_id == admin.id, SetupToken.used_at.is_(None))
                    .values(used_at=now))
    token = security.new_token()
    session.add(SetupToken(admin_id=admin.id, token_hash=security.token_hash(token), created_at=now,
                           expires_at=now + timedelta(hours=settings.ADMIN_SETUP_LINK_HOURS)))
    # In the fragment: never sent to a server, never in a Referer.
    return f"{settings.SITE_ORIGIN}/setup#{token}"


def _setup_row(session, token: str, now: datetime) -> Optional[Tuple[SetupToken, Admin]]:
    row = session.execute(
        select(SetupToken, Admin).join(Admin, Admin.id == SetupToken.admin_id)
        .where(SetupToken.token_hash == security.token_hash(token))
    ).first()
    if row is None:
        return None
    link, admin = row
    if link.used_at is not None or ensure_aware(link.expires_at) <= now or not admin.active:
        return None
    return link, admin


def setup_check(token: str, ip: str) -> Dict[str, Any]:
    settings = get_settings()
    now = utcnow()
    with session_scope() as session:
        if _ip_blocked(session, ip, now, settings):
            failure = ApiError(429, TOO_MANY, "RATE_LIMITED")
        else:
            found = _setup_row(session, token, now)
            if found is not None:
                link, admin = found
                return {"email": admin.email, "name": admin.name, "expires_at": iso(link.expires_at)}
            _note_ip_failure(session, ip, now)
            audit.record(session, audit.SETUP_LINK, FAILURE, ip=ip, detail={"reason": "invalid_or_expired"})
            failure = ApiError(400, INVALID_SETUP_LINK, "INVALID_SETUP_LINK")
    raise failure


def setup_complete(token: str, password: str, ip: str, user_agent: Optional[str]) -> Opened:
    """Set the password through a setup link; the admin enrols TOTP next.
    The link works once; any earlier authenticator and session are dropped."""
    settings = get_settings()
    now = utcnow()
    with session_scope() as session:
        if _ip_blocked(session, ip, now, settings):
            failure = ApiError(429, TOO_MANY, "RATE_LIMITED")
        else:
            found = _setup_row(session, token, now)
            if found is not None:
                link, admin = found
                problem = security.password_problem(password, admin.email)
                if problem:
                    raise ApiError(400, problem, "WEAK_PASSWORD")
                admin = _locked_admin(session, admin.id)
                link.used_at = now
                admin.password_hash = security.hash_password(password)
                admin.totp_secret = admin.totp_pending_secret = None
                admin.totp_last_step = admin.totp_enrolled_at = None
                _clear_failures(admin)
                session.execute(delete(RecoveryCode).where(RecoveryCode.admin_id == admin.id))
                revoke_all(session, admin.id, now)
                opened = _open_session(session, admin, SessionStage.ENROLL, now, settings, ip, user_agent)
                audit.record(session, audit.SETUP_COMPLETED, SUCCESS, admin_id=admin.id, admin_email=admin.email,
                             ip=ip)
                return opened
            _note_ip_failure(session, ip, now)
            audit.record(session, audit.SETUP_LINK, FAILURE, ip=ip, detail={"reason": "invalid_or_expired"})
            failure = ApiError(400, INVALID_SETUP_LINK, "INVALID_SETUP_LINK")
    raise failure


# --- FastAPI dependencies ----------------------------------------------------------------

def client_ip(request: Request) -> str:
    return audit.client_address(request)


def signed_in_any_stage(ip: str = Depends(client_ip),
                        authorization: Optional[str] = Header(default=None)) -> Principal:
    """Any live session, even a half-finished sign-in (the sign-in steps use this)."""
    return any_session(ip, authorization)


def current_admin(principal: Principal = Depends(signed_in_any_stage)) -> Principal:
    """A fully signed-in admin. Every admin route depends on this."""
    if principal.stage != SessionStage.FULL:
        raise ApiError(403, INCOMPLETE, "SESSION_INCOMPLETE")
    return principal


def fresh_admin(principal: Principal = Depends(current_admin)) -> Principal:
    """A fully signed-in admin who gave a fresh TOTP within ADMIN_REAUTH_MINUTES
    (approve, reject, suspend, delete)."""
    require_fresh(principal)
    return principal
