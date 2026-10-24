"""`/audit`: the audit log, newest first, filtered and paged."""

from __future__ import annotations

import json
import re
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import AwareDatetime
from sqlalchemy import func, or_, select

from app import audit
from app.auth import Principal, current_admin
from app.db import iso, session_scope
from app.errors import ApiError
from app.models import AuditEvent, AuditResult

router = APIRouter(tags=["audit"])

MAX_PAGE_SIZE = 100


def _payload(event: AuditEvent) -> Dict[str, Any]:
    try:
        detail = json.loads(event.detail) if event.detail else None
    except ValueError:
        detail = None
    return {
        "id": event.id, "at": iso(event.at), "action": event.action, "result": event.result,
        "admin_id": event.admin_id, "admin_email": event.admin_email, "ip": event.ip,
        "target_type": event.target_type, "target_id": event.target_id, "target_name": event.target_name,
        "detail": detail,
    }


@router.get("/audit")
def list_events(
    action: Optional[str] = Query(default=None, max_length=64),
    result: Optional[str] = Query(default=None, max_length=16),
    q: Optional[str] = Query(default=None, max_length=100),
    since: Optional[AwareDatetime] = Query(default=None),
    until: Optional[AwareDatetime] = Query(default=None),
    page: int = Query(default=1, ge=1, le=100000),
    page_size: int = Query(default=25, ge=1, le=MAX_PAGE_SIZE),
    _: Principal = Depends(current_admin),
) -> Dict[str, Any]:
    if action is not None and action not in audit.ACTIONS:
        raise ApiError(400, f"action must be one of {list(audit.ACTIONS)}.", "VALIDATION_ERROR")
    if result is not None and result not in AuditResult.ALL:
        raise ApiError(400, f"result must be one of {list(AuditResult.ALL)}.", "VALIDATION_ERROR")
    filters = []
    if action:
        filters.append(AuditEvent.action == action)
    if result:
        filters.append(AuditEvent.result == result)
    if since:
        filters.append(AuditEvent.at >= since)
    if until:
        filters.append(AuditEvent.at < until)
    if q and q.strip():
        like = "%" + re.sub(r"[\\%_]", "", q.strip().lower()) + "%"
        filters.append(or_(func.lower(AuditEvent.admin_email).like(like), func.lower(AuditEvent.target_name).like(like),
                           AuditEvent.target_id.like(like), AuditEvent.ip.like(like)))
    with session_scope() as session:
        total = session.scalar(select(func.count()).select_from(AuditEvent).where(*filters)) or 0
        rows = session.scalars(select(AuditEvent).where(*filters)
                               .order_by(AuditEvent.at.desc(), AuditEvent.id.desc())
                               .offset((page - 1) * page_size).limit(page_size)).all()
        counts = dict(session.execute(select(AuditEvent.result, func.count()).group_by(AuditEvent.result)).all())
        sign_in_failures = session.scalar(select(func.count()).select_from(AuditEvent).where(
            AuditEvent.action == audit.SIGN_IN, AuditEvent.result == AuditResult.FAILURE)) or 0
        return {
            "items": [_payload(e) for e in rows],
            "total": total,
            "page": page,
            "page_size": page_size,
            "actions": list(audit.ACTIONS),
            "totals": {
                "all": sum(counts.values()),
                "success": counts.get(AuditResult.SUCCESS, 0),
                "failure": counts.get(AuditResult.FAILURE, 0),
                "sign_in_failures": sign_in_failures,
            },
        }

