"""System monitoring: the status of each Endod service, checked from here.

* the patient platform: internal-api's ``/health`` and its admin report
  (``/internal/admin/health``: database, Redis, the events worker's last
  heartbeat, the dead-letter count, the outbox backlog);
* the hospital service: its ``/health``;
* TenaCare: its ``/health``;
* this admin service: its own database.

All checks run at once, each with a short timeout. The answer holds statuses,
times and counts only: no key, URL or error text from a service.
"""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, Dict, Optional

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import text

from app import hospital, organisation, platform
from app.auth import Principal, current_admin
from app.config import get_settings
from app.db import session_scope, utcnow
from app.errors import ApiError

router = APIRouter(tags=["system"])


def _get(base_url: str, path: str, transport: Optional[httpx.BaseTransport],
         headers: Optional[Dict[str, str]] = None) -> httpx.Response:
    with httpx.Client(base_url=base_url, timeout=get_settings().HEALTH_CHECK_TIMEOUT, follow_redirects=False,
                      transport=transport, headers={"Accept": "application/json", **(headers or {})}) as client:
        return client.get(path)


def _probe(base_url: str, transport: Optional[httpx.BaseTransport]) -> Dict[str, Any]:
    """GET /health: ok when it answers 2xx."""
    started = time.monotonic()
    try:
        response = _get(base_url, "/health", transport)
    except httpx.TimeoutException:
        return {"ok": False, "detail": "No answer in time.", "latency_ms": None}
    except httpx.HTTPError:
        return {"ok": False, "detail": "Not reachable.", "latency_ms": None}
    latency = int((time.monotonic() - started) * 1000)
    if response.status_code >= 400:
        return {"ok": False, "detail": f"Answered {response.status_code}.", "latency_ms": latency}
    return {"ok": True, "detail": None, "latency_ms": latency}


def _num(value: Any) -> Optional[int]:
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def _bool(value: Any) -> Optional[bool]:
    return value if isinstance(value, bool) else None


def _str(value: Any) -> Optional[str]:
    return value[:64] if isinstance(value, str) else None


def _platform_report() -> Dict[str, Any]:
    """The platform's own report, reduced to known fields (statuses, times, counts)."""
    try:
        body = platform.health()
    except ApiError as exc:
        return {"available": False, "detail": exc.message}
    database = body.get("database") if isinstance(body.get("database"), dict) else {}
    redis = body.get("redis") if isinstance(body.get("redis"), dict) else {}
    worker = body.get("events_worker") if isinstance(body.get("events_worker"), dict) else {}
    outbox = body.get("outbox") if isinstance(body.get("outbox"), dict) else {}
    return {
        "available": True,
        "status": _str(body.get("status")),
        "database_ok": _bool(database.get("ok")),
        "redis_configured": _bool(redis.get("configured")),
        "redis_ok": _bool(redis.get("ok")),
        "worker_last_heartbeat": _str(worker.get("last_heartbeat")),
        "worker_ok": _bool(worker.get("ok")),
        "dead_letters": _num(body.get("dead_letters")),
        "outbox_backlog": _num(outbox.get("backlog")),
        "outbox_oldest_at": _str(outbox.get("oldest_at")),
    }


def _platform() -> Dict[str, Any]:
    settings = get_settings()
    check = _probe(settings.PLATFORM_API_URL, platform.transport)
    if not platform.configured():
        report: Dict[str, Any] = {"available": False, "detail": platform.NOT_CONNECTED}
    else:
        report = _platform_report()
    ok = check["ok"] and (not report.get("available") or report.get("status") == "ok")
    detail = check["detail"]
    if check["ok"] and report.get("available") and report.get("status") != "ok":
        detail = "Running, with a problem below."
    return {**check, "ok": ok, "detail": detail, "report": report}


def _hospital() -> Dict[str, Any]:
    return _probe(get_settings().HOSPITAL_API_URL, hospital.transport)


def _tenacare() -> Dict[str, Any]:
    return _probe(get_settings().ORGANISATION_API_URL, organisation.transport)


def _admin() -> Dict[str, Any]:
    started = time.monotonic()
    try:
        with session_scope() as session:
            session.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001 -- reported, never raised
        return {"ok": False, "detail": "The admin database is not reachable.", "latency_ms": None}
    return {"ok": True, "detail": None, "latency_ms": int((time.monotonic() - started) * 1000)}


SERVICES: Dict[str, tuple[str, Callable[[], Dict[str, Any]]]] = {
    "platform": ("Patient platform", _platform),
    "hospital": ("Hospital service", _hospital),
    "tenacare": ("TenaCare", _tenacare),
    "admin": ("Super admin", _admin),
}


@router.get("/system/health")
def system_health(_: Principal = Depends(current_admin)) -> Dict[str, Any]:
    with ThreadPoolExecutor(max_workers=len(SERVICES)) as pool:
        futures = {key: pool.submit(check) for key, (_, check) in SERVICES.items()}
        results = {key: future.result() for key, future in futures.items()}
    checked = utcnow().isoformat()
    services = [{"id": key, "name": name, "checked_at": checked, **results[key]}
                for key, (name, _) in SERVICES.items()]
    return {"checked_at": checked, "services": services, "ok": all(s["ok"] for s in services)}
