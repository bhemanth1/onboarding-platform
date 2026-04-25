"""
HIL Gate Controller - Human-In-Loop Decision Gates
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from typing import Optional
from pydantic import BaseModel
from ..database.postgres import postgres_enabled
from ..services.postgres_hil_service import (
    decide_by_token,
    list_background_verifications,
    trigger_background_verification,
)

router = APIRouter(prefix="/api/hil", tags=["hil_gates"])

class HILTriggerRequest(BaseModel):
    case_id: str
    gate_number: int
    gate_name: str

class HILDecisionRequest(BaseModel):
    decision_notes: Optional[str] = None

@router.post("/gates/trigger")
async def trigger_hil_gate(payload: HILTriggerRequest):
    """Trigger HIL gate for case"""
    if postgres_enabled() and payload.gate_name.lower().find("background") >= 0:
        return await trigger_background_verification(payload.case_id)
    return {
        "status": "success",
        "case_id": payload.case_id,
        "gate": {
            "number": payload.gate_number,
            "name": payload.gate_name,
            "status": "pending"
        }
    }

@router.post("/background-verification/send")
async def send_background_verification(case_ref: Optional[str] = None):
    """Test endpoint: send HR background verification approval email."""
    if not postgres_enabled():
        raise HTTPException(status_code=400, detail="PostgreSQL DB_CON_STR is required for this HIL test flow")
    return await trigger_background_verification(case_ref)

@router.get("/background-verification/status")
async def background_verification_status():
    """List background verification HIL statuses."""
    if not postgres_enabled():
        return []
    return await list_background_verifications()

@router.get("/webhook/approve", response_class=HTMLResponse)
async def approve_background_verification(token: str):
    """Email link endpoint: HR approves background verification."""
    decision = await decide_by_token(token, "approved")
    return _decision_page(decision)

@router.get("/webhook/reject", response_class=HTMLResponse)
async def reject_background_verification(token: str):
    """Email link endpoint: HR rejects background verification."""
    decision = await decide_by_token(token, "rejected")
    return _decision_page(decision)

@router.get("/gates/{case_id}")
def get_hil_gates(case_id: str):
    """Get HIL gates for case"""
    return {
        "case_id": case_id,
        "gates": [
            {"number": 1, "name": "Doc Verification", "status": "approved"},
            {"number": 2, "name": "IT Confirmation", "status": "approved"},
            {"number": 3, "name": "Deprovisioning", "status": "not_triggered"},
            {"number": 4, "name": "HR Ops Approval", "status": "pending"}
        ]
    }

@router.put("/gates/{gate_id}/approve")
async def approve_hil_gate(gate_id: str, payload: HILDecisionRequest | None = None):
    """Approve HIL gate"""
    return {
        "status": "success",
        "gate_id": gate_id,
        "decision": "approved",
        "notes": payload.decision_notes if payload else None
    }

@router.put("/gates/{gate_id}/reject")
async def reject_hil_gate(gate_id: str, payload: HILDecisionRequest | None = None):
    """Reject HIL gate"""
    return {
        "status": "success",
        "gate_id": gate_id,
        "decision": "rejected",
        "notes": payload.decision_notes if payload else None
    }

def _decision_page(decision: str) -> str:
    color = "#16A34A" if decision == "approved" else "#DC2626"
    title = "Approved" if decision == "approved" else "Rejected"
    return f"""
    <!doctype html>
    <html>
      <head><title>Background Verification {title}</title></head>
      <body style="font-family:Arial,sans-serif;margin:40px;color:#0f172a">
        <h2 style="color:{color}">Background Verification {title}</h2>
        <p>The decision has been recorded. The HR Coordinator Active Cases page will update on the next poll.</p>
      </body>
    </html>
    """
