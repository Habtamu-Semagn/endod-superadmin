"""A tiny stand-in for TenaCare's platform API (``/platform/...``), built to
docs/company-onboarding.md: the same shapes, ``{"detail": "..."}`` errors as
FastAPI gives them, approve and reject only from ``submitted`` (409
otherwise), 404 for unknown ids, and every call needs the right X-Platform-Key.

Used by the pytest suite (through httpx, see conftest.py) and, as a real
server, by the browser tests:

    python tests/organisation_stub.py <port>
"""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

KEY = os.environ.get("STUB_ORG_PLATFORM_KEY", "test-org-platform-key")

KINDS = ("trade_license", "tin_certificate", "authorization_letter")

#: A one-page PDF and a 1x1 PNG.
PDF = (b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj "
       b"3 0 obj<</Type/Page/MediaBox[0 0 200 200]/Parent 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n")
PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cf"
    "c0f01f0005000201e2a1a5d50000000049454e44ae426082")

ABAY = "1a" * 16       # submitted, PDF documents
HABESHA = "2b" * 16    # submitted, PNG documents
DRAFTCO = "3c" * 16    # draft, no documents
ETHIO = "4d" * 16      # approved (an active organisation)
SENT_BACK = "5e" * 16  # rejected
EVILCO = "6f" * 16     # submitted, an HTML "document"
DORMANT = "7a" * 16    # an organisation already suspended


def _application(cid: str, legal: str, status: str, *, sector: str, city: str, employees: int,
                 submitted: Optional[str], documents: str = "pdf", trade: Optional[str] = None,
                 reason: Optional[str] = None) -> Dict[str, Any]:
    slug = legal.split()[0].lower()
    return {
        "id": cid, "legal_name": legal, "trade_name": trade, "tin": str(int(cid[:8], 16)).zfill(10)[-10:],
        "sector": sector, "employee_count": employees, "city": city, "status": status,
        "submitted_at": submitted, "updated_at": submitted or "2026-10-18T09:00:00+00:00",
        "contact": {"full_name": f"{legal.split()[0]} Applicant", "title": "HR Manager",
                    "phone": "+251911223344", "email": f"hr@{slug}.example"},
        "business_license_number": f"BL/{slug.upper()}/2026", "address": f"Bole Road, {city}",
        "phone": "+251111234567", "email": f"info@{slug}.example", "rejection_reason": reason,
        "reviewed_at": None, "documents_kind": documents,
    }


def initial_state() -> Dict[str, Any]:
    applications = [
        _application(ABAY, "Abay Manufacturing PLC", "submitted", sector="manufacturing", city="Addis Ababa",
                     employees=240, submitted="2026-10-20T06:30:00+00:00", trade="Abay Mfg"),
        _application(HABESHA, "Habesha Logistics Share Company", "submitted", sector="transport", city="Adama",
                     employees=85, submitted="2026-10-21T08:00:00+00:00", documents="png"),
        _application(DRAFTCO, "Draft Trading PLC", "draft", sector="retail", city="Hawassa", employees=12,
                     submitted=None, documents="none"),
        _application(ETHIO, "Ethio Finance SC", "approved", sector="finance", city="Addis Ababa", employees=410,
                     submitted="2026-09-01T06:00:00+00:00"),
        _application(SENT_BACK, "Sent Back Services PLC", "rejected", sector="services", city="Bahir Dar",
                     employees=30, submitted="2026-10-10T06:00:00+00:00", reason="The TIN certificate is unreadable."),
        _application(EVILCO, "Evil Docs PLC", "submitted", sector="other", city="Gondar", employees=5,
                     submitted="2026-10-22T08:00:00+00:00", documents="html"),
    ]
    organisations = [
        {"id": ETHIO, "name": "Ethio Finance SC", "tin": "0444444444", "status": "active",
         "created_at": "2026-09-02T06:00:00+00:00", "employees": 312, "admins": 2},
        {"id": DORMANT, "name": "Dormant Textiles PLC", "tin": "0777777777", "status": "suspended",
         "created_at": "2026-08-01T06:00:00+00:00", "employees": 40, "admins": 1},
    ]
    return {"applications": {a["id"]: a for a in applications},
            "organisations": {o["id"]: o for o in organisations}, "reviewers": []}


app = FastAPI(title="TenaCare platform stub")
app.state.data = initial_state()
app.state.calls = []


def _err(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"detail": message})


@app.middleware("http")
async def platform_key(request: Request, call_next):
    if request.url.path.startswith("/platform/"):
        app.state.calls.append((request.method, request.url.path))
        if request.headers.get("x-platform-key") != KEY:
            return _err(401, "Not authenticated")
    return await call_next(request)


@app.get("/health")
def health():
    return {"status": "ok", "service": "tenacare-stub"}


@app.post("/__reset")
def reset():
    app.state.data = initial_state()
    app.state.calls = []
    return {"ok": True}


SUMMARY = ("id", "legal_name", "trade_name", "tin", "sector", "employee_count", "city", "status",
           "submitted_at", "updated_at", "contact")


def _documents(a: Dict[str, Any]) -> List[Dict[str, Any]]:
    if a["documents_kind"] == "none":
        return []
    ext = a["documents_kind"]
    content_type = {"pdf": "application/pdf", "png": "image/png", "html": "text/html"}[ext]
    return [{"kind": kind, "filename": f"{kind}.{ext}", "content_type": content_type, "size": 400,
             "uploaded_at": "2026-10-19T09:00:00+00:00"} for kind in KINDS]


def _detail(a: Dict[str, Any]) -> Dict[str, Any]:
    body = {key: a[key] for key in SUMMARY}
    body.update({key: a[key] for key in ("business_license_number", "address", "phone", "email",
                                         "rejection_reason", "reviewed_at")})
    body["documents"] = _documents(a)
    return body


def _find(cid: str) -> Optional[Dict[str, Any]]:
    return app.state.data["applications"].get(cid)


@app.get("/platform/applications")
def list_applications(status: Optional[str] = None):
    rows = sorted(app.state.data["applications"].values(), key=lambda a: a["updated_at"], reverse=True)
    return {"items": [{key: a[key] for key in SUMMARY} for a in rows if status is None or a["status"] == status]}


@app.get("/platform/applications/{cid}")
def read_application(cid: str):
    a = _find(cid)
    return _detail(a) if a else _err(404, "Application not found.")


@app.get("/platform/applications/{cid}/documents/{kind}")
def read_document(cid: str, kind: str):
    a = _find(cid)
    if a is None:
        return _err(404, "Application not found.")
    if kind not in KINDS or a["documents_kind"] == "none":
        return _err(404, "Document not found.")
    if a["documents_kind"] == "html":
        body, media = b"<html><script>alert(document.cookie)</script></html>", "text/html"
    elif a["documents_kind"] == "png":
        body, media = PNG, "image/png"
    else:
        body, media = PDF, "application/pdf"
    return Response(content=body, media_type=media, headers={
        "Content-Disposition": f'attachment; filename="{kind}.{a["documents_kind"]}"',
        "X-Content-Type-Options": "nosniff",
    })


async def _reviewer(request: Request) -> Optional[str]:
    try:
        body = await request.json()
    except ValueError:
        return None
    reviewer = body.get("reviewer") if isinstance(body, dict) else None
    return reviewer if isinstance(reviewer, str) and reviewer else None


@app.post("/platform/applications/{cid}/approve")
async def approve(cid: str, request: Request):
    reviewer = await _reviewer(request)
    if reviewer is None:
        return _err(422, "reviewer is required")
    a = _find(cid)
    if a is None:
        return _err(404, "Application not found.")
    if a["status"] != "submitted":
        return _err(409, f"Only a submitted application can be approved (status: {a['status']}).")
    a["status"] = "approved"
    a["reviewed_at"] = "2026-10-26T09:00:00+00:00"
    app.state.data["reviewers"].append(("approve", cid, reviewer))
    app.state.data["organisations"][cid] = {"id": cid, "name": a["legal_name"], "tin": a["tin"],
                                            "status": "active", "created_at": a["updated_at"],
                                            "employees": 0, "admins": 1}
    return {"status": "approved"}


@app.post("/platform/applications/{cid}/reject")
async def reject(cid: str, request: Request):
    try:
        body = await request.json()
    except ValueError:
        body = {}
    reason = body.get("reason") if isinstance(body, dict) else None
    reviewer = body.get("reviewer") if isinstance(body, dict) else None
    if not isinstance(reason, str) or not 3 <= len(reason) <= 1000 or not reviewer:
        return _err(422, "reason (3-1000 characters) and reviewer are required")
    a = _find(cid)
    if a is None:
        return _err(404, "Application not found.")
    if a["status"] != "submitted":
        return _err(409, f"Only a submitted application can be rejected (status: {a['status']}).")
    a["status"] = "rejected"
    a["rejection_reason"] = reason
    a["reviewed_at"] = "2026-10-26T09:00:00+00:00"
    app.state.data["reviewers"].append(("reject", cid, reviewer))
    return {"status": "rejected"}


@app.get("/platform/organisations")
def list_organisations():
    rows = sorted(app.state.data["organisations"].values(), key=lambda o: o["created_at"], reverse=True)
    return {"items": rows}


async def _set_org(cid: str, request: Request, status: str):
    reviewer = await _reviewer(request)
    if reviewer is None:
        return _err(422, "reviewer is required")
    org = app.state.data["organisations"].get(cid)
    if org is None:
        return _err(404, "Organisation not found.")
    org["status"] = status
    app.state.data["reviewers"].append((status, cid, reviewer))
    return {"id": cid, "status": status}


@app.post("/platform/organisations/{cid}/suspend")
async def suspend(cid: str, request: Request):
    return await _set_org(cid, request, "suspended")


@app.post("/platform/organisations/{cid}/reactivate")
async def reactivate(cid: str, request: Request):
    return await _set_org(cid, request, "active")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=int(sys.argv[1]) if len(sys.argv) > 1 else 8133, log_level="warning")
