"""Applications (Verifications), hospitals (Organisations) and the dashboard
counts, read from and changed through the hospital service's platform API.

Approve, reject, suspend and delete need a fresh TOTP (app.auth.fresh_admin).
Every change and every document view is written to the audit log, whether
it worked or not.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, Path, Query
from fastapi.responses import Response, StreamingResponse
from starlette.background import BackgroundTask
from pydantic import BaseModel, Field, field_validator

from app import audit, hospital, organisation, platform
from app.auth import Principal, current_admin, fresh_admin
from app.db import session_scope
from app.errors import ApiError
from app.models import AuditResult

router = APIRouter(tags=["hospitals"])

HospitalId = Path(pattern=hospital.HOSPITAL_ID)
APPLICATION_STATUSES = ("draft", "submitted", "rejected", "approved", "suspended")
HOSPITAL_STATUSES = ("pending", "approved", "suspended")


def _status(value: Optional[str], allowed) -> Optional[str]:
    if value is not None and value not in allowed:
        raise ApiError(400, f"status must be one of {list(allowed)}.", "VALIDATION_ERROR")
    return value


def _audited(principal: Principal, action: str, hospital_id: str, call: Callable[[], Dict[str, Any]],
             detail: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Run a change against the hospital service and log how it went."""
    try:
        result = call()
    except ApiError as exc:
        with session_scope() as session:
            audit.record(session, action, AuditResult.FAILURE, admin_id=principal.admin_id,
                         admin_email=principal.email, ip=principal.ip, target_type="hospital",
                         target_id=hospital_id,
                         detail={**(detail or {}), "status": exc.status_code, "error": exc.message})
        raise
    with session_scope() as session:
        audit.record(session, action, AuditResult.SUCCESS, admin_id=principal.admin_id, admin_email=principal.email,
                     ip=principal.ip, target_type="hospital", target_id=hospital_id,
                     target_name=result.get("name") if isinstance(result.get("name"), str) else None,
                     detail=detail)
    return result


# --- dashboard ---------------------------------------------------------------------------

@router.get("/dashboard")
def dashboard(_: Principal = Depends(current_admin)) -> Dict[str, Any]:
    """The counts available now; each is null (with the reason) if its service fails.
    Companies are counted only once TenaCare is connected (``companies_connected``),
    and patient accounts, bookings and prescriptions once the patient platform is
    (``platform_connected``); until then that is not an error."""
    counts: Dict[str, Any] = {"pending_applications": None, "approved_hospitals": None,
                              "pending_hospitals": None, "awaiting_review": [],
                              "pending_company_applications": None, "approved_companies": None,
                              "awaiting_company_review": [],
                              "companies_connected": organisation.configured(),
                              "platform_connected": platform.configured(), "platform": None, "errors": []}

    def note(exc: ApiError) -> None:
        if exc.message not in counts["errors"]:
            counts["errors"].append(exc.message)

    try:
        applications = hospital.list_applications()
        submitted = [a for a in applications if a.get("status") == "submitted"]
        counts["pending_applications"] = len(submitted)
        counts["awaiting_review"] = sorted(submitted, key=lambda a: a.get("submitted_at") or "")[:5]
    except ApiError as exc:
        note(exc)
    try:
        hospitals = hospital.list_hospitals()
        counts["approved_hospitals"] = sum(1 for h in hospitals if h.get("status") == "approved")
        counts["pending_hospitals"] = sum(1 for h in hospitals if h.get("status") == "pending")
    except ApiError as exc:
        note(exc)
    if counts["companies_connected"]:
        try:
            submitted = organisation.list_applications("submitted")
            counts["pending_company_applications"] = len(submitted)
            counts["awaiting_company_review"] = sorted(
                submitted, key=lambda a: a.get("submitted_at") or "")[:5]
        except ApiError as exc:
            note(exc)
        try:
            counts["approved_companies"] = sum(
                1 for c in organisation.list_organisations() if c.get("status") == "active")
        except ApiError as exc:
            note(exc)
    if counts["platform_connected"]:
        try:
            counts["platform"] = platform.stats()
        except ApiError as exc:
            note(exc)
    return counts


# --- applications ------------------------------------------------------------------------

@router.get("/applications")
def list_applications(status: Optional[str] = Query(default=None),
                      _: Principal = Depends(current_admin)) -> List[Dict[str, Any]]:
    return hospital.list_applications(_status(status, APPLICATION_STATUSES))


@router.get("/applications/{hospital_id}")
def read_application(hospital_id: str = HospitalId, _: Principal = Depends(current_admin)) -> Dict[str, Any]:
    return hospital.get_application(hospital_id)


@router.get("/applications/{hospital_id}/documents/{kind}")
def read_document(hospital_id: str = HospitalId, kind: str = Path(pattern=r"^[a-z_]{3,32}$"),
                  download: bool = Query(default=False),
                  principal: Principal = Depends(current_admin)) -> Response:
    detail = {"kind": kind, "download": download}
    try:
        doc = hospital.open_document(hospital_id, kind)
    except ApiError as exc:
        with session_scope() as session:
            audit.record(session, audit.DOCUMENT_VIEW, AuditResult.FAILURE, admin_id=principal.admin_id,
                         admin_email=principal.email, ip=principal.ip, target_type="hospital", target_id=hospital_id,
                         detail={**detail, "status": exc.status_code, "error": exc.message})
        raise
    try:
        with session_scope() as session:
            audit.record(session, audit.DOCUMENT_VIEW, AuditResult.SUCCESS, admin_id=principal.admin_id,
                         admin_email=principal.email, ip=principal.ip, target_type="hospital", target_id=hospital_id,
                         detail={**detail, "sha256": doc.sha256, "content_type": doc.content_type})
    except BaseException:
        doc.close()
        raise
    disposition = "attachment" if download else "inline"
    ascii_name = doc.filename.encode("ascii", "ignore").decode() or f"{kind}"
    headers = {
        "Content-Disposition": f"{disposition}; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(doc.filename)}",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
    }
    if doc.length is not None:
        headers["Content-Length"] = str(doc.length)
    # Streamed as it arrives; the slot and connection are released when it
    # ends, or by the background task if the client goes away first.
    return StreamingResponse(doc.chunks(), media_type=doc.content_type, headers=headers,
                             background=BackgroundTask(doc.close))


class Rejection(BaseModel):
    #: Shown to the hospital on its Under review page.
    reason: str = Field(min_length=3, max_length=1000)

    @field_validator("reason")
    @classmethod
    def _strip(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("give a reason the hospital can act on")
        return value


@router.post("/applications/{hospital_id}/approve")
def approve_application(hospital_id: str = HospitalId, principal: Principal = Depends(fresh_admin)) -> Dict[str, Any]:
    return _audited(principal, audit.APPROVE, hospital_id, lambda: hospital.approve(hospital_id),
                    {"from": "application"})


@router.post("/applications/{hospital_id}/reject")
def reject_application(body: Rejection, hospital_id: str = HospitalId,
                       principal: Principal = Depends(fresh_admin)) -> Dict[str, Any]:
    return _audited(principal, audit.REJECT, hospital_id, lambda: hospital.reject(hospital_id, body.reason),
                    {"reason": body.reason})


# --- hospitals (organisations) -----------------------------------------------------------

@router.get("/organisations")
def list_organisations(status: Optional[str] = Query(default=None),
                       _: Principal = Depends(current_admin)) -> List[Dict[str, Any]]:
    return hospital.list_hospitals(_status(status, HOSPITAL_STATUSES))


@router.get("/organisations/{hospital_id}")
def read_organisation(hospital_id: str = HospitalId, _: Principal = Depends(current_admin)) -> Dict[str, Any]:
    return hospital.get_hospital(hospital_id)


@router.post("/organisations/{hospital_id}/suspend")
def suspend(hospital_id: str = HospitalId, principal: Principal = Depends(fresh_admin)) -> Dict[str, Any]:
    return _audited(principal, audit.SUSPEND, hospital_id, lambda: hospital.suspend(hospital_id))


@router.post("/organisations/{hospital_id}/approve")
def reapprove(hospital_id: str = HospitalId, principal: Principal = Depends(fresh_admin)) -> Dict[str, Any]:
    return _audited(principal, audit.APPROVE, hospital_id, lambda: hospital.approve(hospital_id),
                    {"from": "organisation"})


@router.delete("/organisations/{hospital_id}")
def delete(hospital_id: str = HospitalId, principal: Principal = Depends(fresh_admin)) -> Dict[str, Any]:
    return _audited(principal, audit.DELETE, hospital_id, lambda: hospital.delete(hospital_id))
