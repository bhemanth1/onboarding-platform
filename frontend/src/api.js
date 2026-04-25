const API_BASE = import.meta.env.VITE_API_BASE || "";

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

export const api = {
  dashboard: () => get("/api/mvp/dashboard"),
  cases: () => get("/api/mvp/cases"),
  caseDetail: (caseRef) => get(`/api/mvp/cases/${encodeURIComponent(caseRef)}`),
  analytics: () => get("/api/mvp/analytics"),
  audit: () => get("/api/mvp/audit?limit=100"),
  hil: () => get("/api/mvp/hil"),
  workflows: () => get("/api/mvp/workflows")
};
