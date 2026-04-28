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

    # ── Existing jobs ─────────────────────────────────────────────────
    _scheduler.add_job(
        _sync_hil_statuses, "interval", minutes=5,
        id="sync_hil_statuses", replace_existing=True,
    )
    # BR001 Action 5/6: mark due reminder follow-ups as sent
    _scheduler.add_job(
        _dispatch_due_reminders, "cron", hour=6, minute=0,
        id="dispatch_due_reminders", replace_existing=True,
    )
    # BR002 SLA: 4-business-hour HIL SLA; escalate at 3h, breach at 4h
    _scheduler.add_job(
        _check_sla_breaches, "interval", minutes=15,
        id="check_sla_breaches", replace_existing=True,
    )

    # ── B1: BR001 — auto-flag HOLD_LATE_SUBMISSION ────────────────────
    # Runs every 15 min; flips cases where joining_date passed but docs
    # still not submitted within 1 business hour of t_plus_0.
    _scheduler.add_job(
        _flag_late_submissions, "interval", minutes=15,
        id="flag_late_submissions", replace_existing=True,
    )

    # ── B2: BR001 — manager notification dispatch ─────────────────────
    # Runs every 15 min; fires 15 min after joining_date (t_plus_0).
    _scheduler.add_job(
        _dispatch_manager_notifications, "interval", minutes=15,
        id="dispatch_manager_notifications", replace_existing=True,
    )

    # ── B3: BR005 — timezone-aware welcome email ──────────────────────
    # Runs daily at 02:30 UTC (08:00 IST) and checks country_of_employment.
    _scheduler.add_job(
        _send_welcome_emails, "cron", hour=2, minute=30,
        id="send_welcome_emails", replace_existing=True,
    )

    # ── B4: BR002 — secondary HIL escalation to Head of HR ───────────
    # Runs every 10 min; fires 30 min after sla_escalated_at if still pending.
    _scheduler.add_job(
        _secondary_hil_escalation, "interval", minutes=10,
        id="secondary_hil_escalation", replace_existing=True,
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


async def _flag_late_submissions() -> None:
    await V1Service().flag_late_submissions()


async def _dispatch_manager_notifications() -> None:
    await V1Service().dispatch_manager_notifications()


async def _send_welcome_emails() -> None:
    await V1Service().send_welcome_emails()


async def _secondary_hil_escalation() -> None:
    await V1Service().secondary_hil_escalation()
