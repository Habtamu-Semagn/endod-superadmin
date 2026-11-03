"""Endod's service fee: the settings and Endod's fee books, through the patient
platform's admin API (app.platform; the platform's docs/service-fee.md).

The patient pays Endod a service fee on every payment for a hospital service
(a booking, a lab test, imaging...). The super admin sets it here (flat birr
and an optional percentage, or off) and follows the fees: collected online by
Endod, owed by hospitals (the patient paid them the total), settled.

Changing the settings and settling owed fees need a fresh TOTP
(app.auth.fresh_admin) and are audited here (``pending`` before the platform
is called, then the outcome, as for patient accounts); the admin's email goes
along as the actor for the platform's own record. Amounts the browser sends
are birr (two decimals) and percent; the platform works in santim and basis
points.
"""

from __future__ import annotations

import re
from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field, field_validator

from app import audit, platform
from app.api.patients import _changed, _connected, _connected_fresh
from app.auth import Principal
from app.errors import ApiError

router = APIRouter(tags=["fees"])

HOSPITAL_ID = r"^[A-Za-z0-9_-]{1,32}$"
ENTRY_ID = r"^[0-9a-f]{32}$"
STATUSES = ("collected", "owed", "settled", "refunded")
SOURCES = ("booking", "charge")


@router.get("/fees")
def read_fees(principal: Principal = Depends(_connected)) -> Dict[str, Any]:
    return platform.fees()


class FeeChange(BaseModel):
    enabled: bool
    #: Birr per payment (at most two decimals).
    flat: Decimal = Field(ge=0, le=1000, decimal_places=2)
    #: Percent of the subtotal (at most two decimals: 1.25 = 1.25%).
    percent: Decimal = Field(default=Decimal("0"), ge=0, le=20, decimal_places=2)
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("reason")
    @classmethod
    def _strip(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("give a reason")
        return value


@router.post("/fees")
def change_fees(body: FeeChange, principal: Principal = Depends(_connected_fresh)) -> Dict[str, Any]:
    flat_santim, percent_bp = int(body.flat * 100), int(body.percent * 100)
    if body.enabled and flat_santim == 0 and percent_bp == 0:
        raise ApiError(422, "An enabled fee needs a flat amount or a percentage (or switch the fee off).",
                       "VALIDATION_ERROR")
    detail = {"enabled": body.enabled, "flat_santim": flat_santim, "percent_bp": percent_bp, "reason": body.reason}
    return _changed(principal, audit.FEE_SETTINGS_CHANGE, "service-fee",
                    lambda: platform.set_fees(body.enabled, flat_santim, percent_bp, body.reason, principal.email),
                    detail, target_type="fees")


def _day(value: Optional[date]) -> Optional[str]:
    return value.isoformat() if value else None


@router.get("/fees/summary")
def fee_summary(start: Optional[date] = Query(default=None, alias="from"),
                end: Optional[date] = Query(default=None, alias="to"),
                principal: Principal = Depends(_connected)) -> Dict[str, Any]:
    if start and end and end < start:
        raise ApiError(400, "'to' must not be before 'from'.", "VALIDATION_ERROR")
    return platform.fee_summary(_day(start), _day(end))


@router.get("/fees/entries")
def fee_entries(hospital_id: Optional[str] = Query(default=None, pattern=HOSPITAL_ID),
                status: Optional[str] = Query(default=None), source: Optional[str] = Query(default=None),
                start: Optional[date] = Query(default=None, alias="from"),
                end: Optional[date] = Query(default=None, alias="to"),
                limit: int = Query(default=100, ge=1, le=500), offset: int = Query(default=0, ge=0, le=100_000),
                principal: Principal = Depends(_connected)) -> Dict[str, Any]:
    if status is not None and status not in STATUSES:
        raise ApiError(400, f"status must be one of {list(STATUSES)}.", "VALIDATION_ERROR")
    if source is not None and source not in SOURCES:
        raise ApiError(400, f"source must be one of {list(SOURCES)}.", "VALIDATION_ERROR")
    return platform.fee_entries(hospital_id=hospital_id, status=status, source=source, **{
        "from": _day(start), "to": _day(end)}, limit=limit, offset=offset)


class Settlement(BaseModel):
    hospital_id: str = Field(pattern=HOSPITAL_ID)
    entry_ids: List[str] = Field(min_length=1, max_length=500)
    #: The hospital's payment to Endod (a bank transfer reference, a receipt number).
    reference: str = Field(min_length=2, max_length=100)

    @field_validator("entry_ids")
    @classmethod
    def _ids(cls, value: List[str]) -> List[str]:
        if any(not re.fullmatch(ENTRY_ID, i) for i in value):
            raise ValueError("unknown entry")
        return list(dict.fromkeys(value))

    @field_validator("reference")
    @classmethod
    def _reference(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("give the payment's reference")
        return value


@router.post("/fees/settle")
def settle(body: Settlement, principal: Principal = Depends(_connected_fresh)) -> Dict[str, Any]:
    detail = {"entries": len(body.entry_ids), "reference": body.reference}
    return _changed(principal, audit.FEE_SETTLE, body.hospital_id,
                    lambda: platform.settle_fees(body.hospital_id, body.entry_ids, body.reference, principal.email),
                    detail, target_type="hospital")
