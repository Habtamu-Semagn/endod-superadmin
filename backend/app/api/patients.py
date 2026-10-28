"""Patient accounts (Users) and digital cards, through the patient platform's
admin API (app.platform): account data only, never health data.

Suspend and reactivate need a fresh TOTP (app.auth.fresh_admin) and a
reason; the admin's email goes along as the actor for the platform's own
audit trail. Every change, and every look at an account or a card (searches
included), is written to this audit log, whether it worked or not.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, Optional

from fastapi import APIRouter, Depends, Path, Query
from pydantic import BaseModel, Field, field_validator

from app import audit, platform
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


# --- accounts ----------------------------------------------------------------------------

@router.get("/patients")
def search(query: str = Query(default="", max_length=100),
           principal: Principal = Depends(_connected)) -> Dict[str, Any]:
    value = query.strip()
    try:
        result = platform.search(value)
    except ApiError as exc:
        _record(principal, audit.PATIENT_SEARCH, AuditResult.FAILURE, None, None,
                {"query": value, "status": exc.status_code, "error": exc.message})
        raise
    _record(principal, audit.PATIENT_SEARCH, AuditResult.SUCCESS, None, None,
            {"query": value, "results": len(result["items"])})
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
    return _audited(principal, audit.PATIENT_SUSPEND, dedan_id,
                    lambda: platform.suspend(dedan_id, body.reason, principal.email), {"reason": body.reason})


@router.post("/patients/{dedan_id}/reactivate")
def reactivate(body: AccountAction, dedan_id: str = DedanId,
               principal: Principal = Depends(_connected_fresh)) -> Dict[str, Any]:
    dedan_id = platform.check_id(dedan_id)
    return _audited(principal, audit.PATIENT_REACTIVATE, dedan_id,
                    lambda: platform.reactivate(dedan_id, body.reason, principal.email), {"reason": body.reason})


# --- digital cards -----------------------------------------------------------------------

@router.get("/cards/{dedan_id}")
def card(dedan_id: str = DedanId, s: str = Query(default="", max_length=64, pattern=r"^[A-Za-z0-9_-]*$"),
         principal: Principal = Depends(_connected)) -> Dict[str, Any]:
    dedan_id = platform.check_id(dedan_id)
    return _audited(principal, audit.CARD_CHECK, dedan_id, lambda: platform.card(dedan_id, s or None),
                    {"signature_given": bool(s)}, target_type="card", name_of=lambda r: None)
