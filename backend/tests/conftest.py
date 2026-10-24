import os
import sys
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

PASSWORD = "Correct-Horse-42"
PLATFORM_KEY = "test-platform-key"
BFF_SECRET = "test-bff-secret-0123456789abcdefghijklmnopqrst"
CLIENT_IP = "198.51.100.10"


def from_ip(ip):
    """Headers of a request the BFF passes on for a visitor at ``ip``."""
    return {"X-Endod-Client-IP": ip}


class Clock:
    """The TOTP clock, moved by hand (a code is good for one 30-second step)."""

    def __init__(self, start: float):
        self.now = start

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float = 30) -> None:
        self.now += seconds


@pytest.fixture
def db(tmp_path, monkeypatch):
    """A fresh database per test: SQLite by default, or the PostgreSQL
    database in ADMIN_TEST_DATABASE_URL (emptied before every test)."""
    from app import db as dbmod
    from app import models  # noqa: F401  (registers the tables)

    url = os.environ.get("ADMIN_TEST_DATABASE_URL") or f"sqlite:///{tmp_path / 'admin.db'}"
    monkeypatch.setenv("ADMIN_DATABASE_URL", url)
    monkeypatch.setenv("ADMIN_ENVIRONMENT", "development")
    monkeypatch.setenv("SESSION_SECRET", "test-session-secret-0123456789abcdefghijklmnop")
    monkeypatch.setenv("HOSPITAL_API_URL", "http://hospital.test")
    monkeypatch.setenv("HOSPITAL_PLATFORM_KEY", PLATFORM_KEY)
    monkeypatch.setenv("SITE_ORIGIN", "https://admin.example")
    monkeypatch.setenv("BFF_SHARED_SECRET", BFF_SECRET)
    dbmod.reset_engine()
    dbmod.Base.metadata.drop_all(dbmod.get_engine())
    dbmod.create_all()
    yield
    dbmod.reset_engine()


@pytest.fixture(autouse=True)
def clock(monkeypatch):
    import time

    from app import totp

    fake = Clock(float(int(time.time()) // 30 * 30 + 5))
    monkeypatch.setattr(totp, "_clock", fake)
    return fake


@pytest.fixture
def stub(monkeypatch):
    """The hospital platform stub (tests/hospital_stub.py), reached through httpx."""
    import hospital_stub

    from app import hospital

    hospital_stub.app.state.hospitals = hospital_stub.initial_state()
    hospital_stub.app.state.calls = []
    stub_client = TestClient(hospital_stub.app)

    def handler(request: httpx.Request) -> httpx.Response:
        answer = stub_client.request(request.method, str(request.url.copy_with(scheme="http", host="testserver")),
                                     headers=dict(request.headers), content=request.content)
        return httpx.Response(answer.status_code, headers=answer.headers, content=answer.content)

    monkeypatch.setattr(hospital, "transport", httpx.MockTransport(handler))
    return hospital_stub


@pytest.fixture
def client(db, stub):
    """The API as the BFF calls it: with the shared secret and the visitor's address."""
    from app.main import create_app

    return TestClient(create_app(), headers={"X-BFF-Secret": BFF_SECRET, "X-Endod-Client-IP": CLIENT_IP})


# --- helpers -----------------------------------------------------------------------------

def make_admin(email="ops@endod.example", name="Ops Admin", password=PASSWORD, enrolled=True, active=True):
    """An admin; returns (id, TOTP secret or None)."""
    from app import security, totp
    from app.db import session_scope
    from app.models import Admin

    secret = totp.new_secret() if enrolled else None
    with session_scope() as session:
        admin = Admin(email=email, name=name, active=active,
                      password_hash=security.hash_password(password) if password else None,
                      totp_secret=security.seal(secret) if secret else None)
        session.add(admin)
        session.flush()
        return admin.id, secret


def code(secret, clock, offset=0):
    from app import totp

    return totp.code_at(secret, totp.current_step(clock.now) + offset)


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def password_step(client, email="ops@endod.example", password=PASSWORD, headers=None):
    resp = client.post("/auth/login", json={"email": email, "password": password}, headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


def sign_in(client, clock, secret, email="ops@endod.example", password=PASSWORD, ip=CLIENT_IP):
    """Password and TOTP; returns the full session's headers. Moves the clock
    on a step so the next code is a new one."""
    pending = password_step(client, email, password, headers=from_ip(ip))
    assert pending["stage"] == "totp"
    resp = client.post("/auth/totp", json={"code": code(secret, clock)},
                       headers={**bearer(pending["session_token"]), **from_ip(ip)})
    assert resp.status_code == 200, resp.text
    clock.advance()
    return bearer(resp.json()["session_token"])


def reauth(client, clock, secret, headers):
    resp = client.post("/auth/reauth", json={"code": code(secret, clock)}, headers=headers)
    assert resp.status_code == 200, resp.text
    clock.advance()


def setup_token(link):
    return link.split("#", 1)[1]


def enrol_via_link(client, clock, link, password=PASSWORD):
    """Open the setup link with ``password`` (sets or confirms it), enrol;
    returns (full session headers, TOTP secret, recovery codes)."""
    resp = client.post("/auth/setup", json={"token": setup_token(link), "password": password})
    assert resp.status_code == 200, resp.text
    headers = bearer(resp.json()["session_token"])
    secret = client.post("/auth/enroll/start", headers=headers).json()["secret"]
    done = client.post("/auth/enroll/confirm", json={"code": code(secret, clock)}, headers=headers)
    assert done.status_code == 200, done.text
    clock.advance()
    return bearer(done.json()["session_token"]), secret, done.json()["recovery_codes"]


def events(action=None):
    from sqlalchemy import select

    from app.db import session_scope
    from app.models import AuditEvent

    with session_scope() as session:
        query = select(AuditEvent).order_by(AuditEvent.at)
        if action:
            query = query.where(AuditEvent.action == action)
        return [(e.action, e.result, e.admin_email, e.target_id, e.detail) for e in session.scalars(query)]
