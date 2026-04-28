import { useState, useEffect } from "react";
import { api } from "../api";

const STATUS_CHIP = {
  sent: "green",
  configured: "green",
  submitted: "green",
  signed_off: "green",
  completed: "green",
  validated: "green",
  approved: "green",
  not_sent: "orange",
  not_started: "orange",
  not_submitted: "orange",
  not_applicable: "purple",
  pending: "purple",
  failed: "red",
  rejected: "red",
  correction_required: "red",
};

function statusChipClass(value) {
  return STATUS_CHIP[String(value || "").toLowerCase()] || "purple";
}

function ChecklistItem({ label, value, detail }) {
  const cls = statusChipClass(value);
  return (
    <div className="employee-checklist-row">
      <span className="employee-checklist-label">{label}</span>
      <span className={`tag ${cls}`}>{String(value || "pending").replace(/_/g, " ")}</span>
      {detail && <span className="employee-checklist-detail">{detail}</span>}
    </div>
  );
}

function DocumentTable({ item, loading }) {
  const docs = item?.documentRows || item?.documents || [];
  return (
    <div className="card employee-doc-card">
      <div className="card-head"><div className="card-title">Submitted Documents</div></div>
      <div className="employee-doc-table">
        <div className="employee-doc-head">
          <span>Document</span><span>Submitted</span><span>Timing</span><span>Validation</span>
        </div>
        {loading && (
          <div className="employee-doc-row">
            <div><strong>Loading documents…</strong></div>
            <span>-</span><span className="doc-timing pending">-</span>
            <span className="doc-validation pending">-</span>
          </div>
        )}
        {!loading && docs.map((doc, index) => {
          const hasIssue = doc.rejection_reason || doc.correction_instructions;
          return (
            <div className="employee-doc-row" key={`${doc.document_type || doc.name}-${index}`}>
              <div>
                <strong>{doc.document_type || doc.name || `Document ${index + 1}`}</strong>
                {doc.rejection_reason && (
                  <small style={{ color: "var(--error)", display: "block", marginTop: 2 }}>
                    Rejected: {doc.rejection_reason}
                  </small>
                )}
                {doc.correction_instructions && (
                  <small style={{ color: "var(--warning)", display: "block", marginTop: 2 }}>
                    Action: {doc.correction_instructions}
                  </small>
                )}
                {!hasIssue && <small style={{ color: "var(--n5)" }}>-</small>}
              </div>
              <span>{doc.submitted_at || doc.created_at || "-"}</span>
              <span className="doc-timing pending">{doc.timing || doc.sla_status || "Pending"}</span>
              <span className={`doc-validation ${String(doc.status || "pending").toLowerCase()}`}>
                {doc.status || "Pending"}
              </span>
            </div>
          );
        })}
        {!loading && !docs.length && (
          <div className="employee-doc-row">
            <div><strong>No documents submitted yet</strong></div>
            <span>-</span>
            <span className="doc-timing pending">Pending</span>
            <span className="doc-validation pending">Pending</span>
          </div>
        )}
      </div>
    </div>
  );
}

function OnboardingChecklist({ item }) {
  if (!item) return null;
  const checklistItems = [
    {
      label: "Tax / Statutory Config",
      value: item.taxStatutoryConfigStatus || item.tax_statutory_config_status,
      detail: item.statutory_form_type ? `Form: ${item.statutory_form_type}` : null,
    },
    {
      label: "PF / Statutory Form",
      value: item.statutory_form_submission_status || (item.pfConfirmed ? "submitted" : "not_submitted"),
      detail: null,
    },
    {
      label: "Bank / Payroll Setup",
      value: item.payrollStatus || item.payroll_status || (item.payrollConfirmed ? "completed" : "not_started"),
      detail: null,
    },
    {
      label: "IT Provisioning",
      value: item.it || item.it_status,
      detail: item.it_admin_notification_failed ? "IT notification failed — action required" : null,
    },
    {
      label: "Onboarding Mail",
      value: item.welcomeEmailSent || item.welcome_email_status
        ? (item.welcomeEmailSent || item.welcome_email_status === "sent" ? "sent" : item.welcome_email_status)
        : "not_sent",
      detail: null,
    },
    {
      label: "Manager Notification",
      value: item.managerNotificationStatus || item.manager_notification_status || "not_sent",
      detail: null,
    },
    {
      label: "Welcome Email",
      value: item.welcome_email_status || (item.welcomeEmailSent ? "sent" : "not_sent"),
      detail: null,
    },
    {
      label: "HR Sign-off",
      value: item.hr_signoff_status || item.hrSignoffStatus || (item.isCompleted ? "signed_off" : "pending"),
      detail: null,
    },
  ];

  return (
    <div className="card">
      <div className="card-head"><div className="card-title">Onboarding Checklist</div></div>
      <div className="employee-checklist">
        {checklistItems.map((ci) => (
          <ChecklistItem key={ci.label} label={ci.label} value={ci.value} detail={ci.detail} />
        ))}
      </div>
    </div>
  );
}

function pickCase(cases = []) {
  return cases.find((item) => item.st !== "completed") || cases[0] || null;
}

export default function EmployeeView({ mode = "portal", cases = [], item: inputItem, loading = false, error = "", token = "" }) {
  const summaryItem = inputItem || pickCase(cases);
  const [detailItem, setDetailItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (mode === "public" || !summaryItem?.caseId) return;
    let cancelled = false;
    setDetailLoading(true);
    api.caseDetail(summaryItem.caseId).then((detail) => {
      if (!cancelled) {
        setDetailItem(detail);
        setDetailLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setDetailLoading(false);
    });
    return () => { cancelled = true; };
  }, [summaryItem?.caseId, mode]);

  const item = mode === "public" ? summaryItem : (detailItem || summaryItem);

  if (mode === "public") {
    if (loading) return <div className="card" style={{ padding: 18 }}>Opening secure portal for {token || "token"}...</div>;
    if (error) return <div className="card" style={{ padding: 18, color: "var(--error)" }}>{error}</div>;
    if (!item) return <div className="card" style={{ padding: 18 }}>Case not found for token.</div>;
  }

  if (!item) return <div className="card" style={{ padding: 18 }}>No employee case available.</div>;

  return (
    <div className="employee-portal">
      {mode === "public" && (
        <div className="card" style={{ padding: 14 }}>
          <div className="card-title">Secure Employee Portal</div>
          <div className="card-sub">Read-only case status for direct-link access</div>
        </div>
      )}
      <section className="employee-hero">
        <div className="employee-avatar" style={{ background: item.col || "#5929d0" }}>{item.ini || "NJ"}</div>
        <div className="employee-hero-main">
          <div className="employee-eyebrow">Employee Onboarding Portal</div>
          <h2>{item.name || "New Joiner"}</h2>
          <p>{item.role || "Candidate"} · {item.dept || "Department"} · {item.caseId || "Case pending"}</p>
          <div className="employee-progress-track"><div style={{ width: `${item.prog || 0}%` }} /></div>
        </div>
        <div className="employee-hero-status">
          <span className={`badge ${item.st}`}>{item.st}</span>
          <strong>{item.prog || 0}%</strong>
          <span>overall progress</span>
        </div>
      </section>

      <div className="card">
        <div className="card-head"><div className="card-title">Current Status</div></div>
        <div className="employee-status-list">
          <div className="employee-info-pill"><span>Case status</span><strong>{item.st}</strong></div>
          <div className="employee-info-pill"><span>Document status</span><strong>{item.docs}</strong></div>
          <div className="employee-info-pill"><span>IT setup</span><strong>{item.it}</strong></div>
          <div className="employee-info-pill"><span>Assigned HR</span><strong>{item.owner}</strong></div>
        </div>
      </div>

      {(mode === "docs" || mode === "public" || mode === "portal") && (
        <DocumentTable item={item} loading={detailLoading} />
      )}

      {(mode === "portal" || mode === "public") && (
        <OnboardingChecklist item={item} />
      )}
    </div>
  );
}
