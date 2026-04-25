"""
Onboarding Controller - Onboarding Case Management
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from ..models.onboarding import OnboardingCase
from ..services.onboarding_service import OnboardingService
from ..database import get_db
from ..database.postgres import postgres_enabled
from ..services.postgres_dashboard_service import PostgresDashboardService

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

class ProgressUpdate(BaseModel):
    progress: int

class StatusUpdate(BaseModel):
    status: str

@router.post("/cases/{employee_id}", response_model=OnboardingCase)
def create_onboarding_case(employee_id: str, employee_name: str, db = Depends(get_db)):
    """Create onboarding case for employee"""
    service = OnboardingService(db)
    return service.create_onboarding_case(employee_id, employee_name)

@router.get("/cases/{case_id}", response_model=Optional[dict])
def get_case(case_id: str, db = Depends(get_db)):
    """Get onboarding case"""
    service = OnboardingService(db)
    case = service.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.get("/cases/", response_model=List[dict])
async def list_all_cases(limit: int = 100, db = Depends(get_db)):
    """List all onboarding cases"""
    if postgres_enabled():
        return (await PostgresDashboardService().desktop_cases())[:limit]
    service = OnboardingService(db)
    return service.get_all_cases(limit)

@router.get("/cases/phase/{phase}", response_model=List[dict])
async def get_cases_by_phase(phase: str, limit: int = 100, db = Depends(get_db)):
    """Get cases by phase (pre, onb, post, completed)"""
    if postgres_enabled():
        phase_map = {"pre": "pre_onboarding", "onb": "onboarding", "post": "post_onboarding"}
        wanted = phase_map.get(phase, phase)
        return [case for case in await PostgresDashboardService().desktop_cases() if case.get("phaseKey") == wanted][:limit]
    service = OnboardingService(db)
    return service.get_cases_by_phase(phase, limit)

@router.get("/cases/status/{status}", response_model=List[dict])
async def get_cases_by_status(status: str, limit: int = 100, db = Depends(get_db)):
    """Get cases by status"""
    if postgres_enabled():
        status_map = {"pending_hil": "hil", "in_progress": "in-progress", "at_risk": "at-risk"}
        wanted = status_map.get(status, status)
        return [case for case in await PostgresDashboardService().desktop_cases() if case.get("st") == wanted][:limit]
    service = OnboardingService(db)
    return service.get_cases_by_status(status, limit)

@router.put("/cases/{case_id}/progress", response_model=Optional[dict])
def update_progress(case_id: str, payload: ProgressUpdate, db = Depends(get_db)):
    """Update case progress"""
    service = OnboardingService(db)
    case = service.update_case_progress(case_id, payload.progress)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.put("/cases/{case_id}/status", response_model=Optional[dict])
def update_status(case_id: str, payload: StatusUpdate, db = Depends(get_db)):
    """Update case status"""
    service = OnboardingService(db)
    case = service.update_case_status(case_id, payload.status)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.put("/cases/{case_id}/next-phase", response_model=Optional[dict])
def next_phase(case_id: str, next_phase: str, db = Depends(get_db)):
    """Move case to next phase"""
    service = OnboardingService(db)
    case = service.move_to_next_phase(case_id, next_phase)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.put("/cases/{case_id}/complete", response_model=Optional[dict])
def complete_case(case_id: str, db = Depends(get_db)):
    """Mark case as complete"""
    service = OnboardingService(db)
    case = service.complete_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case
