(function () {
  window.AegisLegacy = {
    profiles: () => fetch('/api/v1/profiles').then((response) => response.json()),
    dashboard: () => fetch('/api/v1/dashboard/kpis').then((response) => response.json()),
    cases: () => fetch('/api/v1/cases').then((response) => response.json()),
    audit: () => fetch('/api/v1/audit/live?limit=100').then((response) => response.json()),
    hil: () => fetch('/api/v1/hil').then((response) => response.json()),
  };
})();
