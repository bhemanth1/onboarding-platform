export default function PostOnboardPanel({ cases = [] }) {
  const rows = cases.filter((item) => item.phase === "Post-Onboarding" || item.phase === "Completed");
  return (
    <div className="card">
      <div className="card-head"><div><div className="card-title">Post-Onboarding Checklist</div><div className="card-sub">Joining formalities · PF · Buddy assignment</div></div></div>
      {!rows.length && <div style={{ padding: 14, color: "var(--n5)" }}>No post-onboarding rows available.</div>}
      {rows.map((item) => (
        <div key={item.caseId} style={{ display: "grid", gridTemplateColumns: "1.5fr .9fr .8fr .8fr", gap: 10, padding: "10px 14px", borderTop: "1px solid var(--n8)", alignItems: "center" }}>
          <div>
            <div className="emp-name" style={{ fontSize: 12 }}>{item.name}</div>
            <div className="emp-role" style={{ fontSize: 10 }}>{item.caseId} · {item.dept}</div>
          </div>
          <span className="tag orange">{item.phase}</span>
          <span className={`badge ${item.st}`}>{item.st}</span>
          <span style={{ fontSize: 11, color: "var(--n4)" }}>{item.prog}%</span>
        </div>
      ))}
    </div>
  );
}
