"""The admin service API (run with ``uvicorn app.main:app``).

Only the admin web app calls it (its server side, on the compose network);
browsers never do, so there is no CORS. Sessions travel in the
Authorization header from the web app, which keeps them in an httpOnly cookie.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.api import admins, audit_log, auth, hospitals
from app.config import Settings, get_settings
from app.errors import ApiError

logger = logging.getLogger("admin")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    # Fail at start, not at the first sign-in, when the secret is missing in production.
    settings.session_secret()
    app = FastAPI(
        title="Endod Admin Service",
        version="0.1.0",
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
    )

    @app.exception_handler(ApiError)
    async def api_error(request: Request, exc: ApiError):
        return JSONResponse(status_code=exc.status_code, content={"error": exc.message, "error_code": exc.code},
                            headers={"Cache-Control": "no-store"})

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        message = exc.detail if isinstance(exc.detail, str) else "Request failed."
        return JSONResponse(status_code=exc.status_code, headers=getattr(exc, "headers", None),
                            content={"error": message, "error_code": f"HTTP_{exc.status_code}"})

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        first = exc.errors()[0] if exc.errors() else {}
        field = ".".join(str(part) for part in first.get("loc", [])[1:]) or "request"
        # Never echo the input back (it may be a password).
        return JSONResponse(status_code=422, content={
            "error": f"{field}: {first.get('msg', 'invalid value')}", "error_code": "VALIDATION_ERROR",
        })

    @app.exception_handler(Exception)
    async def unexpected(request: Request, exc: Exception):
        logger.exception("unhandled_error path=%s", request.url.path)
        return JSONResponse(status_code=500, content={"error": "Internal server error.", "error_code": "INTERNAL"})

    @app.get("/health", tags=["service"])
    def health():
        return {"status": "ok", "service": "admin"}

    app.include_router(auth.router)
    app.include_router(hospitals.router)
    app.include_router(audit_log.router)
    app.include_router(admins.router)
    return app


app = create_app()
