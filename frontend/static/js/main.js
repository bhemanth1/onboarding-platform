/**
 * Main Application Script
 */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  setupEventListeners();
  loadDashboard();
}

function setupEventListeners() {
  // Close modal on outside click
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });

  // Close panels on outside click
  document.addEventListener('click', (e) => {
    const lc = document.getElementById('lc-panel');
    const lcBtn = document.querySelector('.tb-live-btn');
    const rd = document.getElementById('role-dropdown');
    const pb = document.getElementById('tb-profile');

    if (lc && lcBtn && !lc.contains(e.target) && !lcBtn.contains(e.target)) {
      lc.classList.remove('open');
    }
    if (rd && pb && !rd.contains(e.target) && !pb.contains(e.target)) {
      rd.classList.remove('open');
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.getElementById('lc-panel').classList.remove('open');
      document.getElementById('role-dropdown').classList.remove('open');
    }
  });
}

// Live Commentary - Simulate agent activity
function updateLiveCommentary() {
  const lcScroll = document.getElementById('lc-scroll');
  if (!lcScroll) return;

  const activities = [
    'HIL Gate 1 approved by Aryan Mehta',
    'IT provisioning request sent to IT team',
    'Document verification completed',
    'Follow-up reminder sent to candidate',
    'Onboarding case created'
  ];

  const timestamps = activities.map((activity, i) => ({
    time: `${10 + i}:${30 + i * 5} AM`,
    activity: activity,
    tag: ['trigger', 'activity', 'hil', 'alert', 'audit'][i % 5]
  }));

  lcScroll.innerHTML = `
    <div class="lc-group">
      <div class="lc-group-head">
        <span>📌 Recent Activity</span>
        <span class="lc-group-count">${timestamps.length}</span>
      </div>
      <div class="lc-events">
        ${timestamps.map(t => `
          <div class="lc-ev new">
            <div class="lc-ev-ts">
              <span class="lc-tag ${t.tag}">${t.tag}</span>
              <span>${t.time}</span>
            </div>
            <div class="lc-ev-text">${t.activity}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Auto-refresh dashboard
setInterval(() => {
  if (!document.getElementById('lc-panel').classList.contains('open')) {
    updateLiveCommentary();
  }
}, 5000);

// Status bar updates
setInterval(() => {
  document.getElementById('status-agents').textContent = '1 Agent Active';
}, 2000);

// Simulate agent actions
function simulateAgentAction() {
  const actions = [
    'Validating documents...',
    'Processing IT request...',
    'Scheduling follow-up...',
    'Triggering HIL gate...'
  ];

  const action = actions[Math.floor(Math.random() * actions.length)];
  console.log('Agent action:', action);
}

// Keyboard navigation shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === '1') nav('overview', document.querySelector('[data-page="overview"]'));
    if (e.key === '2') nav('cases', document.querySelector('[data-page="cases"]'));
    if (e.key === '3') nav('exceptions', document.querySelector('[data-page="exceptions"]'));
  }
});

// Export to CSV
function exportAuditLog() {
  console.log('Exporting audit log...');
}

// Initialize Live Commentary
updateLiveCommentary();
