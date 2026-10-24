"""Applications and hospitals through the hospital platform API (the stub)."""

import json

import httpx
import pytest
from conftest import PLATFORM_KEY, events, make_admin, reauth, sign_in


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


def test_dashboard_counts(client, admin):
    body = client.get("/dashboard", headers=admin[0]).json()
    assert body["pending_applications"] == 3  # Tena, Bethel, Evil Docs (submitted)
    assert body["approved_hospitals"] == 1
    assert [a["name"] for a in body["awaiting_review"]][0] == "Tena Clinic"
    assert body["errors"] == []


def test_list_and_read_applications(client, stub, admin):
    rows = client.get("/applications", headers=admin[0]).json()
    assert {r["name"] for r in rows} >= {"Tena Clinic", "Abebe Draft Clinic"}
    assert all(r["status"] == "draft" for r in client.get("/applications?status=draft", headers=admin[0]).json())
    assert client.get("/applications?status=bogus", headers=admin[0]).status_code == 400
    detail = client.get(f"/applications/{stub.TENA}", headers=admin[0]).json()
    assert detail["documents"]["license_number"] == "MOH/TENA/2026"
    assert detail["location"]["latitude"] == pytest.approx(9.0108)
    # Every call carried the platform key.
    assert ("GET", f"/platform/applications/{stub.TENA}") in stub.app.state.calls


def test_ids_are_checked_before_anything_is_called(client, stub, admin):
    for path in ("/applications/..%2F..%2Fadmin", "/applications/ABC", "/organisations/x" * 2):
        assert client.get(path, headers=admin[0]).status_code in (404, 422)
    assert stub.app.state.calls == []


def test_approve(client, stub, fresh):
    resp = client.post(f"/applications/{stub.TENA}/approve", headers=fresh)
    assert resp.status_code == 200 and resp.json()["status"] == "approved"
    action, result, email, target, _ = events("hospital_approve")[0]
    assert (result, email, target) == ("success", "ops@endod.example", stub.TENA)


def test_approve_unsubmitted_shows_the_hospital_service_409(client, stub, fresh):
    resp = client.post(f"/applications/{stub.DRAFT}/approve", headers=fresh)
    assert resp.status_code == 409
    assert resp.json()["error"].startswith("The hospital's application is not submitted yet (status: draft)")
    assert resp.json()["error_code"] == "UPSTREAM_409"
    _, result, _, target, detail = events("hospital_approve")[0]
    assert result == "failure" and target == stub.DRAFT and json.loads(detail)["status"] == 409


def test_reject_needs_a_reason(client, stub, fresh):
    assert client.post(f"/applications/{stub.BETHEL}/reject", json={"reason": " "}, headers=fresh).status_code == 422
    assert client.post(f"/applications/{stub.BETHEL}/reject", json={}, headers=fresh).status_code == 422
    resp = client.post(f"/applications/{stub.BETHEL}/reject",
                       json={"reason": "The TIN certificate is unreadable."}, headers=fresh)
    assert resp.status_code == 200 and resp.json()["status"] == "rejected"
    assert resp.json()["rejection_reason"] == "The TIN certificate is unreadable."
    _, result, _, _, detail = events("application_reject")[0]
    assert result == "success" and "unreadable" in detail
    # Only a submitted application can be sent back.
    again = client.post(f"/applications/{stub.BETHEL}/reject", json={"reason": "Again please."}, headers=fresh)
    assert again.status_code == 409 and again.json()["error"] == "Only a submitted application can be sent back."


def test_suspend_and_reapprove(client, stub, fresh):
    resp = client.post(f"/organisations/{stub.YEKATIT}/suspend", headers=fresh)
    assert resp.status_code == 200 and resp.json()["status"] == "suspended"
    resp = client.post(f"/organisations/{stub.YEKATIT}/approve", headers=fresh)
    assert resp.status_code == 200 and resp.json()["status"] == "approved"
    assert [e[1] for e in events("hospital_suspend")] == ["success"]
    assert events("hospital_approve")[0][2] == "ops@endod.example"


def test_delete_only_pending(client, stub, fresh):
    resp = client.delete(f"/organisations/{stub.YEKATIT}", headers=fresh)
    assert resp.status_code == 409 and "suspend instead" in resp.json()["error"]
    assert client.delete(f"/organisations/{stub.DRAFT}", headers=fresh).status_code == 200
    assert [e[1] for e in events("hospital_delete")] == ["failure", "success"]


def test_organisations(client, stub, admin):
    rows = client.get("/organisations", headers=admin[0]).json()
    assert len(rows) == 6
    assert [r["name"] for r in client.get("/organisations?status=suspended", headers=admin[0]).json()] == [
        "Selam Clinic"]
    one = client.get(f"/organisations/{stub.YEKATIT}", headers=admin[0])
    assert one.status_code == 200 and one.json()["name"] == "Yekatit Hospital"
    assert client.get(f"/organisations/{'0' * 32}", headers=admin[0]).status_code == 404


def test_document_view_and_download(client, stub, admin):
    resp = client.get(f"/applications/{stub.TENA}/documents/moh_license", headers=admin[0])
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.headers["content-disposition"].startswith('inline; filename="moh_license.pdf"')
    assert resp.headers["x-content-type-options"] == "nosniff"
    assert "no-store" in resp.headers["cache-control"]
    assert resp.content.startswith(b"%PDF")
    resp = client.get(f"/applications/{stub.BETHEL}/documents/owner_id?download=true", headers=admin[0])
    assert resp.headers["content-type"] == "image/png"
    assert resp.headers["content-disposition"].startswith('attachment; filename="owner_id.png"')
    viewed = events("document_view")
    assert [json.loads(e[4])["download"] for e in viewed] == [False, True]
    assert all(e[1] == "success" and e[2] == "ops@endod.example" for e in viewed)


def test_html_documents_are_refused(client, stub, admin):
    resp = client.get(f"/applications/{stub.EVIL}/documents/moh_license", headers=admin[0])
    assert resp.status_code == 502 and resp.json()["error_code"] == "UPSTREAM_INVALID_TYPE"
    assert b"<script>" not in resp.content
    assert events("document_view")[0][1] == "failure"


def test_unknown_document_kind(client, stub, admin):
    assert client.get(f"/applications/{stub.TENA}/documents/passport", headers=admin[0]).status_code == 404
    assert client.get(f"/applications/{stub.DRAFT}/documents/moh_license", headers=admin[0]).status_code == 404


def test_a_wrong_platform_key_is_not_passed_on_as_401(client, admin, monkeypatch):
    monkeypatch.setenv("HOSPITAL_PLATFORM_KEY", "wrong-key")
    resp = client.get("/applications", headers=admin[0])
    assert resp.status_code == 502 and resp.json()["error_code"] == "UPSTREAM_AUTH"
    assert "wrong-key" not in resp.text
    # The admin is still signed in.
    assert client.get("/auth/me", headers=admin[0]).status_code == 200


def test_unreachable_hospital_service(client, admin, monkeypatch):
    from app import hospital

    def refuse(request):
        raise httpx.ConnectError("refused", request=request)

    monkeypatch.setattr(hospital, "transport", httpx.MockTransport(refuse))
    resp = client.get("/organisations", headers=admin[0])
    assert resp.status_code == 502 and resp.json()["error"] == hospital.UNREACHABLE
    body = client.get("/dashboard", headers=admin[0]).json()
    assert body["pending_applications"] is None and body["errors"] == [hospital.UNREACHABLE]


def test_missing_platform_key(client, admin, monkeypatch):
    monkeypatch.delenv("HOSPITAL_PLATFORM_KEY")
    resp = client.get("/organisations", headers=admin[0])
    assert resp.status_code == 503 and resp.json()["error_code"] == "UPSTREAM_NOT_CONFIGURED"


def test_the_key_never_reaches_a_response(client, stub, fresh):
    seen = []
    for method, path in (("GET", "/applications"), ("GET", f"/applications/{stub.TENA}"),
                         ("GET", "/organisations"), ("GET", "/dashboard"), ("GET", "/audit"),
                         ("POST", f"/applications/{stub.DRAFT}/approve")):
        resp = client.request(method, path, headers=fresh)
        seen.append(resp.text + json.dumps(dict(resp.headers)))
    assert not any(PLATFORM_KEY in text for text in seen)


# --- the client itself ---------------------------------------------------------------------

def test_client_sends_the_platform_key(db, monkeypatch):
    from app import hospital

    captured = {}

    def handler(request):
        captured["key"] = request.headers.get("x-platform-key")
        captured["url"] = str(request.url)
        return httpx.Response(200, json={"id": "a" * 32, "status": "approved", "name": "X"})

    monkeypatch.setattr(hospital, "transport", httpx.MockTransport(handler))
    hospital.approve("a" * 32)
    assert captured == {"key": PLATFORM_KEY, "url": f"http://hospital.test/platform/hospitals/{'a' * 32}/approve"}


def test_client_rejects_bad_ids(db):
    from app import hospital
    from app.errors import ApiError

    for bad in ("../x", "A" * 32, "a" * 31, ""):
        with pytest.raises(ApiError):
            hospital.approve(bad)


def test_client_maps_upstream_errors(db, monkeypatch):
    from app import hospital
    from app.errors import ApiError

    answers = iter([
        httpx.Response(409, json={"error": "Not submitted.", "error_code": "HTTP_409"}),
        httpx.Response(500, text="boom"),
        httpx.Response(200, text="not json"),
    ])
    monkeypatch.setattr(hospital, "transport", httpx.MockTransport(lambda request: next(answers)))
    with pytest.raises(ApiError) as first:
        hospital.approve("a" * 32)
    assert (first.value.status_code, first.value.message) == (409, "Not submitted.")
    with pytest.raises(ApiError) as second:
        hospital.approve("a" * 32)
    assert second.value.status_code == 502 and second.value.code == "UPSTREAM_ERROR"
    with pytest.raises(ApiError) as third:
        hospital.approve("a" * 32)
    assert third.value.code == "UPSTREAM_INVALID"


def test_client_safe_filenames():
    from app.hospital import safe_filename

    assert safe_filename('inline; filename="license.pdf"', "moh_license", "pdf") == "license.pdf"
    assert safe_filename("inline; filename*=utf-8''%E1%88%80%20a.pdf", "moh_license", "pdf") == "a.pdf"
    assert safe_filename('inline; filename="x.html"', "owner_id", "png") == "x.png"
    assert safe_filename('inline; filename="../../\r\nSet-Cookie: a"', "owner_id", "png") == "Set-Cookie_ a.png"
    assert safe_filename("", "tin_certificate", "jpg") == "tin_certificate.jpg"
