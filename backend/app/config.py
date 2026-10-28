"""Settings, read from the environment or ``.env``.

The names match deploy/.env.example: ADMIN_DATABASE_URL, HOSPITAL_API_URL,
HOSPITAL_PLATFORM_KEY, ORGANISATION_API_URL, ORGANISATION_PLATFORM_KEY,
PLATFORM_API_URL, SUPERADMIN_API_KEY, SESSION_SECRET and SITE_ORIGIN; the rest have safe
defaults and are prefixed ``ADMIN_``.
"""

from __future__ import annotations

import hmac
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

#: Placeholder used only outside production when SESSION_SECRET is unset.
DEV_SESSION_SECRET = "dev-only-session-secret-change-me-0123456789"
#: The same for BFF_SHARED_SECRET (the web app's default in development).
DEV_BFF_SECRET = "dev-only-bff-secret-change-me-0123456789abcd"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ADMIN_ENVIRONMENT: str = "development"
    #: SQLAlchemy URL of this service's own database, e.g.
    #: ``postgresql+psycopg://admin:pw@postgres:5432/admin``.
    ADMIN_DATABASE_URL: Optional[str] = None

    #: The hospital service's platform API, on the private bus network.
    HOSPITAL_API_URL: str = "http://endod-hospital-api:8000"
    #: Sent as X-Platform-Key. Never leaves this service.
    HOSPITAL_PLATFORM_KEY: Optional[str] = None
    #: Seconds to wait for the hospital service.
    HOSPITAL_API_TIMEOUT: float = 15.0

    #: TenaCare's platform API (company applications and organisations), on
    #: the same bus network. docs/company-onboarding.md is the contract.
    ORGANISATION_API_URL: str = "http://endod-organisation-api:8000"
    #: Sent as X-Platform-Key (TenaCare's ORG_PLATFORM_KEY). Never leaves this
    #: service. Unset: the company routes answer 503, the hospital side works.
    ORGANISATION_PLATFORM_KEY: Optional[str] = None
    #: Seconds to wait for TenaCare.
    ORGANISATION_API_TIMEOUT: float = 15.0

    #: The patient platform's internal API (its internal-api service), on the
    #: same bus network: /internal/admin (patient accounts, counts, cards, health).
    PLATFORM_API_URL: str = "http://endod-platform-api:8000"
    #: Sent as X-Superadmin-Key (the platform's SUPERADMIN_API_KEY, the same value).
    #: Never leaves this service. Unset: the patient pages answer 503.
    SUPERADMIN_API_KEY: Optional[str] = None
    #: Seconds to wait for the patient platform.
    PLATFORM_API_TIMEOUT: float = 15.0
    #: Only read to refuse a SUPERADMIN_API_KEY with the same value (the web
    #: app holds it; compose does not give it to the API).
    EDGE_SHARED_SECRET: Optional[str] = None
    #: Seconds each service's health check may take (System monitoring).
    HEALTH_CHECK_TIMEOUT: float = 5.0

    #: Keys the hashes of session tokens, setup links and recovery codes, and
    #: encrypts TOTP secrets at rest (via HKDF, a separate key for each use).
    #: Changing it signs everyone out and voids every enrolled authenticator.
    SESSION_SECRET: Optional[str] = None
    #: Shared with the web app (its BFF sends it as X-BFF-Secret). Every request
    #: but /health without it is refused, so nothing else on the networks this
    #: API joins can call it, and only the BFF says who the client is.
    BFF_SHARED_SECRET: Optional[str] = None
    #: The admin site's public origin; setup links point at it.
    SITE_ORIGIN: str = "http://localhost:3000"

    #: Sessions: idle timeout and absolute limit.
    ADMIN_SESSION_IDLE_MINUTES: int = 30
    ADMIN_SESSION_MAX_HOURS: int = 12
    #: A half-finished sign-in (password given, TOTP or enrolment pending).
    ADMIN_PENDING_SESSION_MINUTES: int = 15
    #: A fresh TOTP is needed this recently before approve, reject, suspend or delete.
    ADMIN_REAUTH_MINUTES: int = 10
    #: Setup links from ``create-admin`` / ``reset-2fa``.
    ADMIN_SETUP_LINK_HOURS: int = 24

    #: Failed sign-in steps (password, code) against one account from one
    #: address before that pair is locked, and for how long.
    ADMIN_LOCKOUT_ATTEMPTS: int = 5
    ADMIN_LOCKOUT_MINUTES: int = 15
    #: Per-account backoff: from this many recent failures (any address),
    #: base * 2^(n - after) seconds, at most max; failures older than the window are forgotten.
    ADMIN_BACKOFF_AFTER: int = 3
    ADMIN_BACKOFF_BASE_SECONDS: int = 30
    ADMIN_BACKOFF_MAX_SECONDS: int = 900
    ADMIN_BACKOFF_WINDOW_MINUTES: int = 60
    #: Failed sign-in steps from one address within the window before it is refused (429).
    ADMIN_IP_FAILURE_LIMIT: int = 20
    ADMIN_IP_WINDOW_MINUTES: int = 15

    @field_validator("ADMIN_ENVIRONMENT", mode="before")
    @classmethod
    def _lower(cls, value):
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("SITE_ORIGIN", "HOSPITAL_API_URL", "ORGANISATION_API_URL", "PLATFORM_API_URL", mode="before")
    @classmethod
    def _no_trailing_slash(cls, value):
        return value.strip().rstrip("/") if isinstance(value, str) else value

    @property
    def is_production(self) -> bool:
        return self.ADMIN_ENVIRONMENT == "production"

    def session_secret(self) -> str:
        secret = self.SESSION_SECRET or ""
        if len(secret) >= 32:
            return secret
        if self.is_production or secret:
            raise RuntimeError("SESSION_SECRET must be set to at least 32 random characters.")
        return DEV_SESSION_SECRET

    def check_superadmin_key(self) -> None:
        """Refuse to start with a SUPERADMIN_API_KEY that is too short or the
        value of another of this service's secrets. Unset is allowed: the
        patient pages then say "not connected yet"."""
        key = self.SUPERADMIN_API_KEY
        if not key:
            return
        if len(key) < 32:
            raise RuntimeError("SUPERADMIN_API_KEY must be at least 32 characters.")
        others = {
            "SESSION_SECRET": self.SESSION_SECRET, "BFF_SHARED_SECRET": self.BFF_SHARED_SECRET,
            "HOSPITAL_PLATFORM_KEY": self.HOSPITAL_PLATFORM_KEY,
            "ORGANISATION_PLATFORM_KEY": self.ORGANISATION_PLATFORM_KEY,
            "EDGE_SHARED_SECRET": self.EDGE_SHARED_SECRET,
        }
        for name, value in others.items():
            if value and hmac.compare_digest(value.encode(), key.encode()):
                raise RuntimeError(f"SUPERADMIN_API_KEY must be its own value, not that of {name}.")

    def bff_secret(self) -> str:
        secret = self.BFF_SHARED_SECRET or ""
        if len(secret) >= 32:
            return secret
        if self.is_production or secret:
            raise RuntimeError("BFF_SHARED_SECRET must be set to at least 32 random characters.")
        return DEV_BFF_SECRET


def get_settings() -> Settings:
    """Fresh each call: cheap, and tests can change the environment."""
    return Settings()
