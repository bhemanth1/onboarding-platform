(function () {
  const API_PREFIX = '/dana-aegis';

  window.AegisLegacy = {
    profiles: () => fetch(`${API_PREFIX}/api/v1/profiles`).then((response) => response.json()),
    dashboard: () => fetch(`${API_PREFIX}/api/v1/dashboard/kpis`).then((response) => response.json()),
    cases: () => fetch(`${API_PREFIX}/api/v1/cases`).then((response) => response.json()),
    audit: () => fetch(`${API_PREFIX}/api/v1/audit/live?limit=100`).then((response) => response.json()),
    hil: () => fetch(`${API_PREFIX}/api/v1/hil`).then((response) => response.json()),
  };
})();
