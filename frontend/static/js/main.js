document.addEventListener('DOMContentLoaded', () => {
  fetch('/health').catch(() => undefined);
});
