(function () {
  window.Pages = {
    loadProfiles: () => fetch('/api/v1/profiles').then((response) => response.json()),
    loadCases: () => fetch('/api/v1/cases').then((response) => response.json()),
  };
})();
