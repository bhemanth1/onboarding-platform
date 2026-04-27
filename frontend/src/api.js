function normalizeApiBase(value) {
  const base = (value || "/dana-aegis").replace(/\/+$/, "");
  return base.endsWith("/dana-aegis") ? base : `${base}/dana-aegis`;
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE);
const COLORS = ["#0E2E89", "#16A34A", "#E4902E", "#22D3EE", "#7C3AED", "#E11D48", "#CF008B", "#0E766E", "#6366F1", "#F97316"];

async function get(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

function analyticsFromCases(cases) {
  const countBy = (key) => cases.reduce((acc, item) => {
    const value = item[key] || "Unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  const risks = [...cases].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0)).slice(0, 5);
  return {
    byStatus: countBy("st"),
    byPhase: countBy("phase"),
    byDepartment: countBy("dept"),
    byBackgroundVerification: cases.reduce((acc, item) => {
      const value = item.backgroundVerification || item.docs || "Unknown";
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {}),
    topRisks: risks
  };
}

function label(value, fallback = "Not Started") {
  if (!value) return fallback;
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function phaseLabel(value) {
  const phase = value || "onboarding";
  return {
    pre_onboarding: "Pre-Onboarding",
    onboarding: "Onboarding",
    post_onboarding: "Post-Onboarding",
    completed: "Completed"
  }[phase] || label(phase);
}

function statusKey(value, isCompleted = false) {
  if (isCompleted) return "completed";
  return {
    pending_hil: "hil",
    in_progress: "in-progress",
    at_risk: "at-risk",
    blocked: "blocked",
    completed: "completed",
    active: "in-progress"
  }[value] || value || "in-progress";
}

function initialsFrom(name, fallback = "NJ") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function displayNameFromCase(item, index = 0) {
  const joinedName = [item.first_name, item.last_name].filter(Boolean).join(" ");
  const directName = item.name || item.candidate_name || joinedName;
  if (directName && !/^EMP[-\s]/i.test(directName)) return directName;
  return item.employee_id || item.case_number || item.id || `Case ${index + 1}`;
}

function normalizeCase(item, index = 0) {
  const name = displayNameFromCase(item, index);
  const status = statusKey(item.st || item.status, item.isCompleted ?? item.is_completed);
  const phase = phaseLabel(item.phaseKey || item.phase);
  const progress = Number(item.prog ?? item.overall_progress ?? item.onboarding_progress ?? item.pre_onboarding_progress ?? 0) || 0;
  const docsStatus = item.docs || item.docs_status || item.document_status || item.hr_verification_status;
  const hilDecision = item.backgroundVerification ?? item.background_verification ?? item.hil_decision;
  return {
    ...item,
    id: item.employee_id || item.id || item.case_number,
    caseId: item.caseId || item.case_number || item.case_id || item.id,
    caseUuid: item.caseUuid || item.case_uuid || item.id,
    name,
    ini: item.ini || initialsFrom(name, "AE"),
    col: item.col || COLORS[index % COLORS.length],
    role: item.role || item.title || "New Joiner",
    dept: item.dept || item.department || "Onboarding",
    owner: item.owner || item.assignedTo || item.assigned_to || "HR Coordinator",
    phase,
    phaseKey: item.phaseKey || item.phase,
    st: status,
    rawStatus: item.rawStatus || item.status,
    join: item.join || item.joining_date || "",
    prog: Math.max(0, Math.min(100, progress)),
    it: item.it || label(item.it_status),
    docs: hilDecision ? `HR ${label(hilDecision)}` : label(docsStatus, "Not Submitted"),
    documentRows: item.documents || item.documentRows || item.document_rows || [],
    followUps: item.followUps || item.follow_ups || [],
    rejectionReason: item.rejectionReason || item.rejection_reason,
    correctionInstructions: item.correctionInstructions || item.correction_instructions,
    backgroundVerification: hilDecision,
    scenario: item.scenario || scenarioFor(status, phase),
    slaLabel: item.slaLabel || (status === "at-risk" || status === "blocked" ? "SLA Watch" : "On Track"),
    riskScore: item.riskScore ?? (status === "blocked" ? 92 : status === "at-risk" ? 78 : status === "hil" ? 55 : 25)
  };
}

function normalizeCases(cases = []) {
  return cases.map((item, index) => normalizeCase(item, index));
}

function scenarioFor(status, phase) {
  if (status === "hil") return "Awaiting HR approval";
  if (status === "blocked") return "Blocked exception";
  if (status === "at-risk") return "SLA at risk";
  if (status === "completed") return "Completed onboarding";
  if (phase === "Pre-Onboarding") return "Pre-boarding in progress";
  if (phase === "Post-Onboarding") return "Post-boarding checklist";
  return "Normal onboarding";
}

function normaliseMetrics(kpis = {}, cases = []) {
  return {
    active: kpis.active ?? kpis.active_cases ?? cases.length,
    inProgress: kpis.inProgress ?? kpis.in_progress ?? 0,
    pendingHil: kpis.pendingHil ?? kpis.pending_hil ?? 0,
    completed: kpis.completed ?? kpis.completed_count ?? 0,
    atRisk: kpis.atRisk ?? kpis.at_risk ?? 0,
    blocked: kpis.blocked ?? 0,
    avgProgress: kpis.avgProgress ?? kpis.avg_progress ?? 0,
    openExceptions: kpis.openExceptions ?? kpis.open_exceptions ?? 0,
    slaBreaches: kpis.slaBreaches ?? kpis.sla_breaches ?? 0
  };
}

async function dashboard() {
  const [kpis, rawCases, audit, hil, profiles, followUps] = await Promise.all([
    get("/api/v1/dashboard/kpis"),
    get("/api/v1/cases"),
    get("/api/v1/audit/live?limit=100"),
    get("/api/v1/hil"),
    get("/api/v1/profiles"),
    get("/api/v1/pre-onboarding/follow-ups")
  ]);
  const cases = normalizeCases(rawCases);
  const analytics = analyticsFromCases(cases);
  analytics.metrics = normaliseMetrics(kpis, cases);
  return {
    source: "postgresql",
    generated_at: new Date().toISOString(),
    metrics: analytics.metrics,
    cases,
    audit,
    analytics,
    profiles,
    followUps,
    hil_gates: hil,
    workflow: { newJoiner: [], hrCoordinator: [] }
  };
}

export const api = {
  dashboard,
  cases: async () => normalizeCases(await get("/api/v1/cases")),
  profiles: () => get("/api/v1/profiles"),
  caseDetail: async (caseRef) => normalizeCase(await get(`/api/v1/cases/${encodeURIComponent(caseRef)}`)),
  followUps: () => get("/api/v1/pre-onboarding/follow-ups"),
  analytics: async () => analyticsFromCases(normalizeCases(await get("/api/v1/cases"))),
  audit: () => get("/api/v1/audit/live?limit=100"),
  hil: () => get("/api/v1/hil"),
  workflows: async () => ({ newJoiner: [], hrCoordinator: [] })
};
