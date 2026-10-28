"""Every route but the sign-in steps needs a session; every admin route needs a full one."""

import re

import pytest
from conftest import BFF_SECRET, bearer, make_admin, password_step

#: Reachable without a session (they check a password or a setup link themselves).
PUBLIC = {("POST", "/auth/login"), ("POST", "/auth/setup/check"), ("POST", "/auth/setup"), ("GET", "/health")}
#: Reachable with a half-finished sign-in.
SIGN_IN_STEPS = {("POST", "/auth/totp"), ("POST", "/auth/enroll/start"), ("POST", "/auth/enroll/confirm"),
                 ("POST", "/auth/logout"), ("GET", "/auth/me")}

SAMPLE_ID = "a1" * 16


def _routes():
    from app.main import create_app

    found = []
    for template, operations in create_app().openapi()["paths"].items():
        for method in operations:
            path = re.sub(r"\{(hospital_id|company_id)\}", SAMPLE_ID, template)
            path = re.sub(r"\{dedan_id\}", "DE100001", path)
            path = re.sub(r"\{kind\}", "moh_license", path)
            found.append((method.upper(), template, path))
    return found


ROUTES = _routes()


def test_the_route_list_is_complete():
    assert len(ROUTES) >= 20


@pytest.mark.parametrize("method, template, path", [r for r in ROUTES if (r[0], r[1]) not in PUBLIC])
def test_needs_a_session(client, stub, org_stub, platform_stub, method, template, path):
    resp = client.request(method, path, json={})
    assert resp.status_code == 401, (method, path, resp.text)
    resp = client.request(method, path, json={}, headers={"Authorization": "Bearer not-a-session"})
    assert resp.status_code == 401
    assert stub.app.state.calls == [] and org_stub.app.state.calls == [] and platform_stub.app.state.calls == []


@pytest.mark.parametrize("method, template, path",
                         [r for r in ROUTES if (r[0], r[1]) not in PUBLIC | SIGN_IN_STEPS])
def test_needs_a_full_session(client, stub, org_stub, platform_stub, method, template, path):
    make_admin()
    pending = password_step(client)
    resp = client.request(method, path, json={}, headers=bearer(pending["session_token"]))
    assert resp.status_code == 403 and resp.json()["error_code"] == "SESSION_INCOMPLETE", (method, path)
    assert stub.app.state.calls == [] and org_stub.app.state.calls == [] and platform_stub.app.state.calls == []


@pytest.mark.parametrize("method, template, path", ROUTES)
def test_every_route_but_health_needs_the_bff_secret(db, stub, org_stub, platform_stub, method, template, path):
    from fastapi.testclient import TestClient

    from app.main import create_app

    bare = TestClient(create_app())
    for headers in ({}, {"X-BFF-Secret": "wrong"}, {"X-BFF-Secret": BFF_SECRET[:-1]}):
        resp = bare.request(method, path, json={}, headers=headers)
        if template == "/health":
            assert resp.status_code == 200
        else:
            assert resp.status_code == 403 and resp.json()["error_code"] == "BFF_REQUIRED", (method, path)
    assert stub.app.state.calls == [] and org_stub.app.state.calls == [] and platform_stub.app.state.calls == []


def test_production_needs_a_bff_secret(monkeypatch):
    from app.config import get_settings

    monkeypatch.setenv("ADMIN_ENVIRONMENT", "production")
    monkeypatch.setenv("SESSION_SECRET", "s" * 40)
    monkeypatch.delenv("BFF_SHARED_SECRET", raising=False)
    with pytest.raises(RuntimeError, match="BFF_SHARED_SECRET"):
        get_settings().bff_secret()
