"""Settings, read from the environment or ``.env``.

The names match deploy/.env.example: ADMIN_DATABASE_URL, HOSPITAL_API_URL,
HOSPITAL_PLATFORM_KEY, SESSION_SECRET and SITE_ORIGIN; the rest have safe
defaults and are prefixed ``ADMIN_``.
"""

from __future__ import annotations

from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

#: Placeholder used only outside production when SESSION_SECRET is unset.
DEV_SESSION_SECRET = "dev-only-session-secret-change-me-0123456789"


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

    #: Keys the hashes of session tokens, setup links and recovery codes, and
    #: encrypts TOTP secrets at rest (via HKDF, a separate key for each use).
    #: Changing it signs everyone out and voids every enrolled authenticator.
    SESSION_SECRET: Optional[str] = None
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

    #: Failed sign-in steps (password, TOTP) before an account is locked, and for how long.
    ADMIN_LOCKOUT_ATTEMPTS: int = 5
    ADMIN_LOCKOUT_MINUTES: int = 15
    #: Failed sign-in steps from one address within the window before it is refused (429).
    ADMIN_IP_FAILURE_LIMIT: int = 20
    ADMIN_IP_WINDOW_MINUTES: int = 15

    #: Reverse proxies in front of the web app that append to X-Forwarded-For
    #: (Cloudflare, nginx; the web app passes the header on unchanged). The
    #: client address is the entry this many hops from the right; 0 trusts no header.
    ADMIN_TRUSTED_PROXY_HOPS: int = 0

    @field_validator("ADMIN_ENVIRONMENT", mode="before")
    @classmethod
    def _lower(cls, value):
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("SITE_ORIGIN", "HOSPITAL_API_URL", mode="before")
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


def get_settings() -> Settings:
    """Fresh each call: cheap, and tests can change the environment."""
    return Settings()
