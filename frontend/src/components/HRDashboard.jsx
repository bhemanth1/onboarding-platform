const STATUS_LABEL = {
  CREATED: "Created",
  AWAITING_SUBMISSION: "Awaiting Docs",
  HOLD_LATE_SUBMISSION: "Late Submission",
  HOLD_HR_APPROVAL: "Pending HIL",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  PROVISIONING: "Provisioning",
  PAYROLL_SETUP: "Payroll Setup",
  WELCOME_SENT: "Welcome Sent",
  HOLD_HR_SIGNOFF: "Pending Sign-off",
  COMPLETE: "Complete",
  // legacy compat
  active: "Active",
  in_progress: "In Progress",
  pending_hil: "Pending HIL",
  at_risk: "At Risk",
  blocked: "Blocked",
  completed: "Completed",
};

const STATUS_CSS = {
  CREATED: "in-progress",
  AWAITING_SUBMISSION: "in-progress",
  HOLD_LATE_SUBMISSION: "at-risk",
  HOLD_HR_APPROVAL: "hil",
  REJECTED: "blocked",
  CANCELLED: "blocked",
  PROVISIONING: "in-progress",
  PAYROLL_SETUP: "in-progress",
  WELCOME_SENT: "in-progress",
  HOLD_HR_SIGNOFF: "hil",
  COMPLETE: "completed",
  active: "in-progress",
  in_progress: "in-progress",
  pending_hil: "hil",
  at_risk: "at-risk",
  blocked: "blocked",
  completed: "completed",
};

function statusLabel(status = "") {
  return STATUS_LABEL[status] || String(status).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusCssClass(status = "") {
  return STATUS_CSS[status] || status;
}

function StatusBadge({ status }) {
  return <span className={`badge ${statusCssClass(status)}`}>{statusLabel(status)}</span>;
}

function slaPreBreachWarning(item) {
  // Show amber warning if escalated but not yet fully breached
  if (item.sla_escalated_at && !item.slaBreached && !item.sla_breach) return true;
  if (item.rawStatus === "at_risk" && !item.sla_breach) return true;
  return false;
}

function isItFailure(item) {
  return item.it_admin_notification_failed || item.itAdminNotificationFailed ||
    String(item.it || "").toLowerCase().includes("failed") ||
    String(item.it || "").toLowerCase().includes("blocked");
}

export default function HRDashboard({ metrics = {}, cases = [], audit = [], onViewAllCases, onOpenCase }) {
  const itFailures = cases.filter(isItFailure);

  return (
    <>
      <div className="kpi-grid g4">
        <div className="kpi blue">
          <div className="kpi-label">Active Cases</div>
          <div className="kpi-value">{metrics.active || 0}</div>
          <div className="kpi-meta">{metrics.avgProgress || 0}% avg progress</div>
        </div>
        <div className="kpi purple">
          <div className="kpi-label">In Progress</div>
          <div className="kpi-value">{metrics.inProgress || 0}</div>
          <div className="kpi-meta">Onboarding active</div>
        </div>
        <div className="kpi orange">
          <div className="kpi-label">Pending HIL</div>
          <div className="kpi-value">{metrics.pendingHil || 0}</div>
          <div className="kpi-meta">Approval needed</div>
        </div>
        <div className="kpi green">
          <div className="kpi-label">Completed</div>
          <div className="kpi-value">{metrics.completed || 0}</div>
          <div className="kpi-meta">Fully closed</div>
        </div>
      </div>

      {/* D4 — IT/Admin failure action item card */}
      {itFailures.length > 0 && (
        <div className="card" style={{ borderLeft: "3px solid var(--error)", marginBottom: 8 }}>
          <div className="card-head">
            <div>
              <div className="card-title" style={{ color: "var(--error)" }}>
                IT / Admin Action Required
              </div>
              <div className="card-sub">{itFailures.length} case{itFailures.length > 1 ? "s" : ""} with provisioning failure</div>
            </div>
            <span className="tag red">{itFailures.length} Open</span>
          </div>
          <div style={{ padding: "0 14px 10px" }}>
            {itFailures.map((item) => (
              <div key={item.caseId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderTop: "1px solid var(--n8)", cursor: "pointer" }} onClick={() => onOpenCase?.(item)}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--n2)" }}>{item.name}</span>
                <span style={{ fontSize: 10, color: "var(--n5)" }}>{item.caseId}</span>
                <span className="tag red" style={{ marginLeft: "auto", fontSize: 10 }}>{item.it}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="g2">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Active Pipeline</div>
              <div className="card-sub">Realtime GET polling · State machine</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onViewAllCases}>View All →</button>
          </div>
          <div style={{ padding: 0, maxHeight: 340, overflowY: "auto" }}>
            {cases.slice(0, 8).map((item) => (
              <div
                key={item.caseId}
                style={{ display: "grid", gridTemplateColumns: "1.4fr auto auto 70px", gap: 8, padding: "9px 14px", borderBottom: "1px solid var(--n8)", alignItems: "center", cursor: "pointer" }}
                onClick={() => onOpenCase?.(item)}
              >
                <div>
                  <div className="emp-name" style={{ fontSize: 12 }}>{item.name}</div>
                  <div className="emp-role" style={{ fontSize: 10 }}>{item.caseId} · {item.phase}</div>
                </div>
                {/* state chip */}
                <StatusBadge status={item.rawStatus || item.st} />
                {/* D5 — 75% SLA pre-breach warning */}
                {slaPreBreachWarning(item) && (
                  <span className="tag orange" style={{ fontSize: 10 }}>SLA 75%</span>
                )}
                <div style={{ fontSize: 11, color: "var(--n4)", textAlign: "right" }}>{item.prog}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Recent Activity</div></div>
          <div className="card-body">
            {audit.slice(0, 6).map((item, index) => (
              <div className="ma-item" key={`${item.case}-${index}`}>
                <div className="ma-time">{item.ts}</div>
                <div className="ma-text"><strong>{item.emp}</strong> · {item.ev}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
