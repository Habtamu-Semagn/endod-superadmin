"""The audit log: what is written, and the Audit logs screen's query."""

from conftest import CLIENT_IP, PASSWORD, events, make_admin, reauth, sign_in


def test_every_step_is_logged_with_admin_ip_target_and_result(client, clock, stub):
    _, secret = make_admin()
    client.post("/auth/login", json={"email": "ops@endod.example", "password": "Wrong-password-1"})
    headers = sign_in(client, clock, secret)
    reauth(client, clock, secret, headers)
    client.post(f"/applications/{stub.TENA}/approve", headers=headers)
    client.post(f"/applications/{stub.BETHEL}/reject", json={"reason": "Blurry licence."}, headers=headers)
    client.post(f"/organisations/{stub.YEKATIT}/suspend", headers=headers)
    client.delete(f"/organisations/{stub.DRAFT}", headers=headers)
    client.get(f"/applications/{stub.TENA}/documents/tin_certificate", headers=headers)
    client.post("/auth/logout", headers=headers)

    logged = [(action, result) for action, result, *_ in events()]
    assert logged == [
        ("sign_in", "failure"), ("sign_in_password", "success"), ("sign_in", "success"), ("reauth", "success"),
        ("hospital_approve", "success"), ("application_reject", "success"), ("hospital_suspend", "success"),
        ("hospital_delete", "success"), ("document_view", "success"), ("sign_out", "success"),
    ]

    from sqlalchemy import select

    from app.db import session_scope
    from app.models import AuditEvent

    with session_scope() as session:
        rows = list(session.scalars(select(AuditEvent)))
    assert all(r.ip == CLIENT_IP and r.at is not None for r in rows)
    approve = next(r for r in rows if r.action == "hospital_approve")
    assert (approve.target_type, approve.target_id, approve.target_name) == ("hospital", stub.TENA, "Tena Clinic")
    assert approve.admin_id is not None and approve.admin_email == "ops@endod.example"


def test_passwords_and_codes_are_never_logged(client, clock):
    _, secret = make_admin()
    client.post("/auth/login", json={"email": "ops@endod.example", "password": "Wrong-password-1"})
    sign_in(client, clock, secret)
    dump = repr(events())
    assert PASSWORD not in dump and "Wrong-password-1" not in dump and secret not in dump


def test_audit_query_filters_and_pages(client, clock, stub):
    _, secret = make_admin()
    for _ in range(2):
        client.post("/auth/login", json={"email": "ops@endod.example", "password": "Wrong-password-1"})
    headers = sign_in(client, clock, secret)
    client.get(f"/applications/{stub.TENA}/documents/moh_license", headers=headers)

    page = client.get("/audit?page_size=2", headers=headers).json()
    assert page["total"] == 5 and len(page["items"]) == 2 and page["page"] == 1
    assert page["items"][0]["action"] == "document_view"  # newest first
    assert page["totals"] == {"all": 5, "success": 3, "failure": 2, "sign_in_failures": 2}
    assert "sign_in" in page["actions"]

    second = client.get("/audit?page_size=2&page=3", headers=headers).json()
    assert [i["action"] for i in second["items"]] == ["sign_in"]

    failures = client.get("/audit?result=failure", headers=headers).json()
    assert failures["total"] == 2 and {i["result"] for i in failures["items"]} == {"failure"}
    views = client.get("/audit?action=document_view", headers=headers).json()
    assert views["total"] == 1 and views["items"][0]["detail"]["kind"] == "moh_license"
    assert client.get(f"/audit?q={stub.TENA[:8]}", headers=headers).json()["total"] == 1
    assert client.get("/audit?q=OPS@endod", headers=headers).json()["total"] == 5
    assert client.get("/audit?q=%25", headers=headers).json()["total"] == 5
    assert client.get("/audit?since=2999-01-01T00:00:00Z", headers=headers).json()["total"] == 0
    assert client.get("/audit?action=nope", headers=headers).status_code == 400
    assert client.get("/audit?page_size=1000", headers=headers).status_code == 422


def test_admins_list(client, clock):
    _, secret = make_admin()
    make_admin(email="new@endod.example", name="New Admin", enrolled=False)
    headers = sign_in(client, clock, secret)
    rows = client.get("/admins", headers=headers).json()
    assert [(r["email"], r["two_factor"], r["active"]) for r in rows] == [
        ("ops@endod.example", True, True), ("new@endod.example", False, True)]
    assert all("password" not in key and "secret" not in key for r in rows for key in r)
