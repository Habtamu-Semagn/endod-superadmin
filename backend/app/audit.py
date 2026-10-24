"""The audit log: every sign-in step, enrolment and action on a hospital."""

from __future__ import annotations

import ipaddress
import json
from typing import Any, Dict, Optional

from fastapi import Request

from app.models import AuditEvent, AuditResult

# Actions (the Audit logs screen filters by these).
SIGN_IN = "sign_in"
SIGN_IN_PASSWORD = "sign_in_password"
SIGN_OUT = "sign_out"
LOCKED_OUT = "account_locked"
BACKOFF = "account_backoff"
SETUP_LINK = "setup_link"
SETUP_COMPLETED = "setup_completed"
ENROLMENT_STARTED = "enrolment_started"
ENROLLED = "totp_enrolled"
REAUTH = "reauth"
APPROVE = "hospital_approve"
REJECT = "application_reject"
SUSPEND = "hospital_suspend"
DELETE = "hospital_delete"
DOCUMENT_VIEW = "document_view"
ADMIN_CREATED = "admin_created"
TWO_FACTOR_RESET = "admin_2fa_reset"
ADMIN_DISABLED = "admin_disabled"

ACTIONS = (
    SIGN_IN, SIGN_IN_PASSWORD, SIGN_OUT, LOCKED_OUT, BACKOFF, SETUP_LINK, SETUP_COMPLETED, ENROLMENT_STARTED,
    ENROLLED, REAUTH, APPROVE, REJECT, SUSPEND, DELETE, DOCUMENT_VIEW, ADMIN_CREATED, TWO_FACTOR_RESET,
    ADMIN_DISABLED,
)


def record(session, action: str, result: str, *, admin_id: Optional[str] = None,
           admin_email: Optional[str] = None, ip: Optional[str] = None, target_type: Optional[str] = None,
           target_id: Optional[str] = None, target_name: Optional[str] = None,
           detail: Optional[Dict[str, Any]] = None) -> None:
    assert result in AuditResult.ALL
    session.add(AuditEvent(
        action=action, result=result, admin_id=admin_id,
        admin_email=(admin_email or "")[:254] or None, ip=(ip or "")[:64] or None,
        target_type=target_type, target_id=(target_id or "")[:64] or None,
        target_name=(target_name or "")[:200] or None,
        detail=json.dumps(detail, ensure_ascii=False)[:4000] if detail else None,
    ))


CLIENT_IP_HEADER = "x-endod-client-ip"


def client_address(request: Request) -> str:
    """The visitor's address, as the web app's BFF says (X-Endod-Client-IP,
    which our nginx sets and the BFF passes on). Only requests carrying the
    BFF secret get this far (app.main), so nobody else can choose it.
    X-Forwarded-For is ignored."""
    value = request.headers.get(CLIENT_IP_HEADER, "").strip()
    try:
        return str(ipaddress.ip_address(value))
    except ValueError:
        return "unknown"
