"""
Dashboard Controller - frontend view-model endpoints.
"""
from fastapi import APIRouter, Depends

from ..database import get_db
from ..database.postgres import postgres_enabled
from ..services.dashboard_service import DashboardService
from ..services.postgres_dashboard_service import PostgresDashboardService

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/bootstrap")
async def bootstrap(db=Depends(get_db)):
    """Return initial application state for the desktop UI."""
    if postgres_enabled():
        return await PostgresDashboardService().bootstrap()
    return DashboardService(db).bootstrap()


@router.get("/metrics")
async def metrics(db=Depends(get_db)):
    """Return high-level onboarding metrics."""
    if postgres_enabled():
        data = await PostgresDashboardService().bootstrap()
        return data["metrics"]
    return DashboardService(db).metrics()
