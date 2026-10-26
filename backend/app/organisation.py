"""TenaCare's platform API (``/platform/...``): company applications and the
organisations they become, called with ``X-Platform-Key``.

docs/company-onboarding.md is the contract. The key stays in this process: it
is never returned, logged, or put in an error message. Without
ORGANISATION_PLATFORM_KEY every call answers 503 ("companies are not connected
yet") and the hospital side is untouched.

Documents go through the same streaming code and the same concurrency cap as
the hospital service's (app.hospital): one pool of slots for both.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

import httpx

from app import hospital
from app.config import get_settings
from app.errors import ApiError

#: Tests swap in an httpx.MockTransport.
transport: Optional[httpx.BaseTransport] = None

#: TenaCare's ids: 32 lowercase hex characters.
COMPANY_ID = r"^[0-9a-f]{32}$"
DOCUMENT_KINDS = ("trade_license", "tin_certificate", "authorization_letter")
APPLICATION_STATUSES = ("draft", "submitted", "approved", "rejected")

NOT_CONNECTED = "Companies are not connected yet: TenaCare's platform key (ORGANISATION_PLATFORM_KEY) is not set here."
UNREACHABLE = "TenaCare is not reachable. Try again shortly."


def configured() -> bool:
    return bool(get_settings().ORGANISATION_PLATFORM_KEY)


def require_configured() -> None:
    if not configured():
        raise ApiError(503, NOT_CONNECTED, "COMPANIES_NOT_CONNECTED")


def _check_id(company_id: str) -> str:
    if not re.fullmatch(COMPANY_ID, company_id or ""):
        raise ApiError(404, "Not found.", "NOT_FOUND")
    return company_id


def _client() -> httpx.Client:
    settings = get_settings()
    if not settings.ORGANISATION_PLATFORM_KEY:
        raise ApiError(503, NOT_CONNECTED, "COMPANIES_NOT_CONNECTED")
    return httpx.Client(
        base_url=settings.ORGANISATION_API_URL,
        headers={"X-Platform-Key": settings.ORGANISATION_PLATFORM_KEY, "Accept": "application/json"},
        timeout=settings.ORGANISATION_API_TIMEOUT,
        follow_redirects=False,
        transport=transport,
    )


def _message(response: httpx.Response) -> Optional[str]:
    """TenaCare answers errors as ``{"detail": "..."}`` (FastAPI)."""
    try:
        body = response.json()
    except ValueError:
        return None
    if isinstance(body, dict):
        for key in ("detail", "error"):
            if isinstance(body.get(key), str):
                return body[key][:500]
    return None


def _error(response: httpx.Response) -> ApiError:
    status = response.status_code
    message = _message(response)
    if status in (401, 403):
        # Never passed on as 401: that would end the admin's own session.
        return ApiError(502, "TenaCare refused Endod's platform key. Check ORGANISATION_PLATFORM_KEY.",
                        "UPSTREAM_AUTH")
    if status == 503:
        return ApiError(503, message or "TenaCare is not ready for the admin yet.", "UPSTREAM_503")
    if status in (400, 404, 409, 422):
        return ApiError(status, message or f"TenaCare refused the request ({status}).", f"UPSTREAM_{status}")
    return ApiError(502, f"TenaCare failed ({status}). Try again shortly.", "UPSTREAM_ERROR")


def _call(method: str, path: str, json: Optional[Dict[str, Any]] = None,
          params: Optional[Dict[str, str]] = None) -> Any:
    try:
        with _client() as client:
            response = client.request(method, path, json=json, params=params)
    except httpx.TimeoutException as exc:
        raise ApiError(504, "TenaCare did not answer in time.", "UPSTREAM_TIMEOUT") from exc
    except httpx.HTTPError as exc:
        raise ApiError(502, UNREACHABLE, "UPSTREAM_UNAVAILABLE") from exc
    if response.status_code >= 400:
        raise _error(response)
    try:
        return response.json()
    except ValueError as exc:
        raise ApiError(502, "Unexpected answer from TenaCare.", "UPSTREAM_INVALID") from exc


def _dict(value: Any) -> Dict[str, Any]:
    if not isinstance(value, dict):
        raise ApiError(502, "Unexpected answer from TenaCare.", "UPSTREAM_INVALID")
    return value


def _items(value: Any) -> List[Dict[str, Any]]:
    items = _dict(value).get("items")
    if not isinstance(items, list):
        raise ApiError(502, "Unexpected answer from TenaCare.", "UPSTREAM_INVALID")
    return [item for item in items if isinstance(item, dict)]


# --- applications ------------------------------------------------------------------------

def list_applications(status: Optional[str] = None) -> List[Dict[str, Any]]:
    if status is not None and status not in APPLICATION_STATUSES:
        raise ApiError(400, f"status must be one of {list(APPLICATION_STATUSES)}.", "VALIDATION_ERROR")
    return _items(_call("GET", "/platform/applications", params={"status": status} if status else None))


def get_application(company_id: str) -> Dict[str, Any]:
    return _dict(_call("GET", f"/platform/applications/{_check_id(company_id)}"))


def approve(company_id: str, reviewer: str) -> Dict[str, Any]:
    return _dict(_call("POST", f"/platform/applications/{_check_id(company_id)}/approve",
                       json={"reviewer": reviewer}))


def reject(company_id: str, reason: str, reviewer: str) -> Dict[str, Any]:
    return _dict(_call("POST", f"/platform/applications/{_check_id(company_id)}/reject",
                       json={"reason": reason, "reviewer": reviewer}))


# --- organisations -----------------------------------------------------------------------

def list_organisations() -> List[Dict[str, Any]]:
    return _items(_call("GET", "/platform/organisations"))


def suspend(company_id: str, reviewer: str) -> Dict[str, Any]:
    return _dict(_call("POST", f"/platform/organisations/{_check_id(company_id)}/suspend",
                       json={"reviewer": reviewer}))


def reactivate(company_id: str, reviewer: str) -> Dict[str, Any]:
    return _dict(_call("POST", f"/platform/organisations/{_check_id(company_id)}/reactivate",
                       json={"reviewer": reviewer}))


# --- documents ---------------------------------------------------------------------------

def open_document(company_id: str, kind: str) -> hospital.OpenDocument:
    """One of an application's three documents (PDF or image only), opened for
    streaming. Shares app.hospital's slots (at most MAX_CONCURRENT_DOCUMENTS
    documents at once, hospital and company together); the caller must
    consume ``chunks()`` or call ``close()``."""
    _check_id(company_id)
    if kind not in DOCUMENT_KINDS:
        raise ApiError(404, "Document not found.", "NOT_FOUND")
    require_configured()
    slots = hospital._document_slots
    if not slots.acquire(timeout=hospital.DOCUMENT_WAIT_SECONDS):
        raise ApiError(503, "Too many documents are being opened right now. Try again shortly.", "BUSY")
    client: Optional[httpx.Client] = None
    response: Optional[httpx.Response] = None
    try:
        client = _client()
        request = client.build_request("GET", f"/platform/applications/{company_id}/documents/{kind}",
                                       headers={"Accept": "*/*"})
        response = client.send(request, stream=True)
        if response.status_code >= 400:
            response.read()
            raise _error(response)
        content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
        if content_type not in hospital.DOCUMENT_TYPES:
            raise ApiError(502, "The document is not a PDF or an image; it is not shown here.",
                           "UPSTREAM_INVALID_TYPE")
        length_header = response.headers.get("content-length", "")
        length = int(length_header) if length_header.isdigit() else None
        if length is not None and length > hospital.MAX_DOCUMENT_BYTES:
            raise ApiError(502, "The document is too large.", "UPSTREAM_TOO_LARGE")
        opened = hospital.OpenDocument(
            client, response, content_type,
            hospital.safe_filename(response.headers.get("content-disposition", ""), kind,
                                   hospital.DOCUMENT_TYPES[content_type]),
            length, None)
    except BaseException as exc:
        if response is not None:
            response.close()
        if client is not None:
            client.close()
        slots.release()
        if isinstance(exc, httpx.TimeoutException):
            raise ApiError(504, "TenaCare did not answer in time.", "UPSTREAM_TIMEOUT") from exc
        if isinstance(exc, httpx.HTTPError):
            raise ApiError(502, UNREACHABLE, "UPSTREAM_UNAVAILABLE") from exc
        raise
    return opened
