"""SUPERADMIN_API_KEY is checked at start: 32+ characters, and its own value."""

import pytest
from conftest import BFF_SECRET, ORG_PLATFORM_KEY, PLATFORM_KEY

SESSION = "test-session-secret-0123456789abcdefghijklmnop"
EDGE = "edge-shared-secret-0123456789abcdefghijklmnop"


@pytest.mark.parametrize("value, name", [
    (SESSION, "SESSION_SECRET"), (BFF_SECRET, "BFF_SHARED_SECRET"), (PLATFORM_KEY + "x" * 32, None),
    (EDGE, "EDGE_SHARED_SECRET"),
])
def test_refused_when_it_reuses_another_secret(db, monkeypatch, value, name):
    from app.main import create_app

    long_platform = PLATFORM_KEY + "x" * 32
    monkeypatch.setenv("HOSPITAL_PLATFORM_KEY", long_platform)
    monkeypatch.setenv("EDGE_SHARED_SECRET", EDGE)
    monkeypatch.setenv("SUPERADMIN_API_KEY", value)
    with pytest.raises(RuntimeError, match=f"not that of {name or 'HOSPITAL_PLATFORM_KEY'}"):
        create_app()


def test_refused_when_it_is_the_tenacare_key(db, monkeypatch):
    from app.main import create_app

    monkeypatch.setenv("ORGANISATION_PLATFORM_KEY", ORG_PLATFORM_KEY + "y" * 32)
    monkeypatch.setenv("SUPERADMIN_API_KEY", ORG_PLATFORM_KEY + "y" * 32)
    with pytest.raises(RuntimeError, match="ORGANISATION_PLATFORM_KEY"):
        create_app()


@pytest.mark.parametrize("value", ["short", "x" * 31])
def test_refused_when_short(db, monkeypatch, value):
    from app.main import create_app

    monkeypatch.setenv("SUPERADMIN_API_KEY", value)
    with pytest.raises(RuntimeError, match="at least 32"):
        create_app()


def test_unset_or_own_value_starts(db, monkeypatch):
    from app.main import create_app

    monkeypatch.delenv("SUPERADMIN_API_KEY", raising=False)
    create_app()
    monkeypatch.setenv("SUPERADMIN_API_KEY", "an-own-superadmin-key-0123456789abcdef")
    create_app()
