"""Endod's service fee through the patient platform's admin API (the stub):
reading and changing the settings (a fresh code, a reason, validation, both
audit trails), the fee report per hospital, the entries, and settling owed
fees (a fresh code, a reference, all or nothing)."""

import json

import pytest
from conftest import events, make_admin, reauth, sign_in

TASH, BETHEL = "a1" * 16, "b2" * 16


@pytest.fixture
def admin(client, clock):
    _, secret = make_admin()
    headers = sign_in(client, clock, secret)
    return headers, secret


@pytest.fixture
def fresh(client, clock, admin):
    headers, secret = admin
    reauth(client, clock, secret, headers)
    return headers


def calls(stub, method=None):
    return [c for c in stub.app.state.calls if method is None or c[0] == method]


# --- settings --------------------------------------------------------------------------------

def test_read_the_settings_with_a_200_birr_example(client, platform_stub, admin):
    body = client.get("/fees", headers=admin[0]).json()
    assert body["enabled"] is True and body["flat_santim"] == 2500 and body["percent_bp"] == 0
    assert body["example"] == {"subtotal": 20000, "service_fee": 2500, "total": 22500}
    assert body["history"] == []


def test_a_change_needs_a_fresh_code_and_a_reason(client, platform_stub, admin, clock):
    headers, secret = admin
    change = {"enabled": True, "flat": "30.00", "percent": "1.5", "reason": "New pricing from the CEO."}
    resp = client.post("/fees", json=change, headers=headers)
    assert resp.status_code == 403 and resp.json()["error_code"] == "REAUTH_REQUIRED"
    assert calls(platform_stub, "PUT") == []
    reauth(client, clock, secret, headers)
    for bad in ({**change, "reason": "  "}, {**change, "flat": "1000.01"}, {**change, "flat": "-1"},
                {**change, "flat": "25.123"}, {**change, "percent": "20.5"},
                {"enabled": True, "flat": "0", "percent": "0", "reason": "Nothing at all."}):
        assert client.post("/fees", json=bad, headers=headers).status_code == 422, bad
    assert calls(platform_stub, "PUT") == []

    resp = client.post("/fees", json=change, headers=headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert (body["flat_santim"], body["percent_bp"], body["version"]) == (3000, 150, 1)
    assert body["example"] == {"subtotal": 20000, "service_fee": 3300, "total": 23300}
    # The admin's own email goes along as the actor, never one from the browser.
    [(method, path, params, sent)] = calls(platform_stub, "PUT")
    assert path == "/internal/admin/fees" and json.loads(sent) == {
        "enabled": True, "flat_santim": 3000, "percent_bp": 150, "reason": "New pricing from the CEO.",
        "actor_email": "ops@endod.example"}
    assert body["history"][0]["actor_email"] == "ops@endod.example"
    # Switched off: no amount needed.
    off = client.post("/fees", json={"enabled": False, "flat": "0", "reason": "Paused for the launch."},
                      headers=headers)
    assert off.status_code == 200 and off.json()["enabled"] is False and off.json()["example"]["service_fee"] == 0

    rows = events("fee_settings_change")
    assert [r[1] for r in rows] == ["pending", "success", "pending", "success"]
    first, done = json.loads(rows[0][4]), json.loads(rows[1][4])
    assert first["attempt"] == done["attempt"] and first["flat_santim"] == 3000 and first["percent_bp"] == 150
    assert first["reason"] == "New pricing from the CEO." and all(r[2] == "ops@endod.example" for r in rows)


def test_a_platform_failure_is_shown_and_audited(client, platform_stub, fresh, monkeypatch):
    from app import platform
    from app.errors import ApiError

    def unreachable(*args, **kwargs):
        raise ApiError(502, platform.UNREACHABLE, "UPSTREAM_UNAVAILABLE")

    monkeypatch.setattr(platform, "set_fees", unreachable)
    resp = client.post("/fees", json={"enabled": True, "flat": "25", "reason": "Try it."}, headers=fresh)
    assert resp.status_code == 502 and resp.json()["error"] == platform.UNREACHABLE
    rows = events("fee_settings_change")
    assert [r[1] for r in rows] == ["pending", "failure"]
    assert json.loads(rows[1][4])["error_class"] == "UPSTREAM_UNAVAILABLE"


def test_not_connected(client, platform_stub, admin, monkeypatch):
    monkeypatch.delenv("SUPERADMIN_API_KEY", raising=False)
    for path in ("/fees", "/fees/summary", "/fees/entries"):
        resp = client.get(path, headers=admin[0])
        assert resp.status_code == 503 and resp.json()["error_code"] == "PLATFORM_NOT_CONNECTED"


# --- the report --------------------------------------------------------------------------------

def test_summary_per_hospital_and_period(client, platform_stub, admin):
    body = client.get("/fees/summary", headers=admin[0]).json()
    [tash, bethel] = body["hospitals"]
    assert tash["hospital_name"] == "Tikur Anbessa Specialized Hospital"
    assert (tash["fees_collected"], tash["fees_owed"], tash["fees_settled"], tash["owed_entries"]) == (
        2500, 5000, 2500, 2)
    assert bethel["fees_owed"] == 2500 and body["totals"]["fees_owed"] == 7500
    period = client.get("/fees/summary", params={"from": "2026-10-21", "to": "2026-10-22"}, headers=admin[0])
    assert [h["payments"] for h in period.json()["hospitals"]] == [2]
    assert calls(platform_stub)[-1][2] == {"from": "2026-10-21", "to": "2026-10-22"}
    assert client.get("/fees/summary", params={"from": "2026-10-22", "to": "2026-10-21"},
                      headers=admin[0]).status_code == 400
    assert client.get("/fees/summary", params={"from": "yesterday"}, headers=admin[0]).status_code == 422


def test_entries_are_filtered_and_only_ledger_fields(client, platform_stub, admin):
    platform_stub.app.state.leak = True
    resp = client.get("/fees/entries", params={"hospital_id": TASH, "status": "owed"}, headers=admin[0])
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2 and {e["settlement_status"] for e in body["items"]} == {"owed"}
    assert "LEAKED" not in resp.text and "items" not in body["items"][0]
    for params in ({"status": "lost"}, {"source": "wallet"}, {"hospital_id": "../x"}, {"limit": 0}):
        assert client.get("/fees/entries", params=params, headers=admin[0]).status_code in (400, 422), params


# --- settlement ------------------------------------------------------------------------------

def test_settle_owed_fees(client, platform_stub, admin, clock):
    headers, secret = admin
    owed = [e["id"] for e in client.get("/fees/entries", params={"hospital_id": TASH, "status": "owed"},
                                         headers=headers).json()["items"]]
    body = {"hospital_id": TASH, "entry_ids": owed, "reference": "BANK-2026-11-03"}
    assert client.post("/fees/settle", json=body, headers=headers).status_code == 403
    reauth(client, clock, secret, headers)
    for bad in ({**body, "reference": " "}, {**body, "entry_ids": []}, {**body, "entry_ids": ["../x"]},
                {**body, "hospital_id": "a/b"}):
        assert client.post("/fees/settle", json=bad, headers=headers).status_code == 422, bad
    resp = client.post("/fees/settle", json=body, headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["settled"] == 2 and resp.json()["amount"] == 5000
    [(method, path, params, sent)] = calls(platform_stub, "POST")[-1:]
    assert json.loads(sent)["actor_email"] == "ops@endod.example"
    # All or nothing: settled ones, or another hospital's, are refused (and nothing changes).
    again = client.post("/fees/settle", json=body, headers=headers)
    assert again.status_code == 409 and "not owed" in again.json()["error"]
    bethel = client.get("/fees/entries", params={"hospital_id": BETHEL}, headers=headers).json()["items"]
    mixed = client.post("/fees/settle", json={**body, "entry_ids": [bethel[0]["id"]]}, headers=headers)
    assert mixed.status_code == 409
    summary = client.get("/fees/summary", headers=headers).json()["hospitals"]
    assert {h["hospital_id"]: h["fees_owed"] for h in summary} == {TASH: 0, BETHEL: 2500}
    rows = events("fee_settle")
    assert [r[1] for r in rows] == ["pending", "success", "pending", "failure", "pending", "failure"]
    assert json.loads(rows[0][4])["reference"] == "BANK-2026-11-03" and rows[0][3] == TASH
    assert json.loads(rows[3][4])["error_class"] == "UPSTREAM_409"


def test_audit_log_lists_the_fee_actions(client, platform_stub, admin):
    body = client.get("/audit", headers=admin[0]).json()
    assert {"fee_settings_change", "fee_settle"} <= set(body["actions"])
