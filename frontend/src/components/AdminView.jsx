export default function AdminView({ mode = "tasks", cases = [] }) {
  const rows = mode === "desk"
    ? cases
    : mode === "id"
      ? cases.filter((item) => item.phase !== "Pre-Onboarding" || item.prog > 20)
      : cases.filter((item) => item.phase !== "Completed");
  const title = mode === "desk" ? "Desk Assignment Status" : mode === "id" ? "ID Card Status" : "Admin Task Board";

  return (
    <div className="card">
      <div className="card-head"><div><div className="card-title">{title}</div><div className="card-sub">Desk, ID card, and joining logistics</div></div><span className="tag orange">{rows.length} Rows</span></div>
      {!rows.length && <div style={{ padding: 14, color: "var(--n5)" }}>No admin rows available.</div>}
      {rows.map((item) => (
        <div key={item.caseId} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr .8fr", gap: 10, padding: "10px 14px", borderTop: "1px solid var(--n8)", alignItems: "center" }}>
          <div>
            <div className="emp-name" style={{ fontSize: 12 }}>{item.name}</div>
            <div className="emp-role" style={{ fontSize: 10 }}>{item.caseId} · {item.dept}</div>
          </div>
          <span>{item.phase}</span>
          <span className={`badge ${item.st}`}>{item.st}</span>
        </div>
      ))}
    </div>
  );
}
