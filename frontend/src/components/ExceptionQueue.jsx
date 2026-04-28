function badge(status) {
  return <span className={`badge ${status}`}>{String(status || "").replace(/_/g, " ")}</span>;
}

export default function ExceptionQueue({ cases = [], gates = [] }) {
  const rows = cases.filter((item) => ["blocked", "at-risk", "hil"].includes(item.st));
  return (
    <>
      <div className="kpi-grid g3">
        <div className="kpi red"><div className="kpi-label">Blockers</div><div className="kpi-value">{cases.filter((x) => x.st === "blocked").length}</div><div className="kpi-meta">Needs intervention</div></div>
        <div className="kpi orange"><div className="kpi-label">At Risk</div><div className="kpi-value">{cases.filter((x) => x.st === "at-risk").length}</div><div className="kpi-meta">SLA watch</div></div>
        <div className="kpi pink"><div className="kpi-label">HIL Pending</div><div className="kpi-value">{cases.filter((x) => x.st === "hil").length}</div><div className="kpi-meta">Awaiting review</div></div>
      </div>
      <div className="card">
        <div className="card-head"><div className="card-title">Exception & HIL Queue</div><span className="tag pink">Requires System Action</span></div>
        {rows.map((item) => (
          <div className="exc" key={item.caseId}>
            <div className="exc-head"><span className={`exc-tag ${item.st === "blocked" ? "blocker" : item.st === "hil" ? "hil" : "high"}`}>{item.st}</span><span className="exc-emp">{item.name}</span></div>
            <div className="exc-type">{item.scenario}</div>
            <div className="exc-desc">{item.caseId} · {item.phase} · {item.docs} · {item.it}</div>
            <div className="exc-actions">{badge(item.st)}</div>
          </div>
        ))}
        {gates.filter((gate) => gate.decision === "pending").map((gate) => (
          <div className="exc" key={gate.gate_id}>
            <div className="exc-head"><span className="exc-tag hil">HIL</span><span className="exc-emp">{gate.candidate_name}</span></div>
            <div className="exc-type">{gate.gate_type}</div>
            <div className="exc-desc">{gate.case_number} · {gate.decision} · {gate.email_sent_to || "HR approver"}</div>
          </div>
        ))}
      </div>
    </>
  );
}
