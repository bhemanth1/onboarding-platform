"""
MVP Controller - read-only React frontend API.
"""
from fastapi import APIRouter, HTTPException, Query

from ..services.mvp_read_service import MvpReadService

router = APIRouter(prefix="/api/mvp", tags=["mvp-read-only"])


@router.get("/dashboard")
async def dashboard():
    return await MvpReadService().dashboard()


@router.get("/cases")
async def cases():
    return await MvpReadService().cases()


@router.get("/cases/{case_ref}")
async def case_detail(case_ref: str):
    data = await MvpReadService().case_detail(case_ref)
    if not data:
        raise HTTPException(status_code=404, detail="Case not found")
    return data


@router.get("/analytics")
async def analytics():
    service = MvpReadService()
    cases = await service.cases()
    data = service.analytics_from_cases(cases)
    data["metrics"] = await service.raw_metrics(cases)
    return data


@router.get("/audit")
async def audit(limit: int = Query(default=50, ge=1, le=200)):
    return await MvpReadService().audit(limit=limit)


@router.get("/hil")
async def hil():
    return await MvpReadService().hil_gates()


@router.get("/workflows")
async def workflows():
    return MvpReadService.workflow_summary()
