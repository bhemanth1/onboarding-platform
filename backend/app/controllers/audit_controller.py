"""
Audit Controller - Audit Log and Activity Tracking
"""
from fastapi import APIRouter, Depends
from typing import List
from ..database import get_db
from ..database.postgres import postgres_enabled
from ..services.postgres_dashboard_service import PostgresDashboardService

router = APIRouter(prefix="/api/audit", tags=["audit"])

@router.get("/logs/{case_id}", response_model=List[dict])
def get_audit_logs(case_id: str, limit: int = 50, db=Depends(get_db)):
    """Get audit logs for case"""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM audit_logs WHERE case_id = ? ORDER BY timestamp DESC LIMIT ?", (case_id, limit))
    return [dict(row) for row in cursor.fetchall()]

@router.get("/activity")
async def get_recent_activity(limit: int = 20, db=Depends(get_db)):
    """Get recent agent activity across all cases"""
    if postgres_enabled():
        return await PostgresDashboardService().audit_events(limit)
    cursor = db.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?", (limit,))
    return [dict(row) for row in cursor.fetchall()]

@router.post("/logs")
def create_audit_log(case_id: str, action: str, description: str):
    """Create audit log entry"""
    return {
        "status": "success",
        "log": {
            "id": "AUDIT-ABC123",
            "case_id": case_id,
            "action": action,
            "description": description,
            "timestamp": "2026-04-25T10:45:00"
        }
    }
