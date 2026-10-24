"""The hospital service's platform API (``/platform/...``), called with
``X-Platform-Key``. The key stays in this process: it is never returned,
logged, or put in an error message.

Errors come back as ApiError with the hospital service's own message (for
example the 409 when an application is not submitted yet), so the admin sees
exactly why it refused.
"""

from __future__ import annotations

import re
import threading
from typing import Any, Dict, Iterator, List, Optional
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


#: Documents fetched at once (each holds a connection to the hospital service).
MAX_CONCURRENT_DOCUMENTS = 4
#: How long a request waits for a free slot before it is refused (503).
DOCUMENT_WAIT_SECONDS = 10.0
_document_slots = threading.BoundedSemaphore(MAX_CONCURRENT_DOCUMENTS)
CHUNK = 64 * 1024


class OpenDocument:
    """A document being passed through as it arrives (never buffered whole).
    ``chunks()`` yields it and then releases the connection and the slot;
    ``close()`` does the same if the response never starts."""

    def __init__(self, client: httpx.Client, response: httpx.Response, content_type: str, filename: str,
                 length: Optional[int], sha256: Optional[str]):
        self._client, self._response = client, response
        self.content_type, self.filename, self.length, self.sha256 = content_type, filename, length, sha256
        self._closed = False

    def chunks(self) -> Iterator[bytes]:
        sent = 0
        try:
            for chunk in self._response.iter_bytes(CHUNK):
                sent += len(chunk)
                if sent > MAX_DOCUMENT_BYTES:
                    # Too late for an error status: cut the response short.
                    raise RuntimeError("document larger than allowed")
                yield chunk
        finally:
            self.close()

    def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        try:
            self._response.close()
            self._client.close()
        finally:
            _document_slots.release()


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


def open_document(hospital_id: str, kind: str) -> OpenDocument:
    """One of an application's four documents (PDF or image only), opened for
    streaming. At most MAX_CONCURRENT_DOCUMENTS at once; the caller must
    consume ``chunks()`` or call ``close()``."""
    _check_id(hospital_id)
    if kind not in DOCUMENT_KINDS:
        raise ApiError(404, "Document not found.", "NOT_FOUND")
    if not _document_slots.acquire(timeout=DOCUMENT_WAIT_SECONDS):
        raise ApiError(503, "Too many documents are being opened right now. Try again shortly.", "BUSY")
    client: Optional[httpx.Client] = None
    response: Optional[httpx.Response] = None
    try:
        client = _client()
        request = client.build_request("GET", f"/platform/applications/{hospital_id}/documents/{kind}",
                                       headers={"Accept": "*/*"})
        response = client.send(request, stream=True)
        if response.status_code >= 400:
            response.read()
            raise _error(response)
        content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
        if content_type not in DOCUMENT_TYPES:
            raise ApiError(502, "The document is not a PDF or an image; it is not shown here.",
                           "UPSTREAM_INVALID_TYPE")
        length_header = response.headers.get("content-length", "")
        length = int(length_header) if length_header.isdigit() else None
        if length is not None and length > MAX_DOCUMENT_BYTES:
            raise ApiError(502, "The document is too large.", "UPSTREAM_TOO_LARGE")
        sha256 = response.headers.get("x-sha256")
        opened = OpenDocument(client, response, content_type,
                              safe_filename(response.headers.get("content-disposition", ""), kind,
                                            DOCUMENT_TYPES[content_type]),
                              length, sha256 if sha256 and re.fullmatch(r"[0-9a-f]{64}", sha256) else None)
    except BaseException as exc:
        if response is not None:
            response.close()
        if client is not None:
            client.close()
        _document_slots.release()
        if isinstance(exc, httpx.TimeoutException):
            raise ApiError(504, "The hospital service did not answer in time.", "UPSTREAM_TIMEOUT") from exc
        if isinstance(exc, httpx.HTTPError):
            raise ApiError(502, UNREACHABLE, "UPSTREAM_UNAVAILABLE") from exc
        raise
    return opened
