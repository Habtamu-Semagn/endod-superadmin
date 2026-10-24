from datetime import timedelta

from conftest import PASSWORD, bearer, code, events, make_admin, password_step, reauth, sign_in
from sqlalchemy import select, update

from app.auth import INVALID_LOGIN
from app.db import session_scope, utcnow
from app.models import Admin, AdminSession, RecoveryCode


# --- password step ------------------------------------------------------------------------

def test_sign_in_with_password_and_totp(client, clock):
    _, secret = make_admin()
    pending = password_step(client)
    assert pending["stage"] == "totp" and pending["session_max_age"] == 15 * 60
    # The pending session reaches nothing but the sign-in steps.
    assert client.get("/applications", headers=bearer(pending["session_token"])).status_code == 403
    assert client.get("/auth/me", headers=bearer(pending["session_token"])).json()["stage"] == "totp"

    resp = client.post("/auth/totp", json={"code": code(secret, clock)}, headers=bearer(pending["session_token"]))
    assert resp.status_code == 200, resp.text
    full = resp.json()
    assert full["stage"] == "full" and full["session_max_age"] == 12 * 3600
    # Rotated: a new token, and the pending one is dead.
    assert full["session_token"] != pending["session_token"]
    assert client.get("/auth/me", headers=bearer(pending["session_token"])).status_code == 401
    me = client.get("/auth/me", headers=bearer(full["session_token"])).json()
    assert me["stage"] == "full" and me["admin"]["email"] == "ops@endod.example"
    assert me["reauth_valid_until"] is None
    assert [e[:2] for e in events("sign_in")] == [("sign_in", "success")]


def test_wrong_email_and_wrong_password_answer_the_same(client):
    make_admin()
    make_admin(email="off@endod.example", active=False)
    make_admin(email="nopass@endod.example", password=None, enrolled=False)
    answers = [
        client.post("/auth/login", json={"email": "nobody@endod.example", "password": PASSWORD}),
        client.post("/auth/login", json={"email": "ops@endod.example", "password": "Wrong-password-1"}),
        client.post("/auth/login", json={"email": "off@endod.example", "password": PASSWORD}),
        client.post("/auth/login", json={"email": "nopass@endod.example", "password": PASSWORD}),
    ]
    assert {(a.status_code, a.json()["error"], a.json()["error_code"]) for a in answers} == {
        (401, INVALID_LOGIN, "INVALID_LOGIN")}
    failures = events("sign_in")
    assert len(failures) == 4 and all(result == "failure" for _, result, *_ in failures)
    assert "unknown_email" in failures[0][4] and "wrong_password" in failures[1][4]
    assert "account_disabled" in failures[2][4]


def test_email_is_case_insensitive(client):
    make_admin()
    assert password_step(client, email="  OPS@Endod.Example ")["stage"] == "totp"


def test_lockout_after_five_failures(client, clock):
    _, secret = make_admin()
    for _ in range(5):
        resp = client.post("/auth/login", json={"email": "ops@endod.example", "password": "Wrong-password-1"})
        assert resp.status_code == 401
    # Now even the right password gets the same answer.
    resp = client.post("/auth/login", json={"email": "ops@endod.example", "password": PASSWORD})
    assert resp.status_code == 401 and resp.json()["error"] == INVALID_LOGIN
    assert [e[1] for e in events("account_locked")] == ["success"]
    # The lock ends after 15 minutes.
    with session_scope() as session:
        session.execute(update(Admin).values(locked_until=utcnow() - timedelta(seconds=1)))
    assert password_step(client)["stage"] == "totp"


def test_wrong_totp_codes_count_towards_the_lockout(client, clock):
    _, secret = make_admin()
    pending = password_step(client)
    headers = bearer(pending["session_token"])
    for _ in range(4):
        resp = client.post("/auth/totp", json={"code": "000000"}, headers=headers)
        assert resp.status_code == 400 and resp.json()["error_code"] == "INVALID_CODE"
    resp = client.post("/auth/totp", json={"code": "000000"}, headers=headers)
    assert resp.status_code == 401 and resp.json()["error_code"] == "LOCKED"
    # The pending session is gone, and the password no longer opens one.
    assert client.post("/auth/totp", json={"code": code(secret, clock)}, headers=headers).status_code == 401
    assert client.post("/auth/login", json={"email": "ops@endod.example", "password": PASSWORD}).status_code == 401


def test_address_rate_limit(client, monkeypatch):
    monkeypatch.setenv("ADMIN_IP_FAILURE_LIMIT", "3")
    make_admin()
    for n in range(3):
        resp = client.post("/auth/login", json={"email": f"x{n}@endod.example", "password": "whatever-1"})
        assert resp.status_code == 401
    resp = client.post("/auth/login", json={"email": "ops@endod.example", "password": PASSWORD})
    assert resp.status_code == 429 and resp.json()["error_code"] == "RATE_LIMITED"
    assert "address_rate_limited" in events("sign_in")[-1][4]


def test_forwarded_for_is_trusted_only_through_configured_proxies(client, monkeypatch):
    monkeypatch.setenv("ADMIN_IP_FAILURE_LIMIT", "2")
    for n in range(2):
        client.post("/auth/login", json={"email": f"x{n}@endod.example", "password": "whatever-1"},
                    headers={"X-Forwarded-For": f"203.0.113.{n}"})
    # Without trusted hops the header is ignored: both failures came from one address.
    assert client.post("/auth/login", json={"email": "x@endod.example", "password": "whatever-1"},
                       headers={"X-Forwarded-For": "198.51.100.7"}).status_code == 429
    monkeypatch.setenv("ADMIN_TRUSTED_PROXY_HOPS", "1")
    assert client.post("/auth/login", json={"email": "x@endod.example", "password": "whatever-1"},
                       headers={"X-Forwarded-For": "198.51.100.7"}).status_code == 401


# --- TOTP replay ---------------------------------------------------------------------------

def test_a_totp_code_works_only_once(client, clock):
    _, secret = make_admin()
    used = code(secret, clock)
    first = password_step(client)
    assert client.post("/auth/totp", json={"code": used},
                       headers=bearer(first["session_token"])).status_code == 200
    second = password_step(client)
    resp = client.post("/auth/totp", json={"code": used}, headers=bearer(second["session_token"]))
    assert resp.status_code == 400 and resp.json()["error_code"] == "INVALID_CODE"
    # An older step is refused too; the next one works.
    assert client.post("/auth/totp", json={"code": code(secret, clock, -1)},
                       headers=bearer(second["session_token"])).status_code == 400
    assert client.post("/auth/totp", json={"code": code(secret, clock, +1)},
                       headers=bearer(second["session_token"])).status_code == 200


def test_codes_outside_the_window_are_refused(client, clock):
    _, secret = make_admin()
    pending = password_step(client)
    for offset in (-2, 2):
        assert client.post("/auth/totp", json={"code": code(secret, clock, offset)},
                           headers=bearer(pending["session_token"])).status_code == 400


# --- recovery codes -----------------------------------------------------------------------

def _enrol(client, clock, email="new@endod.example"):
    make_admin(email=email, enrolled=False)
    pending = password_step(client, email)
    assert pending["stage"] == "enroll"
    headers = bearer(pending["session_token"])
    start = client.post("/auth/enroll/start", headers=headers).json()
    resp = client.post("/auth/enroll/confirm", json={"code": code(start["secret"], clock)}, headers=headers)
    assert resp.status_code == 200, resp.text
    clock.advance()
    return start, resp.json()


def test_enrolment(client, clock):
    make_admin(email="new@endod.example", enrolled=False)
    pending = password_step(client, "new@endod.example")
    assert pending["stage"] == "enroll"
    headers = bearer(pending["session_token"])
    # Nothing else is reachable before enrolling.
    assert client.get("/dashboard", headers=headers).status_code == 403
    assert client.post("/auth/totp", json={"code": "123456"}, headers=headers).status_code == 409

    start = client.post("/auth/enroll/start", headers=headers).json()
    assert start["issuer"] == "Endod Admin" and start["account"] == "new@endod.example"
    assert start["otpauth_uri"].startswith("otpauth://totp/Endod%20Admin:new%40endod.example?")
    # Asking again shows the same secret until it is confirmed.
    assert client.post("/auth/enroll/start", headers=headers).json()["secret"] == start["secret"]

    bad = client.post("/auth/enroll/confirm", json={"code": code(start["secret"], clock, 5)}, headers=headers)
    assert bad.status_code == 400
    resp = client.post("/auth/enroll/confirm", json={"code": code(start["secret"], clock)}, headers=headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["stage"] == "full" and len(body["recovery_codes"]) == 10
    assert len(set(body["recovery_codes"])) == 10
    assert client.get("/dashboard", headers=bearer(body["session_token"])).status_code == 200
    assert client.get("/auth/me", headers=headers).status_code == 401  # rotated

    with session_scope() as session:
        admin = session.scalar(select(Admin).where(Admin.email == "new@endod.example"))
        assert admin.totp_pending_secret is None and start["secret"] not in admin.totp_secret
        stored = [r.code_hash for r in session.scalars(select(RecoveryCode))]
    assert len(stored) == 10 and not set(body["recovery_codes"]) & set(stored)
    assert [e[:2] for e in events("totp_enrolled")] == [("totp_enrolled", "failure"), ("totp_enrolled", "success")]
    assert [e[1] for e in events("enrolment_started")] == ["success"]
    # The enrolment code was used: it cannot sign in.
    pending = password_step(client, "new@endod.example")
    assert pending["stage"] == "totp"


def test_recovery_code_signs_in_once(client, clock):
    _, enrolled = _enrol(client, clock)
    recovery = enrolled["recovery_codes"][0]
    pending = password_step(client, "new@endod.example")
    resp = client.post("/auth/totp", json={"recovery_code": recovery.upper()},
                       headers=bearer(pending["session_token"]))
    assert resp.status_code == 200 and resp.json()["recovery_codes_left"] == 9
    pending = password_step(client, "new@endod.example")
    assert client.post("/auth/totp", json={"recovery_code": recovery},
                       headers=bearer(pending["session_token"])).status_code == 400
    assert "recovery_code" in events("sign_in")[-2][4]


def test_enrolment_cannot_be_restarted_after_it_is_done(client, clock):
    _, secret = make_admin()
    headers = sign_in(client, clock, secret)
    assert client.post("/auth/enroll/start", headers=headers).status_code == 409


# --- sessions -------------------------------------------------------------------------------

def test_idle_timeout(client, clock):
    _, secret = make_admin()
    headers = sign_in(client, clock, secret)
    assert client.get("/auth/me", headers=headers).status_code == 200
    with session_scope() as session:
        session.execute(update(AdminSession).values(last_seen_at=utcnow() - timedelta(minutes=31)))
    resp = client.get("/auth/me", headers=headers)
    assert resp.status_code == 401 and resp.json()["error_code"] == "SESSION_ENDED"


def test_activity_keeps_the_session_alive(client, clock):
    _, secret = make_admin()
    headers = sign_in(client, clock, secret)
    with session_scope() as session:
        session.execute(update(AdminSession).values(last_seen_at=utcnow() - timedelta(minutes=29)))
    assert client.get("/auth/me", headers=headers).status_code == 200
    with session_scope() as session:
        seen = session.scalar(select(AdminSession.last_seen_at).where(AdminSession.revoked_at.is_(None)))
    assert seen is not None


def test_absolute_limit(client, clock):
    _, secret = make_admin()
    headers = sign_in(client, clock, secret)
    with session_scope() as session:
        session.execute(update(AdminSession).values(expires_at=utcnow() - timedelta(seconds=1)))
    assert client.get("/auth/me", headers=headers).status_code == 401


def test_pending_session_expires(client):
    make_admin()
    pending = password_step(client)
    with session_scope() as session:
        session.execute(update(AdminSession).values(expires_at=utcnow() - timedelta(seconds=1)))
    assert client.post("/auth/totp", json={"code": "123456"},
                       headers=bearer(pending["session_token"])).status_code == 401


def test_sign_out_revokes(client, clock):
    _, secret = make_admin()
    headers = sign_in(client, clock, secret)
    assert client.post("/auth/logout", headers=headers).status_code == 200
    assert client.get("/auth/me", headers=headers).status_code == 401
    assert [e[1] for e in events("sign_out")] == ["success"]


def test_a_disabled_admin_is_signed_out(client, clock):
    admin_id, secret = make_admin()
    headers = sign_in(client, clock, secret)
    with session_scope() as session:
        session.execute(update(Admin).where(Admin.id == admin_id).values(active=False))
    assert client.get("/auth/me", headers=headers).status_code == 401


def test_garbage_tokens(client):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer nope"}).status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Basic abc"}).status_code == 401


# --- re-authentication ------------------------------------------------------------------------

def test_reauth_is_needed_for_sensitive_actions(client, clock, stub):
    _, secret = make_admin()
    headers = sign_in(client, clock, secret)
    resp = client.post(f"/applications/{stub.TENA}/approve", headers=headers)
    assert resp.status_code == 403 and resp.json()["error_code"] == "REAUTH_REQUIRED"
    assert stub.app.state.calls == []  # never reached the hospital service

    bad = client.post("/auth/reauth", json={"code": "000000"}, headers=headers)
    assert bad.status_code == 400
    reauth(client, clock, secret, headers)
    me = client.get("/auth/me", headers=headers).json()
    assert me["reauth_valid_until"] is not None
    assert client.post(f"/applications/{stub.TENA}/approve", headers=headers).status_code == 200
    assert [e[1] for e in events("reauth")] == ["failure", "success"]


def test_reauth_lasts_ten_minutes(client, clock, stub):
    _, secret = make_admin()
    headers = sign_in(client, clock, secret)
    reauth(client, clock, secret, headers)
    with session_scope() as session:
        session.execute(update(AdminSession).values(reauth_at=utcnow() - timedelta(minutes=10, seconds=1)))
    resp = client.post(f"/organisations/{stub.YEKATIT}/suspend", headers=headers)
    assert resp.status_code == 403 and resp.json()["error_code"] == "REAUTH_REQUIRED"


def test_reauth_refuses_a_replayed_code(client, clock):
    _, secret = make_admin()
    pending = password_step(client)
    used = code(secret, clock)
    resp = client.post("/auth/totp", json={"code": used}, headers=bearer(pending["session_token"]))
    headers = bearer(resp.json()["session_token"])
    assert client.post("/auth/reauth", json={"code": used}, headers=headers).status_code == 400


def test_reauth_belongs_to_one_session(client, clock, stub):
    _, secret = make_admin()
    first = sign_in(client, clock, secret)
    second = sign_in(client, clock, secret)
    reauth(client, clock, secret, first)
    assert client.post(f"/organisations/{stub.YEKATIT}/suspend", headers=second).status_code == 403


def test_failed_reauth_codes_lock_and_end_every_session(client, clock):
    _, secret = make_admin()
    headers = sign_in(client, clock, secret)
    for _ in range(4):
        assert client.post("/auth/reauth", json={"code": "000000"}, headers=headers).status_code == 400
    assert client.post("/auth/reauth", json={"code": "000000"}, headers=headers).status_code == 401
    assert client.get("/auth/me", headers=headers).status_code == 401


# --- setup links --------------------------------------------------------------------------------

def _link_token(link):
    return link.split("#", 1)[1]


def test_setup_link(client, clock):
    from app import cli

    link = cli.create_admin("fresh@endod.example", "Fresh Admin")
    assert link.startswith("https://admin.example/setup#")
    token = _link_token(link)
    check = client.post("/auth/setup/check", json={"token": token})
    assert check.status_code == 200 and check.json()["email"] == "fresh@endod.example"

    weak = client.post("/auth/setup", json={"token": token, "password": "password1"})
    assert weak.status_code == 400 and weak.json()["error_code"] == "WEAK_PASSWORD"
    resp = client.post("/auth/setup", json={"token": token, "password": "a long passphrase"})
    assert resp.status_code == 200 and resp.json()["stage"] == "enroll"
    # One use only.
    assert client.post("/auth/setup/check", json={"token": token}).status_code == 400
    assert client.post("/auth/setup", json={"token": token, "password": "another passphrase"}).status_code == 400
    # Then enrolment, as at any first sign-in.
    headers = bearer(resp.json()["session_token"])
    secret = client.post("/auth/enroll/start", headers=headers).json()["secret"]
    done = client.post("/auth/enroll/confirm", json={"code": code(secret, clock)}, headers=headers)
    assert done.status_code == 200 and len(done.json()["recovery_codes"]) == 10
    assert [e[1] for e in events("setup_completed")] == ["success"]


def test_expired_setup_link(client):
    from app import cli
    from app.models import SetupToken

    token = _link_token(cli.create_admin("fresh@endod.example", "Fresh Admin"))
    with session_scope() as session:
        session.execute(update(SetupToken).values(expires_at=utcnow() - timedelta(seconds=1)))
    resp = client.post("/auth/setup/check", json={"token": token})
    assert resp.status_code == 400 and resp.json()["error_code"] == "INVALID_SETUP_LINK"
    assert client.post("/auth/setup/check", json={"token": "x" * 43}).status_code == 400
    assert [e[1] for e in events("setup_link")] == ["failure", "failure"]


def test_setup_link_is_valid_for_24_hours(client):
    from app import cli
    from app.models import SetupToken

    cli.create_admin("fresh@endod.example", "Fresh Admin")
    with session_scope() as session:
        link = session.scalar(select(SetupToken))
        lifetime = link.expires_at - link.created_at
    assert timedelta(hours=23, minutes=59) < lifetime <= timedelta(hours=24)


def test_no_public_sign_up(client):
    paths = set(client.app.openapi()["paths"])
    assert not any("signup" in p or "register" in p for p in paths)
    assert client.post("/admins", json={"email": "x@y.z"}).status_code in (401, 405)
