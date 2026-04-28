export default function ReportsPage({ analytics = {} }) {
  const status = analytics.byStatus || {};
  const phase = analytics.byPhase || {};
  const topRisks = analytics.topRisks || [];
  const statusTotal = Object.values(status).reduce((sum, value) => sum + value, 0);

  return (
    <div className="reports-page">
      <div className="card">
        <div className="card-head"><div><div className="card-title">Reports</div><div className="card-sub">Onboarding analytics snapshot</div></div></div>
        <div style={{ padding: "0 16px 14px", display: "grid", gap: 8 }}>
          <div><strong>Status Total:</strong> {statusTotal}</div>
          <div><strong>Status Distribution:</strong> {Object.entries(status).map(([key, value]) => `${key}: ${value}`).join(" · ") || "No status data"}</div>
          <div><strong>Phase Distribution:</strong> {Object.entries(phase).map(([key, value]) => `${key}: ${value}`).join(" · ") || "No phase data"}</div>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><div className="card-title">Top Risks</div><span className="tag orange">{topRisks.length} Watchlist</span></div>
        {!topRisks.length && <div style={{ padding: 14, color: "var(--n5)" }}>No risk rows returned.</div>}
        {topRisks.map((item) => (
          <div key={item.caseId} style={{ display: "grid", gridTemplateColumns: "1.4fr auto auto", gap: 10, alignItems: "center", padding: "10px 14px", borderTop: "1px solid var(--n8)" }}>
            <div>
              <div className="emp-name" style={{ fontSize: 12 }}>{item.name}</div>
              <div className="emp-role" style={{ fontSize: 10 }}>{item.caseId} · {item.scenario}</div>
            </div>
            <span className={`badge ${item.st}`}>{item.st}</span>
            <span style={{ fontSize: 11, color: "var(--n4)" }}>{item.riskScore || "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
