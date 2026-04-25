"""
BRD-compatible versioned API contract.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import HTMLResponse

from ..database.postgres import postgres_enabled
from ..services.postgres_hil_service import decide_by_token
from ..services.v1_service import V1Service


router = APIRouter(prefix="/api/v1", tags=["brd-v1"])


def _service() -> V1Service:
    if not postgres_enabled():
        raise HTTPException(status_code=400, detail="PostgreSQL DB_CON_STR is required for /api/v1 endpoints")
    return V1Service()


@router.get("/dashboard/kpis")
async def dashboard_kpis():
    return await _service().kpis()


@router.get("/dashboard/hil-gates")
async def dashboard_hil_gates():
    return await _service().hil_gates()


@router.get("/cases")
async def cases():
    return await _service().cases()


@router.get("/cases/{case_ref}")
async def case_detail(case_ref: str):
    return await _service().case_detail(case_ref)


@router.get("/pre-onboarding/tasks")
async def pre_onboarding_tasks(case_ref: str | None = None):
    return await _service().pre_onboarding_tasks(case_ref)


@router.post("/pre-onboarding/tasks/{case_ref}/recalculate")
async def recalculate_case_progress(case_ref: str):
    return await _service().recalculate_and_save_progress(case_ref)


@router.post("/pre-onboarding/tasks/recalculate-all")
async def recalculate_all_progress():
    service = _service()
    updated = []
    for case in await service.cases():
        updated.append(await service.recalculate_and_save_progress(case["caseId"]))
    return {"updated": updated}


@router.get("/pre-onboarding/follow-ups")
async def follow_ups(case_ref: str | None = None):
    return await _service().follow_ups(case_ref)


@router.get("/hil")
async def hil():
    return await _service().hil_gates()


@router.get("/hil/stats")
async def hil_stats():
    return await _service().hil_stats()


@router.post("/hil/sync-case-statuses")
async def sync_hil_case_statuses():
    return await _service().sync_hil_case_statuses()


@router.get("/audit/live")
async def audit_live(limit: int = Query(default=50, ge=1, le=200)):
    return await _service().audit_live(limit)


@router.get("/post-onboarding")
async def post_onboarding(case_ref: str | None = None):
    return await _service().post_onboarding(case_ref)


@router.get("/documents/{case_ref}")
async def documents(case_ref: str):
    return await _service().documents(case_ref)


@router.post("/documents/{case_ref}")
async def create_document(case_ref: str, payload: dict[str, Any] = Body(default_factory=dict)):
    return await _service().create_document(case_ref, payload)


@router.get("/provisioning/{case_ref}")
async def provisioning(case_ref: str):
    return await _service().provisioning(case_ref)


@router.get("/reports/{report_id}")
async def report(report_id: str):
    return await _service().reports(report_id)


@router.post("/candidates", status_code=201)
async def create_candidate(payload: dict[str, Any] = Body(...)):
    return await _service().create_candidate(payload)


@router.get("/webhooks/hil/approve", response_class=HTMLResponse)
async def approve_hil(token: str):
    decision = await decide_by_token(token, "approved")
    return _decision_page(decision)


@router.get("/webhooks/hil/reject", response_class=HTMLResponse)
async def reject_hil(token: str):
    decision = await decide_by_token(token, "rejected")
    return _decision_page(decision)


def _decision_page(decision: str) -> str:
    color = "#16A34A" if decision == "approved" else "#DC2626"
    title = "Approved" if decision == "approved" else "Rejected"
    return f"""
    <!doctype html>
    <html>
      <head><title>HR Verification {title}</title></head>
      <body style="font-family:Arial,sans-serif;margin:40px;color:#0f172a">
        <h2 style="color:{color}">HR Verification {title}</h2>
        <p>The decision has been recorded. The frontend will update on the next poll.</p>
      </body>
    </html>
    """
