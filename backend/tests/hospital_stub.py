"""A tiny stand-in for the hospital service's platform API (``/platform/...``).

It answers in the same shapes and with the same rules as
Hospital-service/backend-hospital (app/api/onboarding.py, app/api/application.py):
approving needs a submitted application (409 otherwise), only a submitted
application can be sent back, only a pending sign-up can be deleted, and every
call needs the right X-Platform-Key.

Used by the pytest suite (through httpx, see conftest.py) and, as a real
server, by the browser tests:

    python tests/hospital_stub.py <port>
"""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

KEY = os.environ.get("STUB_PLATFORM_KEY", "test-platform-key")

KINDS = {
    "moh_license": "Ministry of Health facility license",
    "trade_license": "Business / trade license",
    "tin_certificate": "TIN certificate",
    "owner_id": "Owner or manager's ID",
}

#: A one-page PDF and a 1x1 PNG.
PDF = (b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj "
       b"3 0 obj<</Type/Page/MediaBox[0 0 200 200]/Parent 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n")
PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cf"
    "c0f01f0005000201e2a1a5d50000000049454e44ae426082")

TENA = "a1" * 16
BETHEL = "b2" * 16
DRAFT = "c3" * 16
YEKATIT = "d4" * 16
SELAM = "e5" * 16
EVIL = "f6" * 16


def _hospital(hid: str, code: str, name: str, status: str, app_status: Optional[str], *, city: str,
              facility_type: str = "hospital", submitted: Optional[str] = None, demo: Optional[str] = None,
              documents: str = "pdf", lat: float = 9.0108, lon: float = 38.7613) -> Dict[str, Any]:
    return {
        "id": hid, "code": code, "name": name, "status": status, "app_status": app_status,
        "facility_type": facility_type, "kind": "private", "city": city,
        "address": f"Bole Road, {city}", "phone": "+251111234567", "latitude": lat, "longitude": lon,
        "services": ["general_medicine", "laboratory"], "open_hours": "Mon-Sat 08:00-18:00",
        "created_at": "2026-10-01T07:00:00+00:00", "submitted_at": submitted, "demo_at": demo,
        "rejection_reason": None, "license_number": f"MOH/{code}/2026",
        "contact": {"name": f"{name.split()[0]} Contact", "title": "Medical Director",
                    "email": f"contact@{code.lower()}.example", "phone": "+251911223344"},
        "documents": documents,
    }


def initial_state() -> Dict[str, Dict[str, Any]]:
    rows = [
        _hospital(TENA, "TENA", "Tena Clinic", "pending", "submitted", city="Addis Ababa", facility_type="clinic",
                  submitted="2026-10-20T06:30:00+00:00", demo="2026-10-27T10:00:00+03:00"),
        _hospital(BETHEL, "BGH", "Bethel General Hospital", "pending", "submitted", city="Adama",
                  submitted="2026-10-21T08:00:00+00:00", demo="2026-10-28T14:30:00+03:00", documents="png"),
        _hospital(DRAFT, "ADC", "Abebe Draft Clinic", "pending", "draft", city="Hawassa", facility_type="clinic",
                  documents="none"),
        _hospital(YEKATIT, "YEK", "Yekatit Hospital", "approved", "approved", city="Addis Ababa",
                  submitted="2026-09-01T06:00:00+00:00"),
        _hospital(SELAM, "SEL", "Selam Clinic", "suspended", None, city="Bahir Dar", facility_type="clinic"),
        _hospital(EVIL, "EVL", "Evil Docs Clinic", "pending", "submitted", city="Gondar",
                  submitted="2026-10-22T08:00:00+00:00", documents="html"),
    ]
    return {row["id"]: row for row in rows}


app = FastAPI(title="Hospital platform stub")
app.state.hospitals = initial_state()
app.state.calls = []


def _err(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message, "error_code": f"HTTP_{status}"})


@app.middleware("http")
async def platform_key(request: Request, call_next):
    if request.url.path.startswith("/platform/"):
        app.state.calls.append((request.method, request.url.path))
        if request.headers.get("x-platform-key") != KEY:
            return _err(401, "Authentication required.")
    return await call_next(request)


@app.get("/health")
def health():
    return {"status": "ok", "service": "hospital-stub"}


@app.post("/__reset")
def reset():
    app.state.hospitals = initial_state()
    app.state.calls = []
    return {"ok": True}


def _status_of(h: Dict[str, Any]) -> str:
    if h["app_status"] == "approved":
        return "approved"
    if h["status"] == "suspended":
        return "suspended"
    return h["app_status"] or ("approved" if h["status"] == "approved" else "draft")


def _hospital_payload(h: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": h["id"], "code": h["code"], "name": h["name"], "name_am": None, "timezone": "Africa/Addis_Ababa",
        "directory_facility_id": None, "status": h["status"], "listed": h["status"] == "approved",
        "missing_for_listing": [], "kind": h["kind"], "facility_type": h["facility_type"], "city": h["city"],
        "address": h["address"], "phone": h["phone"], "ambulance_phone": None, "emergency": False,
        "latitude": h["latitude"], "longitude": h["longitude"], "services": h["services"],
        "open_hours": h["open_hours"], "video_enabled": False, "price_in_person": "350.00",
        "price_video": None, "queue_notify_ahead": 3,
    }


def _documents(h: Dict[str, Any]) -> List[Dict[str, Any]]:
    items = []
    for kind, label in KINDS.items():
        item: Dict[str, Any] = {"kind": kind, "label": label, "uploaded": h["documents"] != "none"}
        if item["uploaded"]:
            content_type = {"pdf": "application/pdf", "png": "image/png", "html": "text/html"}[h["documents"]]
            item.update({"filename": f"{kind}.{h['documents']}", "content_type": content_type, "size": 400,
                         "sha256": "0" * 64, "uploaded_at": "2026-10-19T09:00:00+00:00",
                         "download": f"/platform/applications/{h['id']}/documents/{kind}"})
        items.append(item)
    return items


def _application_payload(h: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "hospital_id": h["id"], "code": h["code"], "name": h["name"], "status": _status_of(h),
        "hospital_status": h["status"], "next_step": "review", "missing": {}, "complete": True,
        "created_at": h["created_at"], "submitted_at": h["submitted_at"], "rejected_at": None,
        "rejection_reason": h["rejection_reason"],
        "contact": {"full_name": h["contact"]["name"], "title": h["contact"]["title"],
                    "phone": h["contact"]["phone"], "email": h["contact"]["email"]},
        "facility": {"facility_type": h["facility_type"], "ownership": h["kind"], "name": h["name"],
                     "name_am": None, "city": h["city"], "phone": h["phone"], "services": h["services"],
                     "open_hours": h["open_hours"]},
        "location": {"address": h["address"], "latitude": h["latitude"], "longitude": h["longitude"]},
        "documents": {"license_number": h["license_number"], "items": _documents(h)},
        "demo": None if not h["demo_at"] else {"booking_id": "9" * 32, "demo_at": h["demo_at"],
                                                "timezone": "Africa/Addis_Ababa", "minutes": 30},
    }


def _find(hospital_id: str) -> Optional[Dict[str, Any]]:
    return app.state.hospitals.get(hospital_id)


@app.get("/platform/hospitals")
def list_hospitals(status: Optional[str] = None):
    rows = sorted(app.state.hospitals.values(), key=lambda h: h["created_at"], reverse=True)
    return [{**_hospital_payload(h), "created_at": h["created_at"],
             "contact": {"name": h["contact"]["name"], "email": h["contact"]["email"], "phone": h["contact"]["phone"]}}
            for h in rows if status is None or h["status"] == status]


def _set_status(hospital_id: str, new_status: str):
    h = _find(hospital_id)
    if h is None:
        return _err(404, "Hospital not found.")
    if new_status == "approved" and h["app_status"] not in ("submitted", "approved", None):
        return _err(409, "The hospital's application is not submitted yet (status: "
                         f"{h['app_status']}); only a submitted application can be approved.")
    h["status"] = new_status
    if new_status == "approved" and h["app_status"] is not None:
        h["app_status"] = "approved"
    return _hospital_payload(h)


@app.post("/platform/hospitals/{hospital_id}/approve")
def approve(hospital_id: str):
    return _set_status(hospital_id, "approved")


@app.post("/platform/hospitals/{hospital_id}/suspend")
def suspend(hospital_id: str):
    return _set_status(hospital_id, "suspended")


@app.delete("/platform/hospitals/{hospital_id}")
def remove(hospital_id: str):
    h = _find(hospital_id)
    if h is None:
        return _err(404, "Hospital not found.")
    if h["status"] != "pending":
        return _err(409, "Only a pending sign-up can be deleted; suspend instead.")
    del app.state.hospitals[hospital_id]
    return {"deleted": hospital_id}


@app.get("/platform/applications")
def list_applications(status: Optional[str] = None):
    rows = sorted(app.state.hospitals.values(), key=lambda h: h["created_at"], reverse=True)
    result = []
    for h in rows:
        if h["status"] != "pending" and h["app_status"] is None:
            continue
        result.append({
            "hospital_id": h["id"], "code": h["code"], "name": h["name"], "facility_type": h["facility_type"],
            "ownership": h["kind"], "city": h["city"], "status": _status_of(h), "hospital_status": h["status"],
            "created_at": h["created_at"], "submitted_at": h["submitted_at"], "demo_at": h["demo_at"],
            "contact": {"name": h["contact"]["name"], "title": h["contact"]["title"],
                        "email": h["contact"]["email"], "phone": h["contact"]["phone"]},
        })
    return [r for r in result if status is None or r["status"] == status]


@app.get("/platform/applications/{hospital_id}")
def read_application(hospital_id: str):
    h = _find(hospital_id)
    if h is None:
        return _err(404, "Application not found.")
    return _application_payload(h)


@app.get("/platform/applications/{hospital_id}/documents/{kind}")
def read_document(hospital_id: str, kind: str):
    h = _find(hospital_id)
    if h is None:
        return _err(404, "Application not found.")
    if kind not in KINDS or h["documents"] == "none":
        return _err(404, "Document not found.")
    if h["documents"] == "html":
        body, media = b"<html><script>alert(document.cookie)</script></html>", "text/html"
    elif h["documents"] == "png":
        body, media = PNG, "image/png"
    else:
        body, media = PDF, "application/pdf"
    return Response(content=body, media_type=media, headers={
        "Content-Disposition": f'inline; filename="{kind}.{h["documents"]}"',
        "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", "X-Sha256": "0" * 64,
    })


@app.post("/platform/hospitals/{hospital_id}/reject")
async def reject(hospital_id: str, request: Request):
    body = await request.json()
    reason = (body.get("reason") or "").strip() if isinstance(body, dict) else ""
    if len(reason) < 3:
        return JSONResponse(status_code=422, content={"error": "reason: give a reason the hospital can act on",
                                                      "error_code": "VALIDATION_ERROR"})
    h = _find(hospital_id)
    if h is None:
        return _err(404, "Application not found.")
    if h["status"] != "pending" or h["app_status"] != "submitted":
        return _err(409, "Only a submitted application can be sent back.")
    h["app_status"] = "rejected"
    h["rejection_reason"] = reason
    h["demo_at"] = None
    return _application_payload(h)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=int(sys.argv[1]) if len(sys.argv) > 1 else 8131, log_level="warning")

