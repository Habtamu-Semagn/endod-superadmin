"""Company applications (Verifications, Companies) and companies
(Organisations, Companies), read from and changed through TenaCare's platform
API (docs/company-onboarding.md).

Approve, reject, suspend and reactivate need a fresh TOTP (as app.auth.fresh_admin);
the admin's email goes along as ``reviewer`` for TenaCare's own audit. Every
change and every document view is written to this audit log, whether it worked
or not. Without ORGANISATION_PLATFORM_KEY every route here answers 503.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, Path, Query
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field, field_validator
from starlette.background import BackgroundTask

from app import audit, organisation
from app.auth import Principal, current_admin, require_fresh
from app.db import session_scope
from app.errors import ApiError
from app.models import AuditResult

router = APIRouter(tags=["companies"])

CompanyId = Path(pattern=organisation.COMPANY_ID)
TARGET = "company"


def _connected(principal: Principal = Depends(current_admin)) -> Principal:
    organisation.require_configured()
    return principal


def _connected_fresh(principal: Principal = Depends(_connected)) -> Principal:
    """As app.auth.fresh_admin, but "not connected" (503) comes before asking for a code."""
    require_fresh(principal)
    return principal


def _record(principal: Principal, action: str, result: str, company_id: str, name: Optional[str],
            detail: Optional[Dict[str, Any]]) -> None:
    with session_scope() as session:
        audit.record(session, action, result, admin_id=principal.admin_id, admin_email=principal.email,
                     ip=principal.ip, target_type=TARGET, target_id=company_id, target_name=name, detail=detail)


def _name_or_none(lookup: Callable[[], Optional[str]]) -> Optional[str]:
    """The company's name for the audit log; never stops the action."""
    try:
        name = lookup()
    except ApiError:
        return None
    return name if isinstance(name, str) else None


def _audited(principal: Principal, action: str, company_id: str, call: Callable[[], Dict[str, Any]],
             name: Optional[str], detail: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    try:
        result = call()
    except ApiError as exc:
        _record(principal, action, AuditResult.FAILURE, company_id, name,
                {**(detail or {}), "status": exc.status_code, "error": exc.message})
        raise
    _record(principal, action, AuditResult.SUCCESS, company_id, name, detail)
    return result


def _application_name(company_id: str) -> Optional[str]:
    return _name_or_none(lambda: organisation.get_application(company_id).get("legal_name"))


def _organisation_name(company_id: str) -> Optional[str]:
    def lookup() -> Optional[str]:
        for row in organisation.list_organisations():
            if row.get("id") == company_id:
                return row.get("name")
        return None
    return _name_or_none(lookup)


# --- applications ------------------------------------------------------------------------

@router.get("/company-applications")
def list_applications(status: Optional[str] = Query(default=None),
                      _: Principal = Depends(_connected)) -> List[Dict[str, Any]]:
    return organisation.list_applications(status)


@router.get("/company-applications/{company_id}")
def read_application(company_id: str = CompanyId, _: Principal = Depends(_connected)) -> Dict[str, Any]:
    return organisation.get_application(company_id)


@router.get("/company-applications/{company_id}/documents/{kind}")
def read_document(company_id: str = CompanyId, kind: str = Path(pattern=r"^[a-z_]{3,32}$"),
                  download: bool = Query(default=False),
                  principal: Principal = Depends(_connected)) -> Response:
    detail = {"kind": kind, "download": download}
    try:
        doc = organisation.open_document(company_id, kind)
    except ApiError as exc:
        _record(principal, audit.COMPANY_DOCUMENT_VIEW, AuditResult.FAILURE, company_id, None,
                {**detail, "status": exc.status_code, "error": exc.message})
        raise
    try:
        _record(principal, audit.COMPANY_DOCUMENT_VIEW, AuditResult.SUCCESS, company_id, None,
                {**detail, "content_type": doc.content_type})
    except BaseException:
        doc.close()
        raise
    disposition = "attachment" if download else "inline"
    ascii_name = doc.filename.encode("ascii", "ignore").decode() or kind
    headers = {
        "Content-Disposition": f"{disposition}; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(doc.filename)}",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
    }
    if doc.length is not None:
        headers["Content-Length"] = str(doc.length)
    return StreamingResponse(doc.chunks(), media_type=doc.content_type, headers=headers,
                             background=BackgroundTask(doc.close))


class Approval(BaseModel):
    #: The ``updated_at`` of the detail the reviewer is looking at (Amendment 1).
    expected_updated_at: str = Field(min_length=1, max_length=64)


class Rejection(BaseModel):
    #: Shown to the applicant on TenaCare.
    reason: str = Field(min_length=3, max_length=1000)
    #: Fake or abusive: the application is closed and cannot be resubmitted.
    close: bool = False

    @field_validator("reason")
    @classmethod
    def _strip(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("give a reason the company can act on")
        return value


@router.post("/company-applications/{company_id}/approve")
def approve_application(body: Approval, company_id: str = CompanyId,
                        principal: Principal = Depends(_connected_fresh)) -> Dict[str, Any]:
    name = _application_name(company_id)
    return _audited(principal, audit.COMPANY_APPROVE, company_id,
                    lambda: organisation.approve(company_id, principal.email, body.expected_updated_at), name,
                    {"expected_updated_at": body.expected_updated_at})


@router.post("/company-applications/{company_id}/reject")
def reject_application(body: Rejection, company_id: str = CompanyId,
                       principal: Principal = Depends(_connected_fresh)) -> Dict[str, Any]:
    name = _application_name(company_id)
    return _audited(principal, audit.COMPANY_REJECT, company_id,
                    lambda: organisation.reject(company_id, body.reason, principal.email, body.close), name,
                    {"reason": body.reason, "close": body.close})


# --- companies (organisations) -----------------------------------------------------------

@router.get("/companies")
def list_companies(_: Principal = Depends(_connected)) -> List[Dict[str, Any]]:
    return organisation.list_organisations()


@router.post("/companies/{company_id}/suspend")
def suspend(company_id: str = CompanyId, principal: Principal = Depends(_connected_fresh)) -> Dict[str, Any]:
    name = _organisation_name(company_id)
    return _audited(principal, audit.COMPANY_SUSPEND, company_id,
                    lambda: organisation.suspend(company_id, principal.email), name)


@router.post("/companies/{company_id}/reactivate")
def reactivate(company_id: str = CompanyId, principal: Principal = Depends(_connected_fresh)) -> Dict[str, Any]:
    name = _organisation_name(company_id)
    return _audited(principal, audit.COMPANY_REACTIVATE, company_id,
                    lambda: organisation.reactivate(company_id, principal.email), name)
