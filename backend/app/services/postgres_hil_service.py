"""
PostgreSQL HIL Service - background verification email approval flow.
"""
from __future__ import annotations

import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from html import escape

from fastapi import HTTPException

from ..config import settings
from ..database.postgres import execute, fetch_row, fetch_rows


BACKGROUND_GATE_TYPE = "doc_bg_verification"


async def trigger_background_verification(case_ref: str | None = None) -> dict:
    """Create a pending background verification HIL gate and email HR approve/reject links."""
    case = await _find_case(case_ref)
    if not case:
        raise HTTPException(status_code=404, detail="No onboarding case found for background verification")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.HIL_TOKEN_EXPIRY_HOURS)
    candidate_name = f"{case['first_name']} {case['last_name']}"
    flag_description = (
        f"Background verification is ready for {candidate_name}. "
        f"Please approve or reject before provisioning continues."
    )

    existing = await fetch_row(
        """
        SELECT id, approval_token, decision, email_sent_to, email_sent_at
        FROM hil_gates
        WHERE case_id = $1 AND gate_type = $2 AND decision = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
        """,
        case["case_uuid"],
        BACKGROUND_GATE_TYPE,
    )
    if existing:
        await execute(
            """
            UPDATE onboarding_cases
            SET status = 'pending_hil', updated_at = NOW()
            WHERE id = $1
            """,
            case["case_uuid"],
        )
        return {
            "status": "pending",
            "message": "Existing pending HR verification HIL gate reused.",
            "case_number": case["case_number"],
            "employee_id": case["employee_id"],
            "candidate_name": candidate_name,
            "gate_id": str(existing["id"]),
            "email_sent_to": existing["email_sent_to"],
            "email_result": {"sent": False, "reason": "Pending gate already exists; no duplicate email sent"},
                    "approve_url": f"{settings.BACKEND_URL}/dana-aegis/api/hil/webhook/approve?token={existing['approval_token']}",
                    "reject_url": f"{settings.BACKEND_URL}/dana-aegis/api/hil/webhook/reject?token={existing['approval_token']}",
        }

    gate = await fetch_row(
        """
        INSERT INTO hil_gates (
          case_id, gate_type, decision, is_blocking, flag_description,
          approval_token, token_expires_at, email_sent_to, email_sent_at,
          created_at, updated_at
        )
        VALUES ($1, $2, 'pending', TRUE, $3, $4, $5, $6, NOW(), NOW(), NOW())
        RETURNING id, approval_token, decision, email_sent_to, email_sent_at
        """,
        case["case_uuid"],
        BACKGROUND_GATE_TYPE,
        flag_description,
        token,
        expires_at,
        settings.HR_APPROVER_EMAIL,
    )

    await execute(
        """
        UPDATE onboarding_cases
        SET status = 'pending_hil', updated_at = NOW()
        WHERE id = $1
        """,
        case["case_uuid"],
    )
    await _log_event(
        case,
        "hil_decision",
        "HIL Gate 1 triggered. Background verification approval email sent to HR.",
        "HIL-1",
        "pending",
    )

    email_result = _send_hil_email(candidate_name, case["case_number"], token, flag_description)
    return {
        "status": "pending",
        "message": "Background verification HIL email queued for HR.",
        "case_number": case["case_number"],
        "employee_id": case["employee_id"],
        "candidate_name": candidate_name,
        "gate_id": str(gate["id"]),
        "email_sent_to": gate["email_sent_to"],
        "email_result": email_result,
                    "approve_url": f"{settings.BACKEND_URL}/dana-aegis/api/hil/webhook/approve?token={token}",
                    "reject_url": f"{settings.BACKEND_URL}/dana-aegis/api/hil/webhook/reject?token={token}",
    }


async def list_background_verifications() -> list[dict]:
    rows = await fetch_rows(
        """
        SELECT
          hg.id, hg.decision, hg.email_sent_to, hg.email_sent_at, hg.decided_at,
          hg.flag_description, hg.token_expires_at, oc.case_number, oc.employee_id,
          c.first_name, c.last_name
        FROM hil_gates hg
        JOIN onboarding_cases oc ON oc.id = hg.case_id
        JOIN candidates c ON c.id = oc.candidate_id
        WHERE hg.gate_type = $1
        ORDER BY hg.created_at DESC
        """,
        BACKGROUND_GATE_TYPE,
    )
    return [
        {
            "gate_id": str(row["id"]),
            "case_number": row["case_number"],
            "employee_id": row["employee_id"],
            "candidate_name": f"{row['first_name']} {row['last_name']}",
            "decision": row["decision"],
            "email_sent_to": row["email_sent_to"],
            "email_sent_at": row["email_sent_at"],
            "decided_at": row["decided_at"],
            "token_expires_at": row["token_expires_at"],
        }
        for row in rows
    ]


async def decide_by_token(token: str, decision: str) -> str:
    """Approve or reject a background verification gate by email token."""
    if decision not in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Decision must be approved or rejected")

    gate = await fetch_row(
        """
        SELECT
          hg.id, hg.case_id, hg.decision, hg.token_expires_at,
          oc.case_number, oc.employee_id, oc.phase, c.id AS candidate_id,
          c.first_name, c.last_name
        FROM hil_gates hg
        JOIN onboarding_cases oc ON oc.id = hg.case_id
        JOIN candidates c ON c.id = oc.candidate_id
        WHERE hg.approval_token = $1 AND hg.gate_type = $2
        """,
        token,
        BACKGROUND_GATE_TYPE,
    )
    if not gate:
        raise HTTPException(status_code=404, detail="Invalid or unknown approval token")
    if gate["token_expires_at"] and gate["token_expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Approval token has expired")

    next_status = "in_progress" if decision == "approved" else "blocked"
    remaining = await fetch_row(
        """
        SELECT COUNT(*)::int AS total
        FROM hil_gates
        WHERE case_id = $1 AND id <> $2 AND decision = 'pending' AND COALESCE(is_blocking, FALSE) = TRUE
        """,
        gate["case_id"],
        gate["id"],
    )
    if decision == "approved" and remaining and remaining["total"]:
        next_status = "pending_hil"

    await execute(
        """
        UPDATE hil_gates
        SET decision = $1, decided_at = NOW(), decision_notes = $2, updated_at = NOW()
        WHERE id = $3
        """,
        decision,
        f"HR selected {decision} from email approval link.",
        gate["id"],
    )
    await execute(
        """
        UPDATE onboarding_cases
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        """,
        next_status,
        gate["case_id"],
    )
    await _log_event(
        gate,
        "hil_decision",
        f"Background verification {decision} by HR email action.",
        "HIL-1",
        decision,
    )
    return decision


async def _find_case(case_ref: str | None):
    if case_ref:
        return await fetch_row(
            """
            SELECT
              oc.id AS case_uuid, oc.case_number, oc.employee_id, oc.phase,
              oc.candidate_id, c.first_name, c.last_name, c.role, c.department
            FROM onboarding_cases oc
            JOIN candidates c ON c.id = oc.candidate_id
            WHERE oc.case_number = $1 OR oc.employee_id = $1 OR oc.id::text = $1
            LIMIT 1
            """,
            case_ref,
        )
    return await fetch_row(
        """
        SELECT
          oc.id AS case_uuid, oc.case_number, oc.employee_id, oc.phase,
          oc.candidate_id, c.first_name, c.last_name, c.role, c.department
        FROM onboarding_cases oc
        JOIN candidates c ON c.id = oc.candidate_id
        ORDER BY oc.created_at DESC
        LIMIT 1
        """
    )


async def _log_event(case, event_type: str, description: str, rule_ref: str, outcome: str):
    data = dict(case)
    case_id = data.get("case_uuid") or data.get("case_id")
    # AUDIT LOG IS APPEND-ONLY - never update or delete audit_logs rows.
    await execute(
        """
        INSERT INTO audit_logs (
          case_id, candidate_id, employee_id, phase, event_type, rule_ref,
          rule_version, event_description, outcome, agent_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'v1.3', $7, $8, $9, NOW())
        """,
        case_id,
        data["candidate_id"],
        data["employee_id"],
        data["phase"],
        event_type,
        rule_ref,
        description,
        outcome,
        settings.AGENT_ID,
    )


def _send_hil_email(candidate_name: str, case_number: str, token: str, flag_description: str) -> dict:
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD or not settings.HR_APPROVER_EMAIL:
        return {"sent": False, "reason": "Mail credentials or HR recipient missing"}

        approve_url = f"{settings.BACKEND_URL}/dana-aegis/api/hil/webhook/approve?token={token}"
        reject_url = f"{settings.BACKEND_URL}/dana-aegis/api/hil/webhook/reject?token={token}"
    subject = f"aegis.ai HIL Approval - Background Verification - {candidate_name}"
    html = f"""
    <html>
      <body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
        <h2 style="color:#5929d0">Background Verification Approval Required</h2>
        <p><strong>Candidate:</strong> {escape(candidate_name)}</p>
        <p><strong>Case:</strong> {escape(case_number)}</p>
        <p>{escape(flag_description)}</p>
        <p>
          <a href="{approve_url}" style="display:inline-block;background:#16A34A;color:white;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:700">Approve</a>
          <a href="{reject_url}" style="display:inline-block;background:#DC2626;color:white;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:700;margin-left:8px">Reject</a>
        </p>
      </body>
    </html>
    """

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.MAIL_FROM or settings.MAIL_USERNAME
    message["To"] = settings.HR_APPROVER_EMAIL
    message.set_content(f"{flag_description}\nApprove: {approve_url}\nReject: {reject_url}")
    message.add_alternative(html, subtype="html")

    try:
        if settings.MAIL_SSL_TLS:
            with smtplib.SMTP_SSL(settings.MAIL_SERVER, settings.MAIL_PORT, timeout=20) as smtp:
                smtp.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT, timeout=20) as smtp:
                if settings.MAIL_STARTTLS:
                    smtp.starttls()
                smtp.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
                smtp.send_message(message)
    except Exception as exc:
        return {"sent": False, "reason": str(exc)}

    return {"sent": True, "recipient": settings.HR_APPROVER_EMAIL}
