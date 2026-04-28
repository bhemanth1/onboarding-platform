function phaseClass(phase = "") {
  if (phase.includes("Pre")) return "purple";
  if (phase.includes("Post")) return "orange";
  if (phase.includes("Completed")) return "green";
  return "pink";
}

export default function CasesTable({ cases = [], onOpenCase }) {
  return (
    <div className="card">
      <div className="card-head"><div><div className="card-title">All Active Cases</div><div className="card-sub">Read-only case list from backend</div></div></div>
      <div className="react-table-header"><span>Employee</span><span>Owner</span><span>Phase</span><span>Status</span><span>Progress</span><span>IT</span><span>Docs</span></div>
      {cases.map((item) => (
        <div key={item.caseId} onClick={() => onOpenCase?.(item)} style={{ display: "grid", gridTemplateColumns: "1.6fr 1.25fr 1.1fr 1fr 80px 80px 90px", columnGap: 10, alignItems: "center", padding: "9px 14px", borderBottom: "1px solid var(--n8)", cursor: onOpenCase ? "pointer" : "default" }}>
          <div className="emp"><div className="emp-av" style={{ background: item.col }}>{item.ini}</div><div><div className="emp-name">{item.name}</div><div className="emp-role">{item.dept} · {item.caseId}</div></div></div>
          <div style={{ fontSize: 10.5, color: "var(--n3)" }}>{item.owner}</div>
          <span className={`tag ${phaseClass(item.phase)}`}>{item.phase}</span>
          <span className={`badge ${item.st}`}>{item.st}</span>
          <div style={{ fontSize: 11, color: "var(--n3)" }}>{item.prog}%</div>
          <div style={{ fontSize: 11, color: "var(--n3)" }}>{item.it}</div>
          <div style={{ fontSize: 11, color: "var(--n3)" }}>{item.docs}</div>
        </div>
      ))}
    </div>
  );
}
