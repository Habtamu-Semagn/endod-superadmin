"""Patient accounts (Users) and digital cards, through the patient platform's
admin API (app.platform): account data only, never health data.

Suspend and reactivate need a fresh TOTP (app.auth.fresh_admin) and a
reason; the admin's email goes along as the actor for the platform's own
audit trail. Every change, and every look at an account or a card (searches
included), is written to this audit log, whether it worked or not.

A change is logged *before* it is sent (result ``pending``, with an
``attempt`` id) and its outcome after, as a second row with the same
``attempt`` (the log is append-only: rows are never updated). So a change
the platform made is on record even if this service fails right after.

A search is logged as the kind of query (Endod ID, phone, email, name) and a
short keyed hash of it, never the words typed (they are personal data); the
query travels in a POST body, so no access log has it either.
"""

from __future__ import annotations

import hashlib
import hmac
import re
import uuid
from typing import Any, Callable, Dict, Optional

from fastapi import APIRouter, Depends, Path, Query
from pydantic import BaseModel, Field, field_validator

from app import audit, platform, security
from app.auth import Principal, current_admin, require_fresh
from app.db import session_scope
from app.errors import ApiError
from app.models import AuditResult

router = APIRouter(tags=["patients"])

DedanId = Path(pattern=r"^[Dd][Ee][0-9]{6}$")
TARGET = "patient"


def _connected(principal: Principal = Depends(current_admin)) -> Principal:
    if not platform.configured():
        raise ApiError(503, platform.NOT_CONNECTED, "PLATFORM_NOT_CONNECTED")
    return principal


def _connected_fresh(principal: Principal = Depends(_connected)) -> Principal:
    """As app.auth.fresh_admin, but "not connected" (503) comes before asking for a code."""
    require_fresh(principal)
    return principal


def _record(principal: Principal, action: str, result: str, target_id: Optional[str],
            name: Optional[str], detail: Optional[Dict[str, Any]], target_type: str = TARGET) -> None:
    with session_scope() as session:
        audit.record(session, action, result, admin_id=principal.admin_id, admin_email=principal.email,
                     ip=principal.ip, target_type=target_type, target_id=target_id, target_name=name, detail=detail)


def _audited(principal: Principal, action: str, target_id: Optional[str], call: Callable[[], Dict[str, Any]],
             detail: Optional[Dict[str, Any]] = None, target_type: str = TARGET,
             name_of: Callable[[Dict[str, Any]], Optional[str]] = lambda r: r.get("name")) -> Dict[str, Any]:
    try:
        result = call()
    except ApiError as exc:
        _record(principal, action, AuditResult.FAILURE, target_id, None,
                {**(detail or {}), "status": exc.status_code, "error": exc.message}, target_type)
        raise
    name = name_of(result)
    _record(principal, action, AuditResult.SUCCESS, target_id, name if isinstance(name, str) else None,
            detail, target_type)
    return result


def _changed(principal: Principal, action: str, target_id: str, call: Callable[[], Dict[str, Any]],
             detail: Dict[str, Any]) -> Dict[str, Any]:
    """A change: ``pending`` is committed before the platform is called, then
    the outcome (``success``, or ``failure`` with the error's class)."""
    attempt = uuid.uuid4().hex
    _record(principal, action, AuditResult.PENDING, target_id, None, {**detail, "attempt": attempt})
    try:
        result = call()
    except ApiError as exc:
        _record(principal, action, AuditResult.FAILURE, target_id, None,
                {**detail, "attempt": attempt, "error_class": exc.code, "status": exc.status_code,
                 "error": exc.message})
        raise
    except Exception as exc:
        _record(principal, action, AuditResult.FAILURE, target_id, None,
                {**detail, "attempt": attempt, "error_class": type(exc).__name__})
        raise
    name = result.get("name")
    _record(principal, action, AuditResult.SUCCESS, target_id, name if isinstance(name, str) else None,
            {**detail, "attempt": attempt})
    return result


def query_kind(value: str) -> str:
    """What a search looked for, without what it was."""
    text = value.strip()
    if not text:
        return "all"
    if re.fullmatch(r"(?i)de\d{1,6}", text):
        return "endod_id"
    if "@" in text:
        return "email"
    if re.fullmatch(r"[+\d\s().-]+", text) and sum(c.isdigit() for c in text) >= 3:
        return "phone"
    return "name"


def query_fingerprint(value: str) -> str:
    """12 hex characters of a keyed hash (a SESSION_SECRET-derived key) of the
    normalised query: repeated searches for one thing can be matched, the
    query cannot be read back."""
    normal = " ".join(value.strip().lower().split())
    return hmac.new(security._key("audit-search"), normal.encode(), hashlib.sha256).hexdigest()[:12]


class Search(BaseModel):
    query: str = Field(default="", max_length=100)


# --- accounts ----------------------------------------------------------------------------

@router.post("/patients/search")
def search(body: Search, principal: Principal = Depends(_connected)) -> Dict[str, Any]:
    value = body.query.strip()
    detail = {"query_kind": query_kind(value), "query_hash": query_fingerprint(value) if value else None}
    try:
        result = platform.search(value)
    except ApiError as exc:
        _record(principal, audit.PATIENT_SEARCH, AuditResult.FAILURE, None, None,
                {**detail, "status": exc.status_code, "error": exc.message})
        raise
    _record(principal, audit.PATIENT_SEARCH, AuditResult.SUCCESS, None, None,
            {**detail, "results": len(result["items"])})
    return result


@router.get("/patients/{dedan_id}")
def read(dedan_id: str = DedanId, principal: Principal = Depends(_connected)) -> Dict[str, Any]:
    dedan_id = platform.check_id(dedan_id)
    return _audited(principal, audit.PATIENT_VIEW, dedan_id, lambda: platform.account(dedan_id))


class AccountAction(BaseModel):
    #: Why: kept on the account (the platform) and in both audit logs.
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("reason")
    @classmethod
    def _strip(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("give a reason")
        return value


@router.post("/patients/{dedan_id}/suspend")
def suspend(body: AccountAction, dedan_id: str = DedanId,
            principal: Principal = Depends(_connected_fresh)) -> Dict[str, Any]:
    dedan_id = platform.check_id(dedan_id)
    return _changed(principal, audit.PATIENT_SUSPEND, dedan_id,
                    lambda: platform.suspend(dedan_id, body.reason, principal.email), {"reason": body.reason})


@router.post("/patients/{dedan_id}/reactivate")
def reactivate(body: AccountAction, dedan_id: str = DedanId,
               principal: Principal = Depends(_connected_fresh)) -> Dict[str, Any]:
    dedan_id = platform.check_id(dedan_id)
    return _changed(principal, audit.PATIENT_REACTIVATE, dedan_id,
                    lambda: platform.reactivate(dedan_id, body.reason, principal.email), {"reason": body.reason})


# --- digital cards -----------------------------------------------------------------------

@router.get("/cards/{dedan_id}")
def card(dedan_id: str = DedanId, s: str = Query(default="", max_length=64, pattern=r"^[A-Za-z0-9_-]*$"),
         principal: Principal = Depends(_connected)) -> Dict[str, Any]:
    dedan_id = platform.check_id(dedan_id)
    return _audited(principal, audit.CARD_CHECK, dedan_id, lambda: platform.card(dedan_id, s or None),
                    {"signature_given": bool(s)}, target_type="card", name_of=lambda r: None)
