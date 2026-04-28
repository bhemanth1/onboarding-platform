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
    _scheduler.add_job(
        _sync_hil_statuses, "interval", minutes=5,
        id="sync_hil_statuses", replace_existing=True,
    )
    # BR001 Action 5/6: mark due reminder follow-ups as sent (suppresses if docs submitted or pending_hil)
    _scheduler.add_job(
        _dispatch_due_reminders, "cron", hour=6, minute=0,
        id="dispatch_due_reminders", replace_existing=True,
    )
    # BR002 SLA: check 4-business-hour HR approval SLA; escalate at 3h, breach at 4h
    _scheduler.add_job(
        _check_sla_breaches, "interval", minutes=15,
        id="check_sla_breaches", replace_existing=True,
    )
    _scheduler.start()


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None


async def _sync_hil_statuses() -> None:
    svc = V1Service()
    await svc.sync_hil_case_statuses()
    await svc.start_sla_clocks_for_new_pending_hil()


async def _dispatch_due_reminders() -> None:
    await V1Service().schedule_due_reminders()


async def _check_sla_breaches() -> None:
    await V1Service().check_sla_breaches()
