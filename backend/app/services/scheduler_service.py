"""
Optional APScheduler jobs for reminder and consistency maintenance.
"""
from __future__ import annotations

from .v1_service import V1Service

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
except Exception:  # APScheduler is optional until requirements are installed.
    AsyncIOScheduler = None


_scheduler = None


def start_scheduler() -> None:
    """Start lightweight background jobs when APScheduler is installed."""
    global _scheduler
    if AsyncIOScheduler is None or _scheduler is not None:
        return
    _scheduler = AsyncIOScheduler(timezone="UTC")
    _scheduler.add_job(_sync_hil_statuses, "interval", minutes=5, id="sync_hil_statuses", replace_existing=True)
    _scheduler.start()


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None


async def _sync_hil_statuses() -> None:
    await V1Service().sync_hil_case_statuses()
