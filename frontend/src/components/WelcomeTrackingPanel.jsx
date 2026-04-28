const STATUS_COLOR = {
  sent: "green",
  signed_off: "green",
  not_sent: "orange",
  pending: "purple",
  failed: "red",
};

function statusCls(v) {
  return STATUS_COLOR[String(v || "").toLowerCase()] || "purple";
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  return diff;
}

function CountdownBadge({ dateStr }) {
  const days = daysUntil(dateStr);
  if (days === null) return null;
  if (days < 0)  return <span className="tag red"   style={{ fontSize: 10 }}>{Math.abs(days)}d ago</span>;
  if (days === 0) return <span className="tag green" style={{ fontSize: 10 }}>Today</span>;
  if (days <= 3)  return <span className="tag orange" style={{ fontSize: 10 }}>In {days}d</span>;
  return <span className="tag purple" style={{ fontSize: 10 }}>In {days}d</span>;
}

export default function WelcomeTrackingPanel({ cases = [] }) {
  const welcomeSent    = cases.filter((item) =>
    item.welcome_email_status === "sent" || item.welcomeEmailSent
  ).length;
  const mgrNotified    = cases.filter((item) =>
    item.manager_notification_status === "sent" || item.managerNotificationStatus === "sent"
  ).length;
  const joiningSoon    = cases.filter((item) => {
    const d = daysUntil(item.join);
    return d !== null && d >= 0 && d <= 7;
  }).length;

  const active = cases.filter((item) =>
    item.st !== "completed" && item.phase !== "Completed"
  );

  return (
    <div className="welcome-tracking-panel">
      <div className="kpi-grid g3" style={{ marginBottom: 12 }}>
        <div className="kpi green">
          <div className="kpi-label">Welcome Emails Sent</div>
          <div className="kpi-value">{welcomeSent}</div>
          <div className="kpi-meta">of {cases.length} cases</div>
        </div>
        <div className="kpi blue">
          <div className="kpi-label">Manager Notified</div>
          <div className="kpi-value">{mgrNotified}</div>
          <div className="kpi-meta">Joining notifications</div>
        </div>
        <div className="kpi orange">
          <div className="kpi-label">Joining Within 7 Days</div>
          <div className="kpi-value">{joiningSoon}</div>
          <div className="kpi-meta">Upcoming joiners</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Welcome &amp; Joining Tracker</div>
            <div className="card-sub">Welcome email · Manager notification · Joining countdown</div>
          </div>
          <span className="tag blue">{active.length} Active</span>
        </div>
        <div style={{ padding: 0, maxHeight: 460, overflowY: "auto" }}>
          {!active.length && (
            <div style={{ padding: 14, color: "var(--n5)", fontSize: 12 }}>No active cases to track.</div>
          )}
          {active.map((item) => {
            const welStatus = item.welcome_email_status || (item.welcomeEmailSent ? "sent" : "not_sent");
            const mgrStatus = item.manager_notification_status || item.managerNotificationStatus || "not_sent";
            const hrSignoff = item.hr_signoff_status || item.hrSignoffStatus || "pending";
            return (
              <div
                key={item.caseId}
                style={{ display: "grid", gridTemplateColumns: "1.2fr 90px 90px 90px 70px", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--n8)", alignItems: "center" }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: "var(--n5)" }}>{item.caseId} · {item.dept}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "var(--n6)", marginBottom: 2 }}>Welcome Email</div>
                  <span className={`tag ${statusCls(welStatus)}`} style={{ fontSize: 9 }}>
                    {welStatus.replace(/_/g, " ")}
                  </span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "var(--n6)", marginBottom: 2 }}>Mgr Notif.</div>
                  <span className={`tag ${statusCls(mgrStatus)}`} style={{ fontSize: 9 }}>
                    {mgrStatus.replace(/_/g, " ")}
                  </span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "var(--n6)", marginBottom: 2 }}>HR Sign-off</div>
                  <span className={`tag ${statusCls(hrSignoff)}`} style={{ fontSize: 9 }}>
                    {hrSignoff.replace(/_/g, " ")}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: "var(--n6)", marginBottom: 2 }}>Joining</div>
                  <CountdownBadge dateStr={item.join} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
