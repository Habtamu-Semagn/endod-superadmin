"""The patient platform's admin API (internal-api's ``/internal/admin/...``),
called with ``X-Superadmin-Key``.

It answers with account data and counts only: never health data. The key
stays in this process: it is never returned, logged, or put in an error
message. Without SUPERADMIN_API_KEY every call answers 503 ("not connected") and
the hospital and company sides are untouched.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

import httpx

from app.config import get_settings
from app.errors import ApiError

#: Tests swap in an httpx.MockTransport.
transport: Optional[httpx.BaseTransport] = None

#: An Endod ID (the patient's public id): DE and six digits.
DEDAN_ID = r"^DE[0-9]{6}$"

NOT_CONNECTED = "The patient platform is not connected yet: its admin key (SUPERADMIN_API_KEY) is not set here."
UNREACHABLE = "The patient platform is not reachable. Try again shortly."


def configured() -> bool:
    return bool(get_settings().SUPERADMIN_API_KEY)


def check_id(dedan_id: str) -> str:
    value = (dedan_id or "").strip().upper()
    if not re.fullmatch(DEDAN_ID, value):
        raise ApiError(404, "Not found.", "NOT_FOUND")
    return value


def _client() -> httpx.Client:
    settings = get_settings()
    if not settings.SUPERADMIN_API_KEY:
        raise ApiError(503, NOT_CONNECTED, "PLATFORM_NOT_CONNECTED")
    return httpx.Client(
        base_url=settings.PLATFORM_API_URL,
        headers={"X-Superadmin-Key": settings.SUPERADMIN_API_KEY, "Accept": "application/json"},
        timeout=settings.PLATFORM_API_TIMEOUT,
        follow_redirects=False,
        transport=transport,
    )


def _message(response: httpx.Response) -> Optional[str]:
    """The platform answers errors as ``{"detail": "..."}`` (FastAPI)."""
    try:
        body = response.json()
    except ValueError:
        return None
    if isinstance(body, dict) and isinstance(body.get("detail"), str):
        return body["detail"][:500]
    return None


def _error(response: httpx.Response) -> ApiError:
    status = response.status_code
    message = _message(response)
    if status in (401, 403):
        # Never passed on as 401: that would end the admin's own session.
        return ApiError(502, "The patient platform refused Endod's admin key. Check SUPERADMIN_API_KEY.",
                        "UPSTREAM_AUTH")
    if status == 503:
        return ApiError(503, "The patient platform has no usable admin key (SUPERADMIN_API_KEY) yet.", "UPSTREAM_503")
    if status in (400, 404, 409, 422):
        return ApiError(status, message or f"The patient platform refused the request ({status}).",
                        f"UPSTREAM_{status}")
    return ApiError(502, f"The patient platform failed ({status}). Try again shortly.", "UPSTREAM_ERROR")


def _call(method: str, path: str, json: Optional[Dict[str, Any]] = None,
          params: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    try:
        with _client() as client:
            response = client.request(method, path, json=json, params=params)
    except httpx.TimeoutException as exc:
        raise ApiError(504, "The patient platform did not answer in time.", "UPSTREAM_TIMEOUT") from exc
    except httpx.HTTPError as exc:
        raise ApiError(502, UNREACHABLE, "UPSTREAM_UNAVAILABLE") from exc
    if response.status_code >= 400:
        raise _error(response)
    try:
        body = response.json()
    except ValueError as exc:
        raise ApiError(502, "Unexpected answer from the patient platform.", "UPSTREAM_INVALID") from exc
    if not isinstance(body, dict):
        raise ApiError(502, "Unexpected answer from the patient platform.", "UPSTREAM_INVALID")
    return body


#: What an account answer may hold; anything else the platform sent is dropped
#: (defence in depth: no health field can reach the browser through here).
ACCOUNT_FIELDS = (
    "dedan_id", "name", "phone", "email", "created_at", "last_sign_in_at", "status",
    "linked_hospitals", "suspended_at", "suspended_reason", "suspended_by",
)
STATS_FIELDS = ("users_total", "users_new_7d", "users_suspended", "bookings_today", "bookings_week",
                "open_prescriptions", "generated_at")
CARD_FIELDS = ("dedan_id", "issued_at", "account_status", "signing_available", "signature_checked",
               "signature_valid", "valid")


def _only(body: Dict[str, Any], fields) -> Dict[str, Any]:
    return {key: body.get(key) for key in fields}


def stats() -> Dict[str, Any]:
    return _only(_call("GET", "/internal/admin/stats"), STATS_FIELDS)


def search(query: str) -> Dict[str, Any]:
    # In the body, not the URL: no access log keeps what was searched.
    body = _call("POST", "/internal/admin/users/search", json={"query": query})
    items = body.get("items")
    if not isinstance(items, list):
        raise ApiError(502, "Unexpected answer from the patient platform.", "UPSTREAM_INVALID")
    return {"items": [_only(item, ACCOUNT_FIELDS) for item in items if isinstance(item, dict)],
            "limit": body.get("limit")}


def account(dedan_id: str) -> Dict[str, Any]:
    return _only(_call("GET", f"/internal/admin/users/{check_id(dedan_id)}"), ACCOUNT_FIELDS)


def suspend(dedan_id: str, reason: str, actor_email: str) -> Dict[str, Any]:
    return _only(_call("POST", f"/internal/admin/users/{check_id(dedan_id)}/suspend",
                       json={"reason": reason, "actor_email": actor_email}), ACCOUNT_FIELDS)


def reactivate(dedan_id: str, reason: str, actor_email: str) -> Dict[str, Any]:
    return _only(_call("POST", f"/internal/admin/users/{check_id(dedan_id)}/reactivate",
                       json={"reason": reason, "actor_email": actor_email}), ACCOUNT_FIELDS)


def card(dedan_id: str, signature: Optional[str]) -> Dict[str, Any]:
    params = {"s": signature} if signature else None
    return _only(_call("GET", f"/internal/admin/cards/{check_id(dedan_id)}", params=params), CARD_FIELDS)


def health() -> Dict[str, Any]:
    """The platform's own report (database, Redis, worker, dead letters, outbox)."""
    return _call("GET", "/internal/admin/health")


# --- Endod's service fee (the platform's docs/service-fee.md) --------------------------------

FEE_FIELDS = ("enabled", "flat_santim", "percent_bp", "version", "updated_at", "updated_by", "currency", "example",
              "limits", "history")
SUMMARY_FIELDS = ("currency", "from", "to", "timezone", "hospitals", "totals")
ENTRY_FIELDS = ("id", "source_type", "source_id", "hospital_id", "hospital_name", "dedan_id", "subtotal", "fee",
                "total", "currency", "method", "reference", "collected_by", "paid_at", "settlement_status",
                "settled_at", "settlement_reference", "settled_by")
SETTLED_FIELDS = ("hospital_id", "settled", "amount", "currency", "reference", "settled_at")


def fees() -> Dict[str, Any]:
    return _only(_call("GET", "/internal/admin/fees"), FEE_FIELDS)


def set_fees(enabled: bool, flat_santim: int, percent_bp: int, reason: str, actor_email: str) -> Dict[str, Any]:
    return _only(_call("PUT", "/internal/admin/fees", json={
        "enabled": enabled, "flat_santim": flat_santim, "percent_bp": percent_bp, "reason": reason,
        "actor_email": actor_email}), FEE_FIELDS)


def _params(values: Dict[str, Any]) -> Dict[str, str]:
    return {key: str(value) for key, value in values.items() if value is not None and value != ""}


def fee_summary(start: Optional[str], end: Optional[str]) -> Dict[str, Any]:
    return _only(_call("GET", "/internal/admin/fees/summary", params=_params({"from": start, "to": end})),
                 SUMMARY_FIELDS)


def fee_entries(**filters: Any) -> Dict[str, Any]:
    body = _call("GET", "/internal/admin/fees/entries", params=_params(filters))
    items = body.get("items")
    if not isinstance(items, list):
        raise ApiError(502, "Unexpected answer from the patient platform.", "UPSTREAM_INVALID")
    return {"items": [_only(i, ENTRY_FIELDS) for i in items if isinstance(i, dict)], "total": body.get("total"),
            "limit": body.get("limit"), "offset": body.get("offset")}


def settle_fees(hospital_id: str, entry_ids: List[str], reference: str, actor_email: str) -> Dict[str, Any]:
    return _only(_call("POST", "/internal/admin/fees/settle", json={
        "hospital_id": hospital_id, "entry_ids": entry_ids, "reference": reference, "actor_email": actor_email}),
        SETTLED_FIELDS)
