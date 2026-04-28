export default function ITSupportView({ mode = "queue", cases = [] }) {
  const rows = mode === "active"
    ? cases.filter((item) => item.it !== "Completed" && item.st !== "completed")
    : mode === "done"
      ? cases.filter((item) => item.it === "Completed" || item.prog > 85)
      : cases;
  const title = mode === "active" ? "Active Provisioning Tasks" : mode === "done" ? "Completed Provisioning" : "IT Provisioning Queue";

  return (
    <div className="card">
      <div className="card-head"><div><div className="card-title">{title}</div><div className="card-sub">Laptop, email, and access requests</div></div></div>
      {!rows.length && <div style={{ padding: 14, color: "var(--n5)" }}>No IT rows available.</div>}
      {rows.map((item) => (
        <div key={item.caseId} style={{ display: "grid", gridTemplateColumns: "1.4fr .9fr .8fr", gap: 10, padding: "10px 14px", borderTop: "1px solid var(--n8)", alignItems: "center" }}>
          <div>
            <div className="emp-name" style={{ fontSize: 12 }}>{item.name}</div>
            <div className="emp-role" style={{ fontSize: 10 }}>{item.caseId} · {item.dept}</div>
          </div>
          <span>{item.it}</span>
          <span className={`badge ${item.st}`}>{item.st}</span>
        </div>
      ))}
    </div>
  );
}
