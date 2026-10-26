"""Company applications and companies through TenaCare's platform API (the stub
in tests/organisation_stub.py, built to docs/company-onboarding.md)."""

import json
import logging

import httpx
import pytest
from conftest import ORG_PLATFORM_KEY, PLATFORM_KEY, events, make_admin, reauth, sign_in


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


# --- applications ------------------------------------------------------------------------

def test_list_and_filter_applications(client, org_stub, admin):
    rows = client.get("/company-applications", headers=admin[0]).json()
    assert len(rows) == 6
    assert rows[0]["legal_name"] == "Evil Docs PLC"  # newest first, as TenaCare sends them
    assert rows[0]["contact"]["email"] == "hr@evil.example"
    submitted = client.get("/company-applications?status=submitted", headers=admin[0]).json()
    assert {r["legal_name"] for r in submitted} == {"Abay Manufacturing PLC", "Habesha Logistics Share Company",
                                                    "Evil Docs PLC"}
    assert ("GET", "/platform/applications") in org_stub.app.state.calls
    assert client.get("/company-applications?status=suspended", headers=admin[0]).status_code == 400


def test_application_detail(client, org_stub, admin):
    detail = client.get(f"/company-applications/{org_stub.ABAY}", headers=admin[0]).json()
    assert detail["business_license_number"] == "BL/ABAY/2026"
    assert detail["trade_name"] == "Abay Mfg"
    assert [d["kind"] for d in detail["documents"]] == ["trade_license", "tin_certificate", "authorization_letter"]


def test_unknown_application_is_404(client, org_stub, admin):
    resp = client.get(f"/company-applications/{'0' * 32}", headers=admin[0])
    assert resp.status_code == 404 and resp.json()["error"] == "Application not found."
    assert resp.json()["error_code"] == "UPSTREAM_404"


def test_ids_are_checked_before_anything_is_called(client, org_stub, admin, fresh):
    for path in ("/company-applications/..%2F..%2Fadmin", f"/company-applications/{'A' * 32}",
                 f"/company-applications/{'a' * 31}", f"/companies/{'g' * 32}/suspend"):
        method = "POST" if path.endswith("suspend") else "GET"
        assert client.request(method, path, headers=fresh).status_code in (404, 422)
    assert org_stub.app.state.calls == []


def test_approve_sends_the_reviewer_and_is_audited(client, org_stub, fresh):
    resp = client.post(f"/company-applications/{org_stub.ABAY}/approve", headers=fresh)
    assert resp.status_code == 200 and resp.json() == {"status": "approved"}
    assert org_stub.app.state.data["reviewers"] == [("approve", org_stub.ABAY, "ops@endod.example")]
    action, result, email, target, _ = events("company_approve")[0]
    assert (result, email, target) == ("success", "ops@endod.example", org_stub.ABAY)


def test_approve_twice_shows_tenacares_409(client, org_stub, fresh):
    assert client.post(f"/company-applications/{org_stub.ABAY}/approve", headers=fresh).status_code == 200
    resp = client.post(f"/company-applications/{org_stub.ABAY}/approve", headers=fresh)
    assert resp.status_code == 409 and resp.json()["error_code"] == "UPSTREAM_409"
    assert resp.json()["error"] == "Only a submitted application can be approved (status: approved)."
    assert [e[1] for e in events("company_approve")] == ["success", "failure"]
    assert json.loads(events("company_approve")[1][4])["status"] == 409


def test_reject_needs_a_reason_and_sends_it_with_the_reviewer(client, org_stub, fresh):
    url = f"/company-applications/{org_stub.HABESHA}/reject"
    assert client.post(url, json={"reason": "  "}, headers=fresh).status_code == 422
    assert client.post(url, json={}, headers=fresh).status_code == 422
    assert client.post(url, json={"reason": "x" * 1001}, headers=fresh).status_code == 422
    resp = client.post(url, json={"reason": "  The trade license has expired.  "}, headers=fresh)
    assert resp.status_code == 200 and resp.json() == {"status": "rejected"}
    assert org_stub.app.state.data["applications"][org_stub.HABESHA]["rejection_reason"] == \
        "The trade license has expired."
    assert org_stub.app.state.data["reviewers"] == [("reject", org_stub.HABESHA, "ops@endod.example")]
    _, result, _, _, detail = events("company_reject")[0]
    assert result == "success" and "expired" in detail
    again = client.post(url, json={"reason": "Again please."}, headers=fresh)
    assert again.status_code == 409 and "status: rejected" in again.json()["error"]


def test_reject_a_draft_is_409(client, org_stub, fresh):
    resp = client.post(f"/company-applications/{org_stub.DRAFTCO}/reject", json={"reason": "No."}, headers=fresh)
    assert resp.status_code == 409
    assert events("company_reject")[0][1] == "failure"


def test_changes_need_a_fresh_code(client, org_stub, admin):
    headers, _ = admin
    for method, path, body in (
        ("POST", f"/company-applications/{org_stub.ABAY}/approve", None),
        ("POST", f"/company-applications/{org_stub.ABAY}/reject", {"reason": "Not readable."}),
        ("POST", f"/companies/{org_stub.ETHIO}/suspend", None),
        ("POST", f"/companies/{org_stub.DORMANT}/reactivate", None),
    ):
        resp = client.request(method, path, json=body, headers=headers)
        assert resp.status_code == 403 and resp.json()["error_code"] == "REAUTH_REQUIRED", path
    assert org_stub.app.state.calls == []
    assert org_stub.app.state.data["reviewers"] == []


# --- documents ---------------------------------------------------------------------------

def test_document_view_and_download(client, org_stub, admin):
    resp = client.get(f"/company-applications/{org_stub.ABAY}/documents/trade_license", headers=admin[0])
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.headers["content-disposition"].startswith('inline; filename="trade_license.pdf"')
    assert resp.headers["x-content-type-options"] == "nosniff"
    assert "no-store" in resp.headers["cache-control"]
    assert resp.content.startswith(b"%PDF")
    resp = client.get(f"/company-applications/{org_stub.HABESHA}/documents/authorization_letter?download=true",
                      headers=admin[0])
    assert resp.headers["content-type"] == "image/png"
    assert resp.headers["content-disposition"].startswith('attachment; filename="authorization_letter.png"')
    viewed = events("company_document_view")
    assert [json.loads(e[4])["download"] for e in viewed] == [False, True]
    assert all(e[1] == "success" and e[2] == "ops@endod.example" for e in viewed)
    # Kept apart from the hospital documents in the audit log.
    assert events("document_view") == []


def test_documents_html_unknown_kind_and_missing(client, org_stub, admin):
    resp = client.get(f"/company-applications/{org_stub.EVILCO}/documents/trade_license", headers=admin[0])
    assert resp.status_code == 502 and resp.json()["error_code"] == "UPSTREAM_INVALID_TYPE"
    assert b"<script>" not in resp.content
    assert client.get(f"/company-applications/{org_stub.ABAY}/documents/moh_license",
                      headers=admin[0]).status_code == 404
    assert client.get(f"/company-applications/{org_stub.DRAFTCO}/documents/trade_license",
                      headers=admin[0]).status_code == 404
    assert [e[1] for e in events("company_document_view")] == ["failure", "failure", "failure"]


def test_documents_share_the_hospital_documents_cap(client, stub, org_stub, admin, monkeypatch):
    from app import hospital, organisation

    monkeypatch.setattr(hospital, "DOCUMENT_WAIT_SECONDS", 0.05)
    held = [hospital.open_document(stub.TENA, kind) for kind in hospital.DOCUMENT_KINDS[:2]]
    held += [organisation.open_document(org_stub.ABAY, kind) for kind in organisation.DOCUMENT_KINDS[:2]]
    try:
        busy = client.get(f"/company-applications/{org_stub.ABAY}/documents/trade_license", headers=admin[0])
        assert busy.status_code == 503 and busy.json()["error_code"] == "BUSY"
    finally:
        for doc in held:
            doc.close()
    for _ in range(6):
        resp = client.get(f"/company-applications/{org_stub.ABAY}/documents/trade_license", headers=admin[0])
        assert resp.status_code == 200 and resp.content.startswith(b"%PDF")


def test_document_stream_is_passed_through_in_chunks(db, monkeypatch):
    from app import hospital, organisation

    body = b"%PDF-1.4\n" + b"0" * (3 * hospital.CHUNK)

    def handler(request):
        return httpx.Response(200, headers={"content-type": "application/pdf",
                                            "content-disposition": 'attachment; filename="trade.pdf"'},
                              stream=httpx.ByteStream(body))

    monkeypatch.setattr(organisation, "transport", httpx.MockTransport(handler))
    doc = organisation.open_document("1a" * 16, "trade_license")
    assert (doc.content_type, doc.filename) == ("application/pdf", "trade.pdf")
    chunks = list(doc.chunks())
    assert b"".join(chunks) == body and len(chunks) >= 4
    assert hospital._document_slots.acquire(blocking=False)
    hospital._document_slots.release()


def test_oversized_documents_are_refused(client, admin, monkeypatch):
    from app import hospital, organisation

    monkeypatch.setattr(organisation, "transport", httpx.MockTransport(lambda request: httpx.Response(
        200, headers={"content-type": "application/pdf", "content-length": str(hospital.MAX_DOCUMENT_BYTES + 1)},
        content=b"%PDF")))
    resp = client.get(f"/company-applications/{'1a' * 16}/documents/trade_license", headers=admin[0])
    assert resp.status_code == 502 and resp.json()["error_code"] == "UPSTREAM_TOO_LARGE"


# --- companies ---------------------------------------------------------------------------

def test_companies_list(client, org_stub, admin):
    rows = client.get("/companies", headers=admin[0]).json()
    assert [(r["name"], r["status"], r["employees"], r["admins"]) for r in rows] == [
        ("Ethio Finance SC", "active", 312, 2), ("Dormant Textiles PLC", "suspended", 40, 1)]


def test_suspend_and_reactivate(client, org_stub, fresh):
    resp = client.post(f"/companies/{org_stub.ETHIO}/suspend", headers=fresh)
    assert resp.status_code == 200 and resp.json()["status"] == "suspended"
    resp = client.post(f"/companies/{org_stub.ETHIO}/reactivate", headers=fresh)
    assert resp.status_code == 200 and resp.json()["status"] == "active"
    assert org_stub.app.state.data["reviewers"] == [("suspended", org_stub.ETHIO, "ops@endod.example"),
                                                    ("active", org_stub.ETHIO, "ops@endod.example")]
    suspended = events("company_suspend")
    assert [e[1] for e in suspended] == ["success"] and suspended[0][3] == org_stub.ETHIO
    assert [e[1] for e in events("company_reactivate")] == ["success"]
    # The company's name is in the audit log.
    page = client.get("/audit?action=company_suspend", headers=fresh).json()
    assert page["items"][0]["target_name"] == "Ethio Finance SC"
    assert page["items"][0]["target_type"] == "company"


def test_suspend_unknown_company_is_404_and_audited(client, org_stub, fresh):
    resp = client.post(f"/companies/{'0' * 32}/suspend", headers=fresh)
    assert resp.status_code == 404 and resp.json()["error"] == "Organisation not found."
    assert events("company_suspend")[0][1] == "failure"


def test_dashboard_counts_pending_company_applications(client, admin):
    body = client.get("/dashboard", headers=admin[0]).json()
    assert body["pending_company_applications"] == 3
    assert body["companies_connected"] is True
    assert body["pending_applications"] == 3 and body["errors"] == []


# --- not connected -----------------------------------------------------------------------

def test_without_the_key_companies_answer_503_and_hospitals_keep_working(client, stub, org_stub, admin,
                                                                         monkeypatch):
    monkeypatch.delenv("ORGANISATION_PLATFORM_KEY")
    headers, secret = admin
    for method, path in (("GET", "/company-applications"), ("GET", f"/company-applications/{org_stub.ABAY}"),
                         ("GET", f"/company-applications/{org_stub.ABAY}/documents/trade_license"),
                         ("POST", f"/company-applications/{org_stub.ABAY}/approve"),
                         ("POST", f"/company-applications/{org_stub.ABAY}/reject"),
                         ("GET", "/companies"), ("POST", f"/companies/{org_stub.ETHIO}/suspend"),
                         ("POST", f"/companies/{org_stub.ETHIO}/reactivate")):
        resp = client.request(method, path, json={"reason": "Not readable."}, headers=headers)
        # 503 first: no code is asked for an action that cannot happen.
        assert resp.status_code == 503, (method, path, resp.text)
        assert resp.json()["error_code"] == "COMPANIES_NOT_CONNECTED"
        assert resp.json()["error"].startswith("Companies are not connected yet")
    assert org_stub.app.state.calls == []
    # The hospital side is untouched.
    assert client.get("/applications", headers=headers).status_code == 200
    body = client.get("/dashboard", headers=headers).json()
    assert body["companies_connected"] is False and body["pending_company_applications"] is None
    assert body["pending_applications"] == 3 and body["errors"] == []


# --- the client itself -------------------------------------------------------------------

def test_client_sends_the_key_and_reviewer(db, monkeypatch):
    from app import organisation

    captured = {}

    def handler(request):
        captured.update(key=request.headers.get("x-platform-key"), url=str(request.url),
                        body=json.loads(request.content))
        return httpx.Response(200, json={"status": "approved"})

    monkeypatch.setattr(organisation, "transport", httpx.MockTransport(handler))
    assert organisation.approve("1a" * 16, "ops@endod.example") == {"status": "approved"}
    assert captured == {"key": ORG_PLATFORM_KEY, "url": f"http://tenacare.test/platform/applications/{'1a' * 16}/approve",
                        "body": {"reviewer": "ops@endod.example"}}


def test_client_rejects_bad_ids_and_kinds(db, monkeypatch):
    from app import organisation
    from app.errors import ApiError

    def never(request):
        raise AssertionError("called TenaCare")

    monkeypatch.setattr(organisation, "transport", httpx.MockTransport(never))
    for bad in ("../x", "A" * 32, "a" * 31, "a" * 33, "", "a" * 31 + "/"):
        for call in (lambda: organisation.get_application(bad), lambda: organisation.approve(bad, "x"),
                     lambda: organisation.reject(bad, "reason", "x"), lambda: organisation.suspend(bad, "x"),
                     lambda: organisation.reactivate(bad, "x"),
                     lambda: organisation.open_document(bad, "trade_license")):
            with pytest.raises(ApiError) as caught:
                call()
            assert caught.value.status_code == 404
    with pytest.raises(ApiError):
        organisation.open_document("1a" * 16, "../../etc")


def test_client_maps_upstream_errors(db, monkeypatch):
    from app import organisation
    from app.errors import ApiError

    answers = iter([
        httpx.Response(409, json={"detail": "Only a submitted application can be approved."}),
        httpx.Response(404, json={"detail": "Application not found."}),
        httpx.Response(401, json={"detail": "Not authenticated"}),
        httpx.Response(500, text="boom"),
        httpx.Response(200, text="not json"),
        httpx.Response(200, json={"no": "items"}),
    ])
    monkeypatch.setattr(organisation, "transport", httpx.MockTransport(lambda request: next(answers)))
    expected = [(409, "UPSTREAM_409", "Only a submitted application can be approved."),
                (404, "UPSTREAM_404", "Application not found."), (502, "UPSTREAM_AUTH", None),
                (502, "UPSTREAM_ERROR", None), (502, "UPSTREAM_INVALID", None)]
    for status, code, message in expected:
        with pytest.raises(ApiError) as caught:
            organisation.approve("1a" * 16, "ops@endod.example")
        assert (caught.value.status_code, caught.value.code) == (status, code)
        if message:
            assert caught.value.message == message
    with pytest.raises(ApiError) as caught:
        organisation.list_organisations()
    assert caught.value.code == "UPSTREAM_INVALID"


def test_client_timeouts_and_unreachable(db, monkeypatch):
    from app import organisation
    from app.config import get_settings
    from app.errors import ApiError

    assert get_settings().ORGANISATION_API_TIMEOUT > 0

    def slow(request):
        raise httpx.ReadTimeout("slow", request=request)

    monkeypatch.setattr(organisation, "transport", httpx.MockTransport(slow))
    with pytest.raises(ApiError) as caught:
        organisation.list_applications()
    assert caught.value.status_code == 504

    def refuse(request):
        raise httpx.ConnectError("refused", request=request)

    monkeypatch.setattr(organisation, "transport", httpx.MockTransport(refuse))
    with pytest.raises(ApiError) as caught:
        organisation.open_document("1a" * 16, "trade_license")
    assert caught.value.message == organisation.UNREACHABLE


def test_the_key_is_never_logged_or_returned(client, org_stub, fresh, caplog, monkeypatch):
    caplog.set_level(logging.DEBUG)
    seen = []
    for method, path in (("GET", "/company-applications"), ("GET", f"/company-applications/{org_stub.ABAY}"),
                         ("GET", f"/company-applications/{org_stub.ABAY}/documents/trade_license"),
                         ("GET", "/companies"), ("GET", "/dashboard"),
                         ("POST", f"/company-applications/{org_stub.DRAFTCO}/approve"),
                         ("POST", f"/companies/{'0' * 32}/suspend")):
        resp = client.request(method, path, headers=fresh)
        seen.append(resp.text + json.dumps(dict(resp.headers)))
    # A wrong key: refused as a 502 that names the variable, not the value.
    monkeypatch.setenv("ORGANISATION_PLATFORM_KEY", "wrong-org-key")
    resp = client.get("/companies", headers=fresh)
    assert resp.status_code == 502 and resp.json()["error_code"] == "UPSTREAM_AUTH"
    seen.append(resp.text)
    seen.append(client.get("/audit?page_size=100", headers=fresh).text)
    logged = caplog.text + "".join(repr(r.args) for r in caplog.records)
    for secret in (ORG_PLATFORM_KEY, "wrong-org-key", PLATFORM_KEY):
        assert not any(secret in text for text in seen)
        assert secret not in logged
    # Still signed in.
    assert client.get("/auth/me", headers=fresh).status_code == 200
