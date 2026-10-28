"""Patient accounts, digital cards, the dashboard's platform counts and system
monitoring, through the patient platform's admin API (the stub)."""

import json

import httpx
import pytest
from conftest import SUPERADMIN_API_KEY, events, make_admin, reauth, sign_in

HEALTH_WORDS = ("allerg", "health_profile", "records", "LEAKED", "internal_user_id", "medication", "condition")


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


# --- accounts ----------------------------------------------------------------------------

def test_search(client, platform_stub, admin):
    body = client.get("/patients", headers=admin[0]).json()
    assert [r["dedan_id"] for r in body["items"]] == ["DE100001", "DE100002", "DE100003", "DE100004"]
    found = client.get("/patients", params={"query": "girma"}, headers=admin[0]).json()["items"]
    assert [r["name"] for r in found] == ["Bekele Girma"]
    # The query goes to the platform as a parameter, with the admin key.
    method, path, params = platform_stub.app.state.calls[-1]
    assert (method, path, params) == ("GET", "/internal/admin/users", {"query": "girma"})
    assert client.get("/patients", params={"query": "x" * 101}, headers=admin[0]).status_code == 422
    searches = events("patient_search")
    assert [json.loads(e[4])["query"] for e in searches] == ["", "girma"]
    assert all(e[1] == "success" and e[2] == "ops@endod.example" for e in searches)


def test_detail_is_account_data_only(client, platform_stub, admin):
    one = client.get("/patients/DE100001", headers=admin[0])
    assert one.status_code == 200
    assert set(one.json()) == {"dedan_id", "name", "phone", "email", "created_at", "last_sign_in_at", "status",
                               "linked_hospitals", "suspended_at", "suspended_reason", "suspended_by"}
    assert one.json()["linked_hospitals"] == 2
    # Lower case works; anything else never reaches the platform.
    assert client.get("/patients/de100001", headers=admin[0]).status_code == 200
    before = len(platform_stub.app.state.calls)
    for bad in ("DE10000", "XX100001", "DE1000011", "..%2Fstats"):
        assert client.get(f"/patients/{bad}", headers=admin[0]).status_code in (404, 422)
    assert len(platform_stub.app.state.calls) == before
    assert client.get("/patients/DE999999", headers=admin[0]).status_code == 404
    viewed = events("patient_view")
    assert [(e[1], e[3]) for e in viewed] == [("success", "DE100001"), ("success", "DE100001"),
                                              ("failure", "DE999999")]


def test_health_fields_are_dropped_even_if_the_platform_sent_them(client, platform_stub, admin, fresh):
    platform_stub.app.state.leak = True
    answers = [
        client.get("/patients", headers=admin[0]),
        client.get("/patients/DE100001", headers=admin[0]),
        client.post("/patients/DE100002/suspend", json={"reason": "Abuse of the booking system."},
                    headers=fresh),
        client.post("/patients/DE100002/reactivate", json={"reason": "Cleared after review."}, headers=fresh),
        client.get("/cards/DE100001", headers=admin[0]),
        client.get("/dashboard", headers=admin[0]),
    ]
    for resp in answers:
        assert resp.status_code == 200, resp.text
        for word in HEALTH_WORDS:
            assert word not in resp.text, (resp.request.url, word)


def test_suspend_and_reactivate_need_a_fresh_code_and_a_reason(client, platform_stub, admin, clock):
    headers, secret = admin
    resp = client.post("/patients/DE100001/suspend", json={"reason": "Abuse."}, headers=headers)
    assert resp.status_code == 403 and resp.json()["error_code"] == "REAUTH_REQUIRED"
    assert not any(c[0] == "POST" for c in platform_stub.app.state.calls)
    reauth(client, clock, secret, headers)
    for body in ({}, {"reason": "  "}, {"reason": "x" * 501}):
        assert client.post("/patients/DE100001/suspend", json=body, headers=headers).status_code == 422

    resp = client.post("/patients/DE100001/suspend", json={"reason": "Fake bookings at two hospitals."},
                       headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "suspended"
    # The admin's own email goes along as the actor, never one from the browser.
    assert resp.json()["suspended_by"] == "ops@endod.example"
    again = client.post("/patients/DE100001/suspend", json={"reason": "Again."}, headers=headers)
    assert again.status_code == 409 and again.json()["error"] == "This account is already suspended."

    resp = client.post("/patients/DE100001/reactivate", json={"reason": "Cleared by the hospitals."},
                       headers=headers)
    assert resp.status_code == 200 and resp.json()["status"] == "active"
    closed = client.post("/patients/DE100004/suspend", json={"reason": "Abuse."}, headers=headers)
    assert closed.status_code == 409 and closed.json()["error"] == "This account is closed."

    suspended = events("patient_suspend")
    assert [(e[1], e[3]) for e in suspended] == [("success", "DE100001"), ("failure", "DE100001"),
                                                 ("failure", "DE100004")]
    assert json.loads(suspended[0][4]) == {"reason": "Fake bookings at two hospitals."}
    assert suspended[0][2] == "ops@endod.example"
    reactivated = events("patient_reactivate")
    assert [(e[1], json.loads(e[4])["reason"]) for e in reactivated] == [("success", "Cleared by the hospitals.")]


def test_the_admin_key_goes_with_every_call_and_never_back(client, platform_stub, admin, monkeypatch):
    monkeypatch.setenv("SUPERADMIN_API_KEY", "a-wrong-admin-key-0123456789abcdefghij")
    resp = client.get("/patients", headers=admin[0])
    assert resp.status_code == 502 and resp.json()["error_code"] == "UPSTREAM_AUTH"
    assert "a-wrong-admin-key" not in resp.text and SUPERADMIN_API_KEY not in resp.text
    # The admin is still signed in.
    assert client.get("/auth/me", headers=admin[0]).status_code == 200


def test_not_connected(client, platform_stub, admin, monkeypatch):
    monkeypatch.delenv("SUPERADMIN_API_KEY")
    for path in ("/patients", "/patients/DE100001", "/cards/DE100001"):
        resp = client.get(path, headers=admin[0])
        assert resp.status_code == 503 and resp.json()["error_code"] == "PLATFORM_NOT_CONNECTED"
    resp = client.post("/patients/DE100001/suspend", json={"reason": "Abuse."}, headers=admin[0])
    assert resp.status_code == 503
    assert platform_stub.app.state.calls == []
    body = client.get("/dashboard", headers=admin[0]).json()
    assert body["platform_connected"] is False and body["platform"] is None and body["errors"] == []


def test_unreachable_platform(client, admin, monkeypatch):
    from app import platform

    def refuse(request):
        raise httpx.ConnectError("refused", request=request)

    monkeypatch.setattr(platform, "transport", httpx.MockTransport(refuse))
    resp = client.get("/patients", headers=admin[0])
    assert resp.status_code == 502 and resp.json()["error_code"] == "UPSTREAM_UNAVAILABLE"
    body = client.get("/dashboard", headers=admin[0]).json()
    assert body["platform"] is None and "The patient platform is not reachable" in body["errors"][0]


# --- digital cards -----------------------------------------------------------------------

def test_card_check(client, platform_stub, admin):
    plain = client.get("/cards/DE100001", headers=admin[0]).json()
    assert plain["valid"] is True and plain["signature_checked"] is False
    signed = client.get("/cards/DE100001", params={"s": platform_stub.signature("DE100001")},
                        headers=admin[0]).json()
    assert signed["valid"] is True and signed["signature_valid"] is True
    forged = client.get("/cards/DE100001", params={"s": "sig-de100002"}, headers=admin[0]).json()
    assert forged["valid"] is False and forged["signature_valid"] is False
    suspended = client.get("/cards/DE100003", headers=admin[0]).json()
    assert suspended["valid"] is False and suspended["account_status"] == "suspended"
    assert client.get("/cards/DE999999", headers=admin[0]).status_code == 404
    assert client.get("/cards/DE100001", params={"s": "<script>"}, headers=admin[0]).status_code == 422
    checks = events("card_check")
    assert len(checks) == 5 and checks[-1][1] == "failure"
    assert json.loads(checks[1][4]) == {"signature_given": True}


# --- dashboard ---------------------------------------------------------------------------

def test_dashboard_counts_everything(client, admin):
    body = client.get("/dashboard", headers=admin[0]).json()
    assert body["errors"] == []
    assert body["approved_hospitals"] == 1 and body["pending_hospitals"] == 4
    assert body["pending_applications"] == 3
    assert body["approved_companies"] == 1  # Ethio (Dormant is suspended)
    assert body["pending_company_applications"] == 3
    assert [a["legal_name"] for a in body["awaiting_company_review"]][0]
    assert body["platform_connected"] is True
    assert body["platform"] == {"users_total": 4, "users_new_7d": 1, "users_suspended": 1, "bookings_today": 4,
                                "bookings_week": 17, "open_prescriptions": 9,
                                "generated_at": "2026-10-28T09:00:00+00:00"}


# --- system monitoring -------------------------------------------------------------------

def test_system_health(client, platform_stub, admin):
    body = client.get("/system/health", headers=admin[0]).json()
    services = {s["id"]: s for s in body["services"]}
    assert list(services) == ["platform", "hospital", "tenacare", "admin"]
    assert all(s["ok"] for s in services.values()) and body["ok"] is True
    report = services["platform"]["report"]
    assert report == {"available": True, "status": "ok", "database_ok": True, "redis_configured": True,
                      "redis_ok": True, "worker_last_heartbeat": "2026-10-28T08:59:50+00:00", "worker_ok": True,
                      "dead_letters": 0, "outbox_backlog": 3, "outbox_oldest_at": "2026-10-28T08:59:00+00:00"}
    assert all(s["checked_at"] == body["checked_at"] for s in services.values())
    # No key or URL in the answer.
    for secret in (SUPERADMIN_API_KEY, "test-platform-key", "test-org-platform-key", "http://"):
        assert secret not in json.dumps(body)

    platform_stub.app.state.degraded = True
    body = client.get("/system/health", headers=admin[0]).json()
    platform_row = body["services"][0]
    assert platform_row["ok"] is False and platform_row["report"]["worker_ok"] is False
    assert platform_row["report"]["dead_letters"] == 2 and body["ok"] is False


def test_system_health_when_services_are_down(client, admin, monkeypatch):
    from app import hospital, organisation, platform

    def refuse(request):
        raise httpx.ConnectError("refused", request=request)

    def broken(request):
        return httpx.Response(500, json={"error": "boom"})

    monkeypatch.setattr(hospital, "transport", httpx.MockTransport(refuse))
    monkeypatch.setattr(organisation, "transport", httpx.MockTransport(broken))
    monkeypatch.setattr(platform, "transport", httpx.MockTransport(refuse))
    body = client.get("/system/health", headers=admin[0]).json()
    services = {s["id"]: s for s in body["services"]}
    assert services["hospital"] == {**services["hospital"], "ok": False, "detail": "Not reachable."}
    assert services["tenacare"]["ok"] is False and services["tenacare"]["detail"] == "Answered 500."
    assert services["platform"]["ok"] is False
    assert services["admin"]["ok"] is True
    assert body["ok"] is False


def test_system_health_without_the_platform_key(client, admin, monkeypatch):
    monkeypatch.delenv("SUPERADMIN_API_KEY")
    body = client.get("/system/health", headers=admin[0]).json()
    platform_row = body["services"][0]
    assert platform_row["ok"] is True  # internal-api answers /health
    assert platform_row["report"]["available"] is False
