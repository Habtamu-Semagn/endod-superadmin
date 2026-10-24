"""`/admins`: the admin accounts (read-only; managed with ``python -m app.cli``)."""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.auth import Principal, current_admin
from app.db import ensure_aware, iso, session_scope, utcnow
from app.models import Admin, LoginThrottle

router = APIRouter(tags=["admins"])


@router.get("/admins")
def list_admins(_: Principal = Depends(current_admin)) -> List[Dict[str, Any]]:
    now = utcnow()
    with session_scope() as session:
        locked_pairs = set(session.scalars(select(LoginThrottle.admin_id).where(LoginThrottle.locked_until > now)))
        return [{
            "id": a.id, "email": a.email, "name": a.name, "active": a.active,
            "two_factor": a.totp_secret is not None,
            # Some address is locked out of it, or it is in backoff.
            "locked": a.id in locked_pairs or (a.backoff_until is not None and ensure_aware(a.backoff_until) > now),
            "last_login_at": iso(a.last_login_at), "created_at": iso(a.created_at),
        } for a in session.scalars(select(Admin).order_by(Admin.created_at))]
