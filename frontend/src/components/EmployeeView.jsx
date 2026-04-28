import { useState, useEffect } from "react";
import { api } from "../api";

function pickCase(cases = []) {
  return cases.find((item) => item.st !== "completed") || cases[0] || null;
}

function DocumentTable({ item, loading }) {
  const docs = item?.documentRows || item?.documents || [];
  return (
    <div className="card employee-doc-card">
      <div className="card-head"><div className="card-title">Submitted Documents</div></div>
      <div className="employee-doc-table">
        <div className="employee-doc-head"><span>Document</span><span>Submitted</span><span>Timing</span><span>Validation</span></div>
        {loading && <div className="employee-doc-row"><div><strong>Loading documents…</strong></div><span>-</span><span className="doc-timing pending">-</span><span className="doc-validation pending">-</span></div>}
        {!loading && docs.map((doc, index) => (
          <div className="employee-doc-row" key={`${doc.document_type || doc.name}-${index}`}>
            <div><strong>{doc.document_type || doc.name || `Document ${index + 1}`}</strong><small>{doc.rejection_reason || doc.correction_instructions || "-"}</small></div>
            <span>{doc.submitted_at || doc.created_at || "-"}</span>
            <span className="doc-timing pending">{doc.timing || doc.sla_status || "Pending"}</span>
            <span className={`doc-validation ${String(doc.status || "pending").toLowerCase()}`}>{doc.status || "Pending"}</span>
          </div>
        ))}
        {!loading && !docs.length && <div className="employee-doc-row"><div><strong>No documents submitted yet</strong></div><span>-</span><span className="doc-timing pending">Pending</span><span className="doc-validation pending">Pending</span></div>}
      </div>
    </div>
  );
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
      {mode === "public" && <div className="card" style={{ padding: 14 }}><div className="card-title">Secure Employee Portal</div><div className="card-sub">Read-only case status for direct-link access</div></div>}
      <section className="employee-hero">
        <div className="employee-avatar" style={{ background: item.col || "#5929d0" }}>{item.ini || "NJ"}</div>
        <div className="employee-hero-main">
          <div className="employee-eyebrow">Employee Onboarding Portal</div>
          <h2>{item.name || "New Joiner"}</h2>
          <p>{item.role || "Candidate"} · {item.dept || "Department"} · {item.caseId || "Case pending"}</p>
          <div className="employee-progress-track"><div style={{ width: `${item.prog || 0}%` }} /></div>
        </div>
        <div className="employee-hero-status"><span className={`badge ${item.st}`}>{item.st}</span><strong>{item.prog || 0}%</strong><span>overall progress</span></div>
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
      {(mode === "docs" || mode === "public" || mode === "portal") && <DocumentTable item={item} loading={detailLoading} />}
    </div>
  );
}
