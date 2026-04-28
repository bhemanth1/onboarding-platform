const STATUS_COLOR = {
  configured: "green",
  submitted: "green",
  completed: "green",
  not_started: "orange",
  not_submitted: "orange",
  not_applicable: "purple",
  failed: "red",
  pending: "purple",
};

function statusCls(v) {
  return STATUS_COLOR[String(v || "").toLowerCase()] || "purple";
}

function StatusPill({ label, value }) {
  const cls = statusCls(value);
  const display = String(value || "not started").replace(/_/g, " ");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--n8)" }}>
      <span style={{ fontSize: 11, flex: 1, color: "var(--n3)" }}>{label}</span>
      <span className={`tag ${cls}`} style={{ fontSize: 10 }}>{display}</span>
    </div>
  );
}

export default function TaxPayrollPanel({ cases = [] }) {
  const relevant = cases.filter((item) =>
    item.phase === "Onboarding" || item.phase === "Post-Onboarding" || item.phase === "Completed"
  );

  const configuredCount = cases.filter((item) =>
    String(item.taxStatutoryConfigStatus || item.tax_statutory_config_status || "").toLowerCase() === "configured"
  ).length;

  const submittedCount = cases.filter((item) =>
    String(item.statutoryFormSubmissionStatus || item.statutory_form_submission_status || "").toLowerCase() === "submitted"
  ).length;

  const payrollDoneCount = cases.filter((item) =>
    String(item.payrollStatus || item.payroll_status || "").toLowerCase() === "completed"
  ).length;

  return (
    <div className="tax-payroll-panel">
      <div className="kpi-grid g3" style={{ marginBottom: 12 }}>
        <div className="kpi blue">
          <div className="kpi-label">Tax Config Done</div>
          <div className="kpi-value">{configuredCount}</div>
          <div className="kpi-meta">of {cases.length} cases</div>
        </div>
        <div className="kpi purple">
          <div className="kpi-label">Statutory Submitted</div>
          <div className="kpi-value">{submittedCount}</div>
          <div className="kpi-meta">Forms submitted</div>
        </div>
        <div className="kpi green">
          <div className="kpi-label">Payroll Confirmed</div>
          <div className="kpi-value">{payrollDoneCount}</div>
          <div className="kpi-meta">Ready for payroll</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Tax &amp; Payroll Status</div>
            <div className="card-sub">Statutory form tracking · Tax configuration · Payroll setup</div>
          </div>
          <span className="tag purple">{relevant.length} Cases</span>
        </div>
        <div style={{ padding: "0 14px 12px", maxHeight: 480, overflowY: "auto" }}>
          {!relevant.length && (
            <div style={{ padding: 14, color: "var(--n5)", fontSize: 12 }}>
              No cases in Onboarding or Post-Onboarding phase.
            </div>
          )}
          {relevant.map((item) => (
            <div key={item.caseId} style={{ padding: "10px 0", borderBottom: "1px solid var(--n8)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div className="employee-avatar" style={{ width: 28, height: 28, fontSize: 11, background: item.col || "#5929d0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
                  {item.ini || "NJ"}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: "var(--n5)" }}>{item.caseId} · {item.role} · {item.dept}</div>
                </div>
                <span className={`badge ${item.st}`} style={{ marginLeft: "auto", fontSize: 10 }}>{item.st}</span>
              </div>
              <div style={{ paddingLeft: 36 }}>
                <StatusPill label="Statutory Form Type"       value={item.statutory_form_type || item.statutoryFormType || "—"} />
                <StatusPill label="Statutory Form Status"     value={item.statutory_form_submission_status || item.statutoryFormSubmissionStatus} />
                <StatusPill label="Tax / Statutory Config"    value={item.tax_statutory_config_status || item.taxStatutoryConfigStatus} />
                <StatusPill label="Payroll Setup"             value={item.payrollStatus || item.payroll_status} />
                <StatusPill label="PF / Provident Fund"       value={item.pfStatus || item.pf_status || (item.pfConfirmed ? "completed" : "not_started")} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
