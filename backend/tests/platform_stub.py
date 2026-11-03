"""A tiny stand-in for the patient platform's admin API (internal-api's
``/internal/admin/...``, dedan-health backend-v2/dedan_platform/api_admin.py).

It answers in the same shapes and with the same rules: every call needs the
right X-Superadmin-Key (401 otherwise), errors are ``{"detail": "..."}``,
suspending a suspended account or reactivating an active one is 409, a reason
and an actor email are required (422), unknown Endod IDs are 404, and the
search matches name, phone, email or Endod ID literally.

Used by the pytest suite (through httpx, see conftest.py) and, as a real
server, by the browser tests:

    python tests/platform_stub.py <port>
"""

from __future__ import annotations

import copy
import os
import sys
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

KEY = os.environ.get("STUB_SUPERADMIN_API_KEY", "test-admin-api-key-0123456789abcdefghij")

ALMAZ = "DE100001"
BEKELE = "DE100002"
CHALTU = "DE100003"  # already suspended
DAWIT = "DE100004"   # a closed account


def signature(dedan_id: str) -> str:
    """The stub's card signature (the real one is an HMAC; see cards.py)."""
    return f"sig-{dedan_id.lower()}"


def _account(dedan_id: str, name: str, phone: str, email: Optional[str], created: str, *,
             status: str = "active", linked: int = 0, last: Optional[str] = None,
             reason: Optional[str] = None) -> Dict[str, Any]:
    return {
        "dedan_id": dedan_id, "name": name, "phone": phone, "email": email, "created_at": created,
        "last_sign_in_at": last, "status": status, "linked_hospitals": linked,
        "suspended_at": "2026-10-20T08:00:00+00:00" if status == "suspended" else None,
        "suspended_reason": reason, "suspended_by": "earlier@endod.example" if status == "suspended" else None,
    }


def initial_state() -> Dict[str, Dict[str, Any]]:
    rows = [
        _account(ALMAZ, "Almaz Tefera", "+251911223344", "almaz@example.com", "2026-10-25T07:00:00+00:00",
                 linked=2, last="2026-10-27T09:30:00+00:00"),
        _account(BEKELE, "Bekele Girma", "+251922334455", "bekele@example.com", "2026-09-01T07:00:00+00:00"),
        _account(CHALTU, "Chaltu Abdi", "+251933445566", None, "2026-08-01T07:00:00+00:00", status="suspended",
                 reason="Reported for fake bookings."),
        _account(DAWIT, "Dawit Mekonnen", "+251944556677", "dawit@example.com", "2026-07-01T07:00:00+00:00",
                 status="deactivated"),
    ]
    return {row["dedan_id"]: row for row in rows}


# --- Endod's service fee (api_admin.py's /internal/admin/fees) ----------------------------

TASH = "a1" * 16  # Tikur Anbessa
BETHEL = "b2" * 16
HOSPITAL_NAMES = {TASH: "Tikur Anbessa Specialized Hospital", BETHEL: "Bethel Teaching Hospital"}
ACTOR = "earlier@endod.example"


def _entry(n: int, hospital: str, source: str, subtotal: int, fee: int, method: str, collected_by: str,
           status: str, paid_at: str) -> Dict[str, Any]:
    settled = status == "settled"
    return {"id": f"{n:032x}", "source_type": source, "source_id": f"src-{n}", "hospital_id": hospital,
            "hospital_name": HOSPITAL_NAMES[hospital], "dedan_id": ALMAZ if n % 2 else None, "subtotal": subtotal,
            "fee": fee, "total": subtotal + fee, "currency": "ETB", "method": method,
            "reference": f"RCPT-{n}" if method != "chapa" else "APabc123", "collected_by": collected_by,
            "paid_at": paid_at, "settlement_status": status,
            "settled_at": "2026-10-30T08:00:00+00:00" if settled else None,
            "settlement_reference": "BANK-OLD-1" if settled else None, "settled_by": ACTOR if settled else None}


def initial_ledger() -> List[Dict[str, Any]]:
    return [
        _entry(1, TASH, "booking", 15000, 2500, "chapa", "endod", "collected", "2026-10-20T07:00:00+00:00"),
        _entry(2, TASH, "booking", 15000, 2500, "cash", "hospital", "owed", "2026-10-21T07:00:00+00:00"),
        _entry(3, TASH, "charge", 35000, 2500, "mobile_money", "hospital", "owed", "2026-10-22T07:00:00+00:00"),
        _entry(4, TASH, "charge", 20000, 2500, "card", "hospital", "settled", "2026-10-10T07:00:00+00:00"),
        _entry(5, BETHEL, "charge", 80000, 2500, "cash", "hospital", "owed", "2026-10-23T07:00:00+00:00"),
    ]


def initial_fees() -> Dict[str, Any]:
    return {"enabled": True, "flat_santim": 2500, "percent_bp": 0, "version": 0, "updated_at": None,
            "updated_by": None, "history": []}


def _fee_for(subtotal: int, fees: Dict[str, Any]) -> int:
    if not fees["enabled"] or subtotal <= 0:
        return 0
    return fees["flat_santim"] + (subtotal * fees["percent_bp"] + 5000) // 10000


app = FastAPI(title="Patient platform admin stub")
app.state.users = initial_state()
app.state.fees = initial_fees()
app.state.ledger = initial_ledger()
app.state.calls = []
app.state.degraded = False
#: Tests set it to make the stub send fields the real API never does.
app.state.leak = False


def _err(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"detail": message})


@app.middleware("http")
async def admin_key(request: Request, call_next):
    if request.url.path.startswith("/internal/admin"):
        body = (await request.body()).decode("utf-8", "replace")
        app.state.calls.append((request.method, request.url.path, dict(request.query_params), body))
        if request.headers.get("x-superadmin-key") != KEY:
            return _err(401, "Not authorised.")
    return await call_next(request)


@app.get("/health")
def health():
    return {"status": "healthy", "service": "Endod internal API"}


@app.post("/__reset")
def reset():
    app.state.users = initial_state()
    app.state.fees = initial_fees()
    app.state.ledger = initial_ledger()
    app.state.calls = []
    app.state.degraded = False
    app.state.leak = False
    return {"ok": True}


@app.post("/__degrade")
def degrade():
    app.state.degraded = True
    return {"ok": True}


def _out(row: Dict[str, Any]) -> Dict[str, Any]:
    body = copy.deepcopy(row)
    if app.state.leak:
        body.update({"internal_user_id": "f" * 32, "health_profile": {"allergies": "LEAKED-ALLERGY"},
                     "records": [{"title": "LEAKED-RECORD"}]})
    return body


@app.get("/internal/admin/stats")
def stats():
    users = app.state.users.values()
    return {"users_total": len(app.state.users), "users_new_7d": 1,
            "users_suspended": sum(1 for u in users if u["status"] == "suspended"),
            "bookings_today": 4, "bookings_week": 17, "open_prescriptions": 9,
            "timezone": "Africa/Addis_Ababa", "generated_at": "2026-10-28T09:00:00+00:00"}


@app.post("/internal/admin/users/search")
async def search(request: Request):
    body = await request.json()
    query = body.get("query", "") if isinstance(body, dict) else ""
    value = (query if isinstance(query, str) else "").strip().lower()
    rows = sorted(app.state.users.values(), key=lambda u: u["created_at"], reverse=True)
    if value:
        rows = [u for u in rows if any(value in (u.get(k) or "").lower() for k in ("name", "phone", "email",
                                                                                    "dedan_id"))]
    return {"items": [_out(u) for u in rows[:50]], "limit": 50}


def _find(dedan_id: str) -> Optional[Dict[str, Any]]:
    return app.state.users.get(dedan_id.upper())


@app.get("/internal/admin/users/{dedan_id}")
def read(dedan_id: str):
    row = _find(dedan_id)
    return _out(row) if row else _err(404, "Account not found.")


async def _action(request: Request) -> Optional[Dict[str, str]]:
    try:
        body = await request.json()
    except ValueError:
        return None
    if not isinstance(body, dict):
        return None
    reason = (body.get("reason") or "").strip() if isinstance(body.get("reason"), str) else ""
    actor = body.get("actor_email") if isinstance(body.get("actor_email"), str) else ""
    if len(reason) < 3 or "@" not in actor:
        return None
    return {"reason": reason, "actor": actor}


@app.post("/internal/admin/users/{dedan_id}/suspend")
async def suspend(dedan_id: str, request: Request):
    action = await _action(request)
    if action is None:
        return JSONResponse(status_code=422, content={"detail": "reason and actor_email are required"})
    row = _find(dedan_id)
    if row is None:
        return _err(404, "Account not found.")
    if row["status"] == "deactivated":
        return _err(409, "This account is closed.")
    if row["status"] == "suspended":
        return _err(409, "This account is already suspended.")
    row.update({"status": "suspended", "suspended_at": "2026-10-28T09:00:00+00:00",
                "suspended_reason": action["reason"], "suspended_by": action["actor"]})
    return _out(row)


@app.post("/internal/admin/users/{dedan_id}/reactivate")
async def reactivate(dedan_id: str, request: Request):
    action = await _action(request)
    if action is None:
        return JSONResponse(status_code=422, content={"detail": "reason and actor_email are required"})
    row = _find(dedan_id)
    if row is None:
        return _err(404, "Account not found.")
    if row["status"] != "suspended":
        return _err(409, "This account is not suspended.")
    row.update({"status": "active", "suspended_at": None, "suspended_reason": None, "suspended_by": None})
    return _out(row)


@app.get("/internal/admin/cards/{dedan_id}")
def card(dedan_id: str, s: str = ""):
    row = _find(dedan_id)
    if row is None:
        return _err(404, "No account has this Endod ID.")
    valid_signature = None if not s else s == signature(row["dedan_id"])
    return {"dedan_id": row["dedan_id"], "issued_at": row["created_at"], "account_status": row["status"],
            "signing_available": True, "signature_checked": bool(s), "signature_valid": valid_signature,
            "valid": row["status"] == "active" and valid_signature is not False}


@app.get("/internal/admin/health")
def admin_health():
    degraded = app.state.degraded
    return {
        "status": "degraded" if degraded else "ok", "checked_at": "2026-10-28T09:00:00+00:00",
        "database": {"ok": True}, "redis": {"configured": True, "ok": True},
        "dead_letters": 2 if degraded else 0,
        "events_worker": {"last_heartbeat": "2026-10-28T08:59:50+00:00", "ok": not degraded},
        "outbox": {"backlog": 3, "oldest_at": "2026-10-28T08:59:00+00:00"},
    }


def _fees_view() -> Dict[str, Any]:
    fees = app.state.fees
    fee = _fee_for(20000, fees)
    keys = ("enabled", "flat_santim", "percent_bp", "version", "updated_at", "updated_by")
    return {**{k: fees[k] for k in keys}, "currency": "ETB",
            "example": {"subtotal": 20000, "service_fee": fee, "total": 20000 + fee},
            "limits": {"max_flat_santim": 100000, "max_percent_bp": 2000},
            "history": list(reversed(fees["history"]))[:20]}


@app.get("/internal/admin/fees")
def read_fees():
    return _fees_view()


@app.put("/internal/admin/fees")
async def change_fees(request: Request):
    try:
        body = await request.json()
    except ValueError:
        body = None
    if not isinstance(body, dict):
        return JSONResponse(status_code=422, content={"detail": "a JSON object is required"})
    flat, bp, enabled = body.get("flat_santim"), body.get("percent_bp", 0), body.get("enabled")
    reason = body.get("reason") if isinstance(body.get("reason"), str) else ""
    actor = body.get("actor_email") if isinstance(body.get("actor_email"), str) else ""
    if (not isinstance(enabled, bool) or type(flat) is not int or type(bp) is not int or not 0 <= flat <= 100000
            or not 0 <= bp <= 2000 or len(reason.strip()) < 3 or "@" not in actor):
        return JSONResponse(status_code=422, content={"detail": "invalid fee settings"})
    if enabled and flat == 0 and bp == 0:
        return _err(422, "An enabled fee needs a flat amount or a percentage (or switch the fee off).")
    fees = app.state.fees
    before = {k: fees[k] for k in ("enabled", "flat_santim", "percent_bp")}
    fees.update({"enabled": enabled, "flat_santim": flat, "percent_bp": bp, "version": fees["version"] + 1,
                 "updated_at": "2026-11-03T09:00:00+00:00", "updated_by": actor})
    fees["history"].append({"version": fees["version"], "changed_at": "2026-11-03T09:00:00+00:00",
                            "actor_email": actor, "reason": reason.strip(), "before": before,
                            "after": {"enabled": enabled, "flat_santim": flat, "percent_bp": bp}})
    return _fees_view()


def _in_period(entry: Dict[str, Any], start: Optional[str], end: Optional[str]) -> bool:
    day = entry["paid_at"][:10]
    return (not start or day >= start) and (not end or day <= end)


@app.get("/internal/admin/fees/summary")
def fee_summary(request: Request):
    start, end = request.query_params.get("from"), request.query_params.get("to")
    rows: Dict[str, Dict[str, Any]] = {}
    for e in app.state.ledger:
        if not _in_period(e, start, end):
            continue
        row = rows.setdefault(e["hospital_id"], {
            "hospital_id": e["hospital_id"], "hospital_name": e["hospital_name"], "payments": 0, "subtotal": 0,
            "fees_collected": 0, "fees_owed": 0, "fees_settled": 0, "fees_refunded": 0, "owed_entries": 0,
            "fees_total": 0})
        row["payments"] += 1
        row["subtotal"] += e["subtotal"]
        row["fees_" + e["settlement_status"]] += e["fee"]
        if e["settlement_status"] == "owed":
            row["owed_entries"] += 1
        if e["settlement_status"] != "refunded":
            row["fees_total"] += e["fee"]
    hospitals = sorted(rows.values(), key=lambda h: (-h["fees_owed"], h["hospital_name"]))
    totals = {k: sum(h[k] for h in hospitals) for k in ("payments", "subtotal", "fees_collected", "fees_owed",
                                                        "fees_settled", "fees_refunded", "fees_total")}
    return {"currency": "ETB", "from": start, "to": end, "timezone": "Africa/Addis_Ababa", "hospitals": hospitals,
            "totals": totals}


@app.get("/internal/admin/fees/entries")
def fee_entries(request: Request):
    q = request.query_params
    rows = [e for e in app.state.ledger if _in_period(e, q.get("from"), q.get("to"))
            and (not q.get("hospital_id") or e["hospital_id"] == q.get("hospital_id"))
            and (not q.get("status") or e["settlement_status"] == q.get("status"))
            and (not q.get("source") or e["source_type"] == q.get("source"))]
    rows.sort(key=lambda e: e["paid_at"], reverse=True)
    limit, offset = int(q.get("limit", 100)), int(q.get("offset", 0))
    out = [dict(e) for e in rows[offset:offset + limit]]
    if app.state.leak:
        for e in out:
            e.update({"items": [{"name": "LEAKED-TEST"}], "health_profile": "LEAKED"})
    return {"items": out, "total": len(rows), "limit": limit, "offset": offset}


@app.post("/internal/admin/fees/settle")
async def settle(request: Request):
    body = await request.json()
    hospital, ids = body.get("hospital_id"), body.get("entry_ids") or []
    reference, actor = (body.get("reference") or "").strip(), body.get("actor_email") or ""
    if not ids or len(reference) < 2 or "@" not in actor:
        return JSONResponse(status_code=422, content={"detail": "entry_ids, reference and actor_email are required"})
    found = {e["id"]: e for e in app.state.ledger}
    if any(i not in found or found[i]["hospital_id"] != hospital for i in ids):
        return _err(409, "Some of these entries are not this hospital's.")
    if any(found[i]["settlement_status"] != "owed" for i in ids):
        return _err(409, "Some of these entries are not owed (already settled, collected online or refunded). "
                         "Reload and try again.")
    for i in ids:
        found[i].update({"settlement_status": "settled", "settled_at": "2026-11-03T09:00:00+00:00",
                         "settlement_reference": reference, "settled_by": actor})
    return {"hospital_id": hospital, "settled": len(ids), "amount": sum(found[i]["fee"] for i in ids),
            "currency": "ETB", "reference": reference, "settled_at": "2026-11-03T09:00:00+00:00"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=int(sys.argv[1]) if len(sys.argv) > 1 else 8134, log_level="warning")
