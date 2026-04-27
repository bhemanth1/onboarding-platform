(function () {
  const API_PREFIX = '/dana-aegis';

  window.Pages = {
    loadProfiles: () => fetch(`${API_PREFIX}/api/v1/profiles`).then((response) => response.json()),
    loadCases: () => fetch(`${API_PREFIX}/api/v1/cases`).then((response) => response.json()),
  };
})();
