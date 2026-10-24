import io
import os
import subprocess
import sys
from pathlib import Path

import pytest
from conftest import bearer, code, events, password_step
from sqlalchemy import select

from app import cli
from app.db import session_scope
from app.models import Admin, AdminSession


def run(*argv, stdin=""):
    out = io.StringIO()
    status = cli.main(list(argv), stdin=io.StringIO(stdin), stdout=out)
    return status, out.getvalue()


def test_create_admin_prints_a_setup_link(client):
    status, out = run("create-admin", "--email", "Ops@Endod.Example", "--name", "Ops  Person")
    assert status == 0
    link = out.strip().splitlines()[-1]
    assert link.startswith("https://admin.example/setup#") and len(link.split("#")[1]) >= 40
    with session_scope() as session:
        admin = session.scalar(select(Admin))
        assert (admin.email, admin.name, admin.password_hash, admin.totp_secret) == (
            "ops@endod.example", "Ops Person", None, None)
    assert client.post("/auth/setup/check", json={"token": link.split("#")[1]}).status_code == 200
    # Without a password, nobody can sign in yet.
    assert client.post("/auth/login", json={"email": "ops@endod.example", "password": "anything-at-all"}
                       ).status_code == 401
    assert [e[:2] for e in events("admin_created")] == [("admin_created", "success")]


def test_create_admin_with_password_from_stdin(client, clock):
    status, out = run("create-admin", "--email", "ops@endod.example", "--name", "Ops",
                      "--password-stdin", stdin="a long passphrase\n")
    assert status == 0
    assert "a long passphrase" not in out and "setup#" not in out
    with session_scope() as session:
        assert session.scalar(select(Admin.password_hash)).startswith("$argon2id$")
    # First sign-in: straight to enrolment, nothing else reachable.
    pending = password_step(client, "ops@endod.example", "a long passphrase")
    assert pending["stage"] == "enroll"
    headers = bearer(pending["session_token"])
    assert client.get("/organisations", headers=headers).status_code == 403
    secret = client.post("/auth/enroll/start", headers=headers).json()["secret"]
    done = client.post("/auth/enroll/confirm", json={"code": code(secret, clock)}, headers=headers)
    assert done.status_code == 200 and len(done.json()["recovery_codes"]) == 10


def test_password_stdin_follows_the_policy(db):
    with pytest.raises(SystemExit, match="too common"):
        run("create-admin", "--email", "ops@endod.example", "--name", "Ops", "--password-stdin", stdin="password1\n")
    with pytest.raises(SystemExit, match="email"):
        run("create-admin", "--email", "ops@endod.example", "--name", "Ops", "--password-stdin",
            stdin="ops@endod.example")
    with pytest.raises(SystemExit, match="at least 8"):
        run("create-admin", "--email", "ops@endod.example", "--name", "Ops", "--password-stdin", stdin="short\n")
    with pytest.raises(SystemExit, match="No password"):
        run("create-admin", "--email", "ops@endod.example", "--name", "Ops", "--password-stdin", stdin="")
    with session_scope() as session:
        assert session.scalar(select(Admin)) is None


def test_there_is_no_password_argument(db, capsys):
    with pytest.raises(SystemExit):
        run("create-admin", "--email", "ops@endod.example", "--name", "Ops", "--password", "a long passphrase")


def test_duplicate_and_invalid_email(db):
    run("create-admin", "--email", "ops@endod.example", "--name", "Ops")
    with pytest.raises(SystemExit, match="already exists"):
        run("create-admin", "--email", "OPS@endod.example", "--name", "Ops")
    with pytest.raises(SystemExit, match="not a valid email"):
        run("create-admin", "--email", "not-an-email", "--name", "Ops")


def test_reset_2fa(client, clock):
    run("create-admin", "--email", "ops@endod.example", "--name", "Ops", "--password-stdin", stdin="a long passphrase")
    pending = password_step(client, "ops@endod.example", "a long passphrase")
    headers = bearer(pending["session_token"])
    secret = client.post("/auth/enroll/start", headers=headers).json()["secret"]
    full = client.post("/auth/enroll/confirm", json={"code": code(secret, clock)}, headers=headers).json()

    status, out = run("reset-2fa", "--email", "ops@endod.example")
    assert status == 0 and "setup#" in out
    # Signed out, authenticator and password void: only the new link gets back in.
    assert client.get("/auth/me", headers=bearer(full["session_token"])).status_code == 401
    assert client.post("/auth/login", json={"email": "ops@endod.example", "password": "a long passphrase"}
                       ).status_code == 401
    token = out.strip().splitlines()[-1].split("#")[1]
    resp = client.post("/auth/setup", json={"token": token, "password": "a new passphrase"})
    assert resp.status_code == 200 and resp.json()["stage"] == "enroll"
    assert [e[1] for e in events("admin_2fa_reset")] == ["success"]


def test_disable(client, clock):
    run("create-admin", "--email", "ops@endod.example", "--name", "Ops", "--password-stdin", stdin="a long passphrase")
    pending = password_step(client, "ops@endod.example", "a long passphrase")
    status, out = run("disable", "--email", "ops@endod.example")
    assert status == 0 and "disabled" in out
    assert client.get("/auth/me", headers=bearer(pending["session_token"])).status_code == 401
    assert client.post("/auth/login", json={"email": "ops@endod.example", "password": "a long passphrase"}
                       ).status_code == 401
    with session_scope() as session:
        assert all(s.revoked_at is not None for s in session.scalars(select(AdminSession)))
    with pytest.raises(SystemExit, match="No admin"):
        run("disable", "--email", "nobody@endod.example")


def test_list(db):
    assert run("list")[1].strip() == "No admins."
    run("create-admin", "--email", "ops@endod.example", "--name", "Ops Person")
    run("create-admin", "--email", "two@endod.example", "--name", "Two")
    run("disable", "--email", "two@endod.example")
    lines = run("list")[1].strip().splitlines()
    assert lines[0].startswith("ops@endod.example") and "active" in lines[0] and "no-2fa" in lines[0]
    assert "disabled" in lines[1] and "never" in lines[1]


def test_runs_as_a_module(db, tmp_path):
    """`python -m app.cli` with the password on stdin, as an operator would run it."""
    backend = Path(__file__).resolve().parents[1]
    env = {**os.environ}
    result = subprocess.run(
        [sys.executable, "-m", "app.cli", "create-admin", "--email", "cli@endod.example", "--name", "Cli",
         "--password-stdin"],
        input="a long passphrase\n", capture_output=True, text=True, cwd=backend, env=env, timeout=60)
    assert result.returncode == 0, result.stderr
    assert "a long passphrase" not in result.stdout + result.stderr
    with session_scope() as session:
        assert session.scalar(select(Admin.email)) == "cli@endod.example"
