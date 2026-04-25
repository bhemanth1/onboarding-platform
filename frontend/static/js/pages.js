/**
 * Pages and Views
 */

const ROLES = [
  { name: 'HR Coordinator', color: '#5929d0', initials: 'HR', key: 'hr' },
  { name: 'HR Ops Manager', color: '#CF008B', initials: 'OP', key: 'ops' },
  { name: 'Employee', color: '#22D3EE', initials: 'EE', key: 'emp' }
];

const ROLE_PAGES = {
  hr: ['overview', 'cases', 'preonboard', 'exceptions', 'post', 'audit'],
  ops: ['ops-dashboard', 'hil-approvals', 'sla'],
  emp: ['emp-portal']
};

const PAGE_META = {
  overview: { title: 'HR Coordinator — Dashboard', crumb: 'Dashboard' },
  cases: { title: 'HR Coordinator — Cases', crumb: 'Cases' },
  preonboard: { title: 'HR Coordinator — Pre-Onboarding', crumb: 'Pre-Onboarding' },
  exceptions: { title: 'HR Coordinator — Exceptions', crumb: 'Exceptions' },
  post: { title: 'HR Coordinator — Post-Onboarding', crumb: 'Post-Onboarding' },
  audit: { title: 'HR Coordinator — Audit Log', crumb: 'Audit Log' }
};

// Mock data for demo
const MOCK_CASES = [
  {
    id: 'CASE-001',
    employee_id: 'EMP-001',
    employee_name: 'Sarah Mitchell',
    phase: 'onb',
    status: 'in_progress',
    progress_percentage: 65,
    current_step: 4,
    total_steps: 6,
    joining_date: '2026-05-15',
    role: 'Product Manager',
    department: 'Product',
    it_status: 'In Progress',
    docs_status: 'Verified'
  },
  {
    id: 'CASE-002',
    employee_id: 'EMP-002',
    employee_name: 'John Doe',
    phase: 'pre',
    status: 'pending',
    progress_percentage: 20,
    current_step: 2,
    total_steps: 6,
    joining_date: '2026-04-28',
    role: 'Senior Engineer',
    department: 'Engineering',
    it_status: 'Pending',
    docs_status: 'Pending'
  },
  {
    id: 'CASE-003',
    employee_id: 'EMP-003',
    employee_name: 'Priya Kapoor',
    phase: 'post',
    status: 'completed',
    progress_percentage: 100,
    current_step: 6,
    total_steps: 6,
    joining_date: '2026-04-15',
    role: 'Designer',
    department: 'Design',
    it_status: 'Complete',
    docs_status: 'Complete'
  }
];

// Build role dropdown
function buildRoleDropdown() {
  const list = document.getElementById('role-list');
  list.innerHTML = ROLES.map(role => `
    <div class="role-dd-item selected" onclick="setRole('${role.name}', '${role.color}', '${role.initials}', '${role.name}', this)">
      <div class="role-av" style="background:${role.color}">${role.initials}</div>
      <div class="role-dd-info">
        <div class="role-dd-name">${role.name}</div>
        <div class="role-dd-desc">Switch role</div>
      </div>
    </div>
  `).join('');
}

// Build taskbar nav based on role
function buildTaskbar(roleName) {
  const nav = document.getElementById('tb-nav');
  const role = ROLES.find(r => r.name === roleName);
  const pages = ROLE_PAGES[role.key] || [];

  const icons = {
    overview: '📊',
    cases: '📋',
    preonboard: '⚙️',
    exceptions: '⚠️',
    post: '✅',
    audit: '📝',
    'ops-dashboard': '🎯',
    'hil-approvals': '✋',
    'sla': '⏱️',
    'emp-portal': '👤'
  };

  nav.innerHTML = pages.map(page => `
    <div class="tb-icon" data-page="${page}" data-tip="${PAGE_META[page]?.crumb || page.replace('-', ' ')}" onclick="nav('${page}', this)">
      ${icons[page] || '📄'}
    </div>
  `).join('');

  // Set first page as active
  if (pages.length > 0) {
    nav.querySelector('.tb-icon').classList.add('active');
    nav.querySelector('.tb-icon::after');
  }
}

// Navigation
let currentPage = 'overview';

function nav(pageName, el) {
  if (el) el.classList.add('active');
  document.querySelectorAll('.tb-icon').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(`p-${pageName}`);
  if (page) {
    page.classList.add('active');
    currentPage = pageName;
    const meta = PAGE_META[pageName];
    if (meta) {
      document.getElementById('ctx-title').textContent = meta.title;
    }
  }
}

// Initialize pages with content
function initializePages() {
  buildRoleDropdown();
  buildTaskbar('HR Coordinator');
  loadDashboard();
}

// Load dashboard data
async function loadDashboard() {
  try {
    // Try to fetch from backend
    const cases = await API.getOnboardingCases();
    const audit = await API.getRecentActivity();
    renderDashboard(cases, audit);
  } catch (error) {
    console.warn('Using mock data:', error);
    renderDashboard(MOCK_CASES, []);
  }
}

function renderDashboard(cases, auditLogs) {
  // Render active cases
  const ovCases = document.getElementById('ov-cases');
  if (ovCases) {
    ovCases.innerHTML = cases.slice(0, 5).map(c => `
      <div class="hil-row" style="cursor:pointer" onclick="openCase('${c.id}')">
        <div class="hil-row-title">${c.employee_name || 'Unknown'}</div>
        <div class="hil-row-desc">${c.phase} • ${c.progress_percentage}% complete</div>
      </div>
    `).join('');
  }

  // Render audit logs
  const ovAudit = document.getElementById('ov-audit');
  if (ovAudit) {
    const logs = auditLogs.length > 0 ? auditLogs : [
      { timestamp: '10:45 AM', employee: 'System', action: 'HIL Gate 1 approved', outcome: 'success' }
    ];
    ovAudit.innerHTML = logs.slice(0, 3).map(log => `
      <div class="ma-item">
        <div class="ma-time">${log.timestamp}</div>
        <span class="al-dot p"></span>
        <div class="ma-text">${log.action}</div>
      </div>
    `).join('');
  }
}

// Open case modal
function openCase(id) {
  const caseData = MOCK_CASES.find(c => c.id === id) || { id, employee_name: 'Unknown' };
  document.getElementById('modal').classList.add('open');
  document.getElementById('m-title').textContent = `${caseData.employee_name} — Case Detail`;
  document.getElementById('m-sub').textContent = `${caseData.id} • ${caseData.phase} • ${caseData.role}`;
  document.getElementById('m-ic').textContent = '📁';
  document.getElementById('m-body').innerHTML = `
    <div class="g2" style="margin-bottom:14px">
      <div style="background:var(--n8);border-radius:var(--r-md);padding:14px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--n4);margin-bottom:10px">Summary</div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0"><span style="color:var(--n4)">Employee ID</span><span style="font-weight:600">${caseData.employee_id}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0"><span style="color:var(--n4)">Department</span><span style="font-weight:600">${caseData.department}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0"><span style="color:var(--n4)">Joining Date</span><span style="font-weight:600">${caseData.joining_date}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0"><span style="color:var(--n4)">IT Status</span><span style="font-weight:600">${caseData.it_status}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0"><span style="color:var(--n4)">Documents</span><span style="font-weight:600">${caseData.docs_status}</span></div>
      </div>
      <div style="background:var(--n8);border-radius:var(--r-md);padding:14px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--n4);margin-bottom:10px">Progress</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="flex:1;height:8px;background:var(--n7);border-radius:4px;overflow:hidden">
            <div style="height:100%;background:var(--primary);width:${caseData.progress_percentage}%"></div>
          </div>
          <span style="font-weight:600;font-size:12px">${caseData.progress_percentage}%</span>
        </div>
        <span class="badge in-progress" style="margin-top:8px">Step ${caseData.current_step} of ${caseData.total_steps}</span>
      </div>
    </div>
  `;
}

// Close modal
function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

// Tab filtering
function tabFilter(el, phase, count) {
  document.querySelectorAll('#overview-tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  console.log(`Filtering by phase: ${phase} (${count} items)`);
}

// Toggle UI elements
function toggleLC() {
  document.getElementById('lc-panel').classList.toggle('open');
}

function toggleRoleMenu() {
  document.getElementById('role-dropdown').classList.toggle('open');
}

function setRole(roleTitle, color, initials, fullName, el) {
  if (!el) return;
  document.getElementById('win-role-av').style.background = color;
  document.getElementById('win-role-av').textContent = initials;
  document.getElementById('win-role-name').textContent = roleTitle;
  document.getElementById('tb-profile').style.background = color;
  document.getElementById('tb-profile').textContent = initials;
  document.querySelectorAll('.role-dd-item').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('role-dropdown').classList.remove('open');
  buildTaskbar(roleTitle);
  nav('overview', null);
}

// Window controls
let isMinimized = false;

function winClose() {
  console.log('Window close');
}

function winMinimize() {
  isMinimized = true;
  document.querySelector('.app-window').style.opacity = '0.5';
}

function winMaximize() {
  document.querySelector('.app-window').style.inset = '0 0 0 0';
}

function winRestore() {
  isMinimized = false;
  document.querySelector('.app-window').style.opacity = '1';
  document.querySelector('.app-window').style.inset = '20px 16px 0 16px';
}

// Update time
function updateTime() {
  const now = new Date();
  document.getElementById('tb-time').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('tb-date').textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  document.getElementById('status-time').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initializePages();
  updateTime();
  setInterval(updateTime, 1000);
});
