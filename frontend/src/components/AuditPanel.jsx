export default function AuditPanel({ audit = [] }) {
  return (
    <div className="card">
      <div className="card-head"><div className="card-title">Audit Log</div></div>
      <div className="card-body np">
        {audit.map((item, index) => (
          <div key={`${item.case}-${index}`} style={{ display: "flex", gap: 10, padding: "9px 16px", borderBottom: "1px solid var(--n8)", alignItems: "flex-start" }}>
            <div style={{ fontSize: 9.5, color: "var(--n5)", minWidth: 46 }}>{item.ts}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600 }}>{item.emp} · {item.case}</div>
              <div style={{ fontSize: 10.5, color: "var(--n4)" }}>{item.ev}</div>
            </div>
            <span className="tag purple">{item.out || item.phase}</span>
          </div>
        ))}
        {!audit.length && <div style={{ padding: 16, color: "var(--n5)" }}>No audit entries returned.</div>}
      </div>
    </div>
  );
}
