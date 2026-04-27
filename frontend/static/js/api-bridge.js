(function () {
  async function request(path, options) {
    const response = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  function replaceArray(target, rows) {
    if (Array.isArray(target) && Array.isArray(rows)) {
      target.splice(0, target.length, ...rows);
    }
  }

  function setKpi(label, value) {
    document.querySelectorAll(".kpi").forEach((card) => {
      const labelEl = card.querySelector(".kpi-label");
      const valueEl = card.querySelector(".kpi-value");
      if (labelEl && valueEl && labelEl.textContent.trim() === label) {
        valueEl.textContent = value;
      }
    });
  }

  let lastSnapshot = "";

  function hydrateDesktop(data, options = {}) {
    replaceArray(EMP, data.employees);
    replaceArray(AUDIT, data.audit);
    replaceArray(EXC, data.exceptions);

    if (data.metrics) {
      setKpi("Active Cases", data.metrics.active);
      setKpi("In Progress", data.metrics.inProgress);
      setKpi("Pending HIL", data.metrics.pendingHil);
      setKpi("Completed", data.metrics.completed);
      setKpi("Blockers", data.metrics.blocked);
    }

    if (!options.preserveFilter && typeof currentFilter !== "undefined") currentFilter = "all";
    [
      "renderOvCases",
      "renderAllCases",
      "renderMiniAudit",
      "renderAuditRows",
      "renderExceptions",
      "renderTaskPanel",
      "renderPost",
      "updateStatusBar",
    ].forEach((fn) => {
      if (typeof window[fn] === "function") window[fn]();
    });
  }

  window.AegisAPI = {
    bootstrap: () => request("/api/bootstrap"),
    cases: () => request("/api/onboarding/cases/"),
    case: (id) => request(`/api/onboarding/cases/${id}`),
    activity: () => request("/api/audit/activity"),
    approveGate: (gateId, notes) =>
      request(`/api/hil/gates/${gateId}/approve`, {
        method: "PUT",
        body: JSON.stringify({ decision_notes: notes || "" }),
      }),
    sendBackgroundVerification: (caseRef) =>
      request(`/api/hil/background-verification/send${caseRef ? `?case_ref=${encodeURIComponent(caseRef)}` : ""}`, {
        method: "POST",
      }),
  };

  async function syncDesktop(options = {}) {
    const data = await window.AegisAPI.bootstrap();
    const snapshot = JSON.stringify({
      employees: data.employees,
      audit: data.audit,
      metrics: data.metrics,
    });
    if (snapshot !== lastSnapshot) {
      hydrateDesktop(data, options);
      lastSnapshot = snapshot;
    }
    return data;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await syncDesktop();
      const status = document.getElementById("sb-action-text");
      if (status) status.textContent = "Backend sync complete";
      setInterval(() => {
        syncDesktop({ preserveFilter: true }).catch((error) => {
          console.warn("AEGIS realtime sync failed.", error);
        });
      }, 5000);
    } catch (error) {
      console.warn("AEGIS API unavailable, backend data unavailable.", error);
      const status = document.getElementById("sb-action-text");
      if (status) status.textContent = "Backend unavailable";
    }
  });
})();
