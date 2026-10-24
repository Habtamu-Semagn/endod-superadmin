"""The hospital service's platform API (``/platform/...``), called with
``X-Platform-Key``. The key stays in this process: it is never returned,
logged, or put in an error message.

Errors come back as ApiError with the hospital service's own message (for
example the 409 when an application is not submitted yet), so the admin sees
exactly why it refused.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from urllib.parse import unquote

import httpx

from app.config import get_settings
from app.errors import ApiError

#: Tests swap in an httpx.MockTransport.
transport: Optional[httpx.BaseTransport] = None

HOSPITAL_ID = r"^[0-9a-f]{32}$"
DOCUMENT_KINDS = ("moh_license", "trade_license", "tin_certificate", "owner_id")
#: What documents may be: never HTML, SVG or anything a browser would run.
DOCUMENT_TYPES = {"application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
#: The hospital service caps documents at 10 MB.
MAX_DOCUMENT_BYTES = 12 * 1024 * 1024

UNREACHABLE = "The hospital service is not reachable. Try again shortly."


def _check_id(hospital_id: str) -> str:
    if not re.fullmatch(HOSPITAL_ID, hospital_id or ""):
        raise ApiError(404, "Not found.", "NOT_FOUND")
    return hospital_id


def _client() -> httpx.Client:
    settings = get_settings()
    if not settings.HOSPITAL_PLATFORM_KEY:
        raise ApiError(503, "The hospital service is not configured here (HOSPITAL_PLATFORM_KEY is not set).",
                       "UPSTREAM_NOT_CONFIGURED")
    return httpx.Client(
        base_url=settings.HOSPITAL_API_URL,
        headers={"X-Platform-Key": settings.HOSPITAL_PLATFORM_KEY, "Accept": "application/json"},
        timeout=settings.HOSPITAL_API_TIMEOUT,
        follow_redirects=False,
        transport=transport,
    )


def _message(response: httpx.Response) -> Optional[str]:
    try:
        body = response.json()
    except ValueError:
        return None
    if isinstance(body, dict) and isinstance(body.get("error"), str):
        return body["error"][:500]
    return None


def _error(response: httpx.Response) -> ApiError:
    status = response.status_code
    message = _message(response)
    if status in (401, 403):
        # Never passed on as 401: that would end the admin's own session.
        return ApiError(502, "The hospital service refused Endod's platform key. Check HOSPITAL_PLATFORM_KEY.",
                        "UPSTREAM_AUTH")
    if status in (400, 404, 409, 422):
        return ApiError(status, message or f"The hospital service refused the request ({status}).",
                        f"UPSTREAM_{status}")
    return ApiError(502, f"The hospital service failed ({status}). Try again shortly.", "UPSTREAM_ERROR")


def _call(method: str, path: str, json: Optional[Dict[str, Any]] = None,
          params: Optional[Dict[str, str]] = None) -> Any:
    try:
        with _client() as client:
            response = client.request(method, path, json=json, params=params)
    except httpx.TimeoutException as exc:
        raise ApiError(504, "The hospital service did not answer in time.", "UPSTREAM_TIMEOUT") from exc
    except httpx.HTTPError as exc:
        raise ApiError(502, UNREACHABLE, "UPSTREAM_UNAVAILABLE") from exc
    if response.status_code >= 400:
        raise _error(response)
    try:
        return response.json()
    except ValueError as exc:
        raise ApiError(502, "Unexpected answer from the hospital service.", "UPSTREAM_INVALID") from exc


def _list(value: Any) -> List[Dict[str, Any]]:
    if not isinstance(value, list):
        raise ApiError(502, "Unexpected answer from the hospital service.", "UPSTREAM_INVALID")
    return [item for item in value if isinstance(item, dict)]


def _dict(value: Any) -> Dict[str, Any]:
    if not isinstance(value, dict):
        raise ApiError(502, "Unexpected answer from the hospital service.", "UPSTREAM_INVALID")
    return value


# --- hospitals ---------------------------------------------------------------------------

def list_hospitals(status: Optional[str] = None) -> List[Dict[str, Any]]:
    return _list(_call("GET", "/platform/hospitals", params={"status": status} if status else None))


def get_hospital(hospital_id: str) -> Dict[str, Any]:
    """The platform API has no single-hospital read: found in the list."""
    _check_id(hospital_id)
    for hospital in list_hospitals():
        if hospital.get("id") == hospital_id:
            return hospital
    raise ApiError(404, "Hospital not found.", "NOT_FOUND")


def approve(hospital_id: str) -> Dict[str, Any]:
    return _dict(_call("POST", f"/platform/hospitals/{_check_id(hospital_id)}/approve"))


def suspend(hospital_id: str) -> Dict[str, Any]:
    return _dict(_call("POST", f"/platform/hospitals/{_check_id(hospital_id)}/suspend"))


def delete(hospital_id: str) -> Dict[str, Any]:
    return _dict(_call("DELETE", f"/platform/hospitals/{_check_id(hospital_id)}"))


# --- applications ------------------------------------------------------------------------

def list_applications(status: Optional[str] = None) -> List[Dict[str, Any]]:
    return _list(_call("GET", "/platform/applications", params={"status": status} if status else None))


def get_application(hospital_id: str) -> Dict[str, Any]:
    return _dict(_call("GET", f"/platform/applications/{_check_id(hospital_id)}"))


def reject(hospital_id: str, reason: str) -> Dict[str, Any]:
    return _dict(_call("POST", f"/platform/hospitals/{_check_id(hospital_id)}/reject", json={"reason": reason}))


@dataclass(frozen=True)
class Document:
    content: bytes
    content_type: str
    filename: str
    sha256: Optional[str]


_FILENAME_STAR = re.compile(r"filename\*\s*=\s*(?:utf-8|UTF-8)''([^;]+)")
_FILENAME = re.compile(r'filename\s*=\s*"?([^";]+)"?')


def safe_filename(disposition: str, kind: str, extension: str) -> str:
    """A plain file name for the download: letters, digits, dot, dash, underscore, space."""
    match = _FILENAME_STAR.search(disposition) or _FILENAME.search(disposition)
    raw = unquote(match.group(1)) if match else ""
    cleaned = re.sub(r"[^A-Za-z0-9._ -]+", "_", raw).strip(" ._")[:100]
    if not cleaned:
        return f"{kind}.{extension}"
    if not cleaned.lower().endswith(f".{extension}"):
        cleaned = f"{cleaned.rsplit('.', 1)[0] if '.' in cleaned else cleaned}.{extension}"
    return cleaned


def document(hospital_id: str, kind: str) -> Document:
    """One of an application's four documents (PDF or image only)."""
    _check_id(hospital_id)
    if kind not in DOCUMENT_KINDS:
        raise ApiError(404, "Document not found.", "NOT_FOUND")
    try:
        with _client() as client:
            with client.stream("GET", f"/platform/applications/{hospital_id}/documents/{kind}",
                               headers={"Accept": "*/*"}) as response:
                if response.status_code >= 400:
                    response.read()
                    raise _error(response)
                content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
                if content_type not in DOCUMENT_TYPES:
                    raise ApiError(502, "The document is not a PDF or an image; it is not shown here.",
                                   "UPSTREAM_INVALID_TYPE")
                chunks, size = [], 0
                for chunk in response.iter_bytes():
                    size += len(chunk)
                    if size > MAX_DOCUMENT_BYTES:
                        raise ApiError(502, "The document is too large.", "UPSTREAM_TOO_LARGE")
                    chunks.append(chunk)
                disposition = response.headers.get("content-disposition", "")
                sha256 = response.headers.get("x-sha256")
    except httpx.TimeoutException as exc:
        raise ApiError(504, "The hospital service did not answer in time.", "UPSTREAM_TIMEOUT") from exc
    except httpx.HTTPError as exc:
        raise ApiError(502, UNREACHABLE, "UPSTREAM_UNAVAILABLE") from exc
    return Document(content=b"".join(chunks), content_type=content_type,
                    filename=safe_filename(disposition, kind, DOCUMENT_TYPES[content_type]),
                    sha256=sha256 if sha256 and re.fullmatch(r"[0-9a-f]{64}", sha256) else None)
