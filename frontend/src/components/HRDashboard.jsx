function statusLabel(status = "") {
  return String(status).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function StatusBadge({ status }) {
  return <span className={`badge ${status}`}>{statusLabel(status)}</span>;
}

export default function HRDashboard({ metrics = {}, cases = [], audit = [], onViewAllCases, onOpenCase }) {
  return (
    <>
      <div className="kpi-grid g4">
        <div className="kpi blue"><div className="kpi-label">Active Cases</div><div className="kpi-value">{metrics.active || 0}</div><div className="kpi-meta">{metrics.avgProgress || 0}% avg progress</div></div>
        <div className="kpi purple"><div className="kpi-label">In Progress</div><div className="kpi-value">{metrics.inProgress || 0}</div><div className="kpi-meta">Onboarding active</div></div>
        <div className="kpi orange"><div className="kpi-label">Pending HIL</div><div className="kpi-value">{metrics.pendingHil || 0}</div><div className="kpi-meta">Approval needed</div></div>
        <div className="kpi green"><div className="kpi-label">Completed</div><div className="kpi-value">{metrics.completed || 0}</div><div className="kpi-meta">Fully closed</div></div>
      </div>
      <div className="g2">
        <div className="card">
          <div className="card-head">
            <div><div className="card-title">Active Pipeline</div><div className="card-sub">Realtime GET polling</div></div>
            <button className="btn btn-ghost btn-sm" onClick={onViewAllCases}>View All →</button>
          </div>
          <div style={{ padding: 0, maxHeight: 340, overflowY: "auto" }}>
            {cases.slice(0, 8).map((item) => (
              <div key={item.caseId} style={{ display: "grid", gridTemplateColumns: "1.4fr auto 70px", gap: 10, padding: "9px 14px", borderBottom: "1px solid var(--n8)", alignItems: "center", cursor: "pointer" }} onClick={() => onOpenCase?.(item)}>
                <div>
                  <div className="emp-name" style={{ fontSize: 12 }}>{item.name}</div>
                  <div className="emp-role" style={{ fontSize: 10 }}>{item.caseId} · {item.phase}</div>
                </div>
                <StatusBadge status={item.st} />
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
