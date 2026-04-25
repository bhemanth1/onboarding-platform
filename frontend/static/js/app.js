
// ═══════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════
const EMP=[
  {id:'EMP-2026-00841',name:'Aryan Mehta',ini:'AM',col:'#5929d0',role:'Senior Data Engineer',dept:'Engineering',phase:'Onboarding',st:'hil',join:'2026-04-28',prog:55,it:'Pending HIL',docs:'Validated'},
  {id:'EMP-2026-00842',name:'Priya Kapoor',ini:'PK',col:'#CF008B',role:'Product Designer',dept:'Design',phase:'Pre-Onboarding',st:'in-progress',join:'2026-04-28',prog:30,it:'In Queue',docs:'Partial'},
  {id:'EMP-2026-00843',name:'Wei Chen',ini:'WC',col:'#0E2E89',role:'HR Business Partner',dept:'HR',phase:'Post-Onboarding',st:'completed',join:'2026-04-14',prog:95,it:'Provisioned',docs:'Complete'},
  {id:'EMP-2026-00844',name:'Fatima Noor',ini:'FN',col:'#16A34A',role:'Compliance Analyst',dept:'Legal',phase:'Post-Onboarding',st:'at-risk',join:'2026-04-07',prog:80,it:'Provisioned',docs:'Complete'},
  {id:'EMP-2026-00845',name:'Rohit Sharma',ini:'RS',col:'#E4902E',role:'DevOps Engineer',dept:'Engineering',phase:'Onboarding',st:'in-progress',join:'2026-05-05',prog:40,it:'Requested',docs:'In Review'},
  {id:'EMP-2026-00846',name:'Aisha Patel',ini:'AP',col:'#22D3EE',role:'Data Analyst',dept:'Analytics',phase:'Pre-Onboarding',st:'at-risk',join:'2026-05-01',prog:15,it:'Not Started',docs:'Not Started'},
  {id:'EMP-2026-00847',name:"James O'Brien",ini:'JO',col:'#7C3AED',role:'Finance Manager',dept:'Finance',phase:'Onboarding',st:'blocked',join:'2026-04-30',prog:60,it:'Pending',docs:'Exception'},
  {id:'EMP-2026-00848',name:'Mei Tanaka',ini:'MT',col:'#DC2626',role:'UX Researcher',dept:'Design',phase:'Pre-Onboarding',st:'in-progress',join:'2026-05-12',prog:20,it:'Not Started',docs:'Not Started'},
];

const AUDIT=[
  {ts:'09:43',case:'OB-0841',emp:'Aryan Mehta',phase:'Onboarding',ev:'HIL Gate 1 triggered',rule:'BR-002',out:'Pending HR review',dot:'pk'},
  {ts:'09:38',case:'OB-0841',emp:'Aryan Mehta',phase:'Onboarding',ev:'Background check initiated',rule:'BR-002',out:'In Progress',dot:''},
  {ts:'09:31',case:'OB-0841',emp:'Aryan Mehta',phase:'Onboarding',ev:'Document validation passed',rule:'BR-002 v1.3',out:'Pass',dot:'g'},
  {ts:'09:20',case:'OB-0841',emp:'Aryan Mehta',phase:'Onboarding',ev:'Digital intake completed',rule:'BR-002',out:'Submitted',dot:''},
  {ts:'09:05',case:'OB-0842',emp:'Priya Kapoor',phase:'Pre-Onboarding',ev:'3-day follow-up sent',rule:'BR-001',out:'Delivered',dot:''},
  {ts:'08:52',case:'OB-0845',emp:'Rohit Sharma',phase:'Onboarding',ev:'HRMS record created',rule:'BR-003',out:'EMP-2026-00845',dot:'g'},
  {ts:'08:40',case:'OB-0847',emp:"James O'Brien",phase:'Onboarding',ev:'Payroll config blocked',rule:'BR-004',out:'Exception raised',dot:'o'},
  {ts:'08:22',case:'OB-0843',emp:'Wei Chen',phase:'Post-Onboarding',ev:'Buddy assigned',rule:'BR-005',out:'Neha Singh (2.5yr)',dot:'g'},
];

const EXC=[
  {tag:'BLOCKER',tc:'blocker',emp:'System-Wide',type:'F01 — GDPR consent flow missing',desc:'No consent capture at portal entry. System collects sensitive personal data with no defined legal basis. Requires immediate GDPR module implementation.',hil:true},
  {tag:'BLOCKER',tc:'blocker',emp:"James O'Brien",type:'F08 — No deprovisioning path defined',desc:'Candidate paused mid-process. No withdrawal state, no cleanup trigger.',hil:true},
  {tag:'HIGH',tc:'high',emp:'Priya Kapoor',type:'F06 — Joining date amendment needed',desc:'Visa processing delay — requested date change from 28 Apr to 12 May. No amendment workflow exists.',hil:false},
  {tag:'HIGH',tc:'high',emp:'Multiple Cases',type:'F04 — API retry logic undefined',desc:'3 provisioning API calls failed without retry. Cases stalled silently.',hil:false},
];

// ═══════════════════════════════════════════
// ROLE CONFIG
// ═══════════════════════════════════════════
const ROLE_CONFIG={
  'HR Coordinator':{
    color:'#5929d0',
    nav:[
      {label:'Dashboard',ico:'⬛',page:'overview'},
      {label:'Cases',ico:'👥',page:'cases',badge:12},
      {label:'Pre-Onboard',ico:'📋',page:'preonboard',badge:3,badgeColor:'orange'},
      {label:'Exceptions',ico:'⚠',page:'exceptions',badge:4,badgeColor:'red'},
      {label:'Post-Onboard',ico:'✔',page:'post'},
      {label:'Audit',ico:'🔍',page:'audit'},
      {label:'Reports',ico:'📊',page:'reports'},
    ],
    defaultPage:'overview',
  },
  'HR Ops Manager':{
    color:'#CF008B',
    nav:[
      {label:'Dashboard',ico:'⬛',page:'ops-dashboard'},
      {label:'Approvals',ico:'✅',page:'hil-approvals',badge:2,badgeColor:'orange'},
      {label:'Exceptions',ico:'⚠',page:'exceptions',badge:4,badgeColor:'red'},
      {label:'SLA Monitor',ico:'⏱',page:'sla'},
      {label:'Audit',ico:'🔍',page:'audit'},
      {label:'Reports',ico:'📊',page:'reports'},
    ],
    defaultPage:'ops-dashboard',
  },
  'Onboarding Employee':{
    color:'#0E2E89',
    nav:[
      {label:'My Portal',ico:'🏠',page:'emp-portal'},
      {label:'Documents',ico:'📄',page:'emp-docs'},
      {label:'My Progress',ico:'📈',page:'emp-progress'},
    ],
    defaultPage:'emp-portal',
  },
  'IT Support':{
    color:'#E4902E',
    nav:[
      {label:'Queue',ico:'💻',page:'it-queue',badge:4,badgeColor:'orange'},
      {label:'Active',ico:'📋',page:'it-active'},
      {label:'Completed',ico:'✔',page:'it-done'},
    ],
    defaultPage:'it-queue',
  },
  'Admin Team':{
    color:'#16A34A',
    nav:[
      {label:'Task Board',ico:'📋',page:'admin-tasks',badge:3,badgeColor:'orange'},
      {label:'Desks',ico:'🪑',page:'admin-desk'},
      {label:'ID Cards',ico:'🪪',page:'admin-id'},
    ],
    defaultPage:'admin-tasks',
  },
};

const PAGE_META={
  'overview':{title:'HR Coordinator — Dashboard',crumb:'Pipeline health · Active cases · Lifecycle overview'},
  'cases':{title:'All Active Cases',crumb:'Full lifecycle view · 12 employees'},
  'preonboard':{title:'Pre-Onboarding Panel',crumb:'IT Provisioning · Admin Prep · Candidate follow-ups'},
  'exceptions':{title:'Exception & HIL Queue',crumb:'Requires human-in-loop review'},
  'post':{title:'Post-Onboarding',crumb:'Joining formalities · PF · Buddy assignment'},
  'audit':{title:'Audit Log',crumb:'Append-only · All lifecycle events'},
  'reports':{title:'Reports',crumb:'Onboarding analytics · Download ready'},
  'ops-dashboard':{title:'HR Ops Manager Dashboard',crumb:'Pipeline health · Approvals · SLA oversight'},
  'hil-approvals':{title:'HIL Gate 4 — Final Approvals',crumb:'HR Ops Manager sign-off required · 2 pending'},
  'sla':{title:'SLA Monitor',crumb:'SLA compliance · deadline tracking · escalation overview'},
  'emp-portal':{title:'My Onboarding Portal',crumb:'Sarah Mitchell · Joining 15 May 2026'},
  'emp-docs':{title:'My Documents',crumb:'Document submissions · validation status'},
  'emp-progress':{title:'My Progress',crumb:'Onboarding journey timeline'},
  'it-queue':{title:'IT Provisioning Queue',crumb:'Active requests · 4 pending · 1 overdue'},
  'it-active':{title:'Active Tasks',crumb:'Currently in progress by IT Support'},
  'it-done':{title:'Completed Tasks',crumb:'Provisioning completed this week'},
  'admin-tasks':{title:'Admin Task Board',crumb:'Desk, ID card & access card preparation'},
  'admin-desk':{title:'Desk Assignments',crumb:'Desk allocation tracker'},
  'admin-id':{title:'ID Card Status',crumb:'Card printing & access activation'},
};

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
let currentRole='HR Coordinator';
let currentFilter='all';
let currentPage='overview';

const ST_LABELS={completed:'Completed','in-progress':'In Progress','at-risk':'At Risk',blocked:'Blocked',hil:'Pending HIL'};
function badge(st){return`<span class="badge ${st}">${ST_LABELS[st]||st}</span>`}
function days(d){
  const diff=Math.round((new Date(d)-new Date())/(864e5));
  if(diff===0)return'<span class="days today">Today</span>';
  if(diff<0)return`<span class="days ok">Joined ${Math.abs(diff)}d ago</span>`;
  if(diff<=3)return`<span class="days soon">${diff}d away</span>`;
  return`<span class="days ok">${diff}d away</span>`;
}
function prog(p,st){
  const c=st==='completed'?'green':st==='at-risk'||st==='blocked'?'orange':'purple';
  return`<div class="prog"><div class="prog-fill ${c}" style="width:${p}%"></div></div><div class="prog-pct">${p}%</div>`;
}

// ═══════════════════════════════════════════
// NAVIGATION — restores window automatically
// ═══════════════════════════════════════════
function nav(page, triggerEl){
  // Always restore window first if hidden
  if(isMinimized) winRestore();

  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const el=document.getElementById('p-'+page);
  if(el) el.classList.add('active');

  // Update context banner
  const meta=PAGE_META[page]||{title:page,crumb:''};
  const ctxTitle=document.getElementById('ctx-title');
  const ctxCrumb=document.getElementById('ctx-crumb');
  if(ctxTitle) ctxTitle.textContent=meta.title;
  if(ctxCrumb) ctxCrumb.textContent=meta.crumb;

  // Update active taskbar icon
  document.querySelectorAll('.tb-icon').forEach(i=>i.classList.remove('active'));
  const activeIcon=document.querySelector(`.tb-icon[data-page="${page}"]`);
  if(activeIcon) activeIcon.classList.add('active');

  // Track current page
  currentPage=page;

  // Update brand tooltip
  if(typeof updateBrandTooltip==='function') updateBrandTooltip();

  // Render page data
  renderPage(page);
}

function renderPage(page){
  if(page==='overview'){renderOvCases();renderMiniAudit();}
  else if(page==='cases'){renderAllCases();}
  else if(page==='preonboard'){renderTaskPanel();}
  else if(page==='exceptions'){renderExceptions();}
  else if(page==='post'){renderPost();}
  else if(page==='audit'){renderAuditRows();}
  else if(page==='reports'){buildReports();}
  else if(page==='ops-dashboard'){buildOpsManagerDashboard();}
  else if(page==='hil-approvals'){buildHILApprovals();}
  else if(page==='sla'){buildSLAMonitor();}
  else if(page==='emp-portal'){buildEmployeePortal();}
  else if(page==='emp-docs'){buildEmpDocs();}
  else if(page==='emp-progress'){buildEmpProgress();}
  else if(page==='it-queue'){buildITQueue();}
  else if(page==='it-active'){buildITActive();}
  else if(page==='it-done'){buildITDone();}
  else if(page==='admin-tasks'){buildAdminTasks();}
  else if(page==='admin-desk'){buildAdminDesk();}
  else if(page==='admin-id'){buildAdminID();}
}

// ═══════════════════════════════════════════
// SVG ICONS (inline, brand-compliant)
// ═══════════════════════════════════════════
const ICONS = {
  dashboard: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="7" height="7" rx="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5"/></svg>`,
  cases: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="6" r="3"/><path d="M2 17c0-3.314 2.686-5 6-5"/><circle cx="14" cy="12" r="1.5"/><path d="M14 10v2l1.5 1.5"/><circle cx="14" cy="12" r="4.5"/></svg>`,
  preonboard: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="12" height="16" rx="2"/><path d="M7 7h6M7 10h6M7 13h4"/></svg>`,
  exceptions: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2L2 16h16L10 2z"/><path d="M10 8v4M10 14v.5"/></svg>`,
  post: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4.5 4.5L16 6"/></svg>`,
  audit: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="5.5"/><path d="M13 13l3.5 3.5"/></svg>`,
  reports: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14l4-4 3 3 5-6"/><rect x="2" y="2" width="16" height="16" rx="2"/></svg>`,
  approvals: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4 4 8-8"/><rect x="2" y="2" width="16" height="16" rx="2"/></svg>`,
  sla: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8"/><path d="M10 5v5l3 3"/></svg>`,
  portal: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3.314 2.686-5 6-5s6 1.686 6 5"/></svg>`,
  docs: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M12 2v5h5M7 10h6M7 13h4"/></svg>`,
  progress: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l4-5 4 3 3-4 3 2"/></svg>`,
  queue: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="16" height="3" rx="1"/><rect x="2" y="8.5" width="16" height="3" rx="1"/><rect x="2" y="14" width="10" height="3" rx="1"/></svg>`,
  active: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="3"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"/></svg>`,
  done: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l5 5 9-9"/></svg>`,
  tasks: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H5a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-4"/><path d="M9 11l3 3 6-6"/></svg>`,
  desk: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="16" height="8" rx="1.5"/><path d="M6 14v3M14 14v3M2 10h16"/></svg>`,
  idcard: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="16" height="10" rx="2"/><circle cx="7" cy="10" r="2"/><path d="M11 9h4M11 12h3"/></svg>`,
};

const ICON_MAP = {
  'overview':'dashboard','cases':'cases','preonboard':'preonboard',
  'exceptions':'exceptions','post':'post','audit':'audit','reports':'reports',
  'ops-dashboard':'dashboard','hil-approvals':'approvals','sla':'sla',
  'emp-portal':'portal','emp-docs':'docs','emp-progress':'progress',
  'it-queue':'queue','it-active':'active','it-done':'done',
  'admin-tasks':'tasks','admin-desk':'desk','admin-id':'idcard',
};

// ═══════════════════════════════════════════
// TASKBAR BUILD
// ═══════════════════════════════════════════
function buildTaskbar(roleTitle){
  const cfg=ROLE_CONFIG[roleTitle];
  if(!cfg) return;
  const tbNav=document.getElementById('tb-nav');
  const badgeColors={
    orange:'#E4902E',red:'#DC2626',pink:'#CF008B',purple:'#5929d0'
  };
  tbNav.innerHTML=cfg.nav.map((item,i)=>{
    const iconKey=ICON_MAP[item.page]||'dashboard';
    const svg=ICONS[iconKey]||ICONS.dashboard;
    const bc=item.badgeColor?badgeColors[item.badgeColor]||'#E4902E':'#E4902E';
    const bdg=item.badge?`<div class="tb-badge" style="background:${bc}">${item.badge}</div>`:'';
    // First item gets active class — no inline color (let CSS handle it)
    return`<div class="tb-icon${i===0?' active':''}" data-page="${item.page}" data-tip="${item.label}" onclick="nav('${item.page}',null)">
      ${bdg}${svg}
    </div>`;
  }).join('');
  // Update brand tooltip to reflect current state
  updateBrandTooltip();
}

function updateBrandTooltip(){
  const start=document.querySelector('.tb-start');
  if(!start) return;
  const roleName=document.getElementById('win-role-name');
  const role=roleName?roleName.textContent:'';
  start.setAttribute('data-tip', isMinimized ? 'Click to restore aegis.ai' : `aegis.ai · ${role}`);
}

// ═══════════════════════════════════════════
// WINDOW STATE — Windows taskbar behavior
// ═══════════════════════════════════════════
let isMinimized = false;
let isMaximized = false;
const win = () => document.querySelector('.app-window');
const viewport = () => document.querySelector('.desktop-viewport');

function updateBrandIndicator(){
  const start = document.querySelector('.tb-start');
  let dot = document.getElementById('brand-open-dot');
  if(!dot){
    dot = document.createElement('div');
    dot.id = 'brand-open-dot';
    dot.style.cssText = 'position:absolute;bottom:5px;left:50%;transform:translateX(-50%);width:5px;height:5px;border-radius:50%;background:var(--primary);transition:opacity .2s,background .2s';
    if(start) start.appendChild(dot);
  }
  dot.style.background = isMinimized ? '#9B8EDE' : 'var(--primary)';
  dot.style.opacity = '1';
}

function updateTaskbarIconsState(){
  // When window is minimized, show all taskbar icons as dimmed but STILL clickable
  const tbIcons = document.querySelectorAll('.tb-icon');
  tbIcons.forEach(icon => {
    if(isMinimized){
      icon.style.opacity = '0.6';
      // Add small "running but hidden" dot under active icon
    } else {
      icon.style.opacity = '1';
    }
  });
}

function winClose(){
  const w = win();
  w.style.transition = 'opacity .2s ease, transform .22s ease';
  w.style.opacity = '0';
  w.style.transform = 'scale(.97) translateY(8px)';
  w.style.pointerEvents = 'none';
  isMinimized = true;
  updateBrandIndicator();
  updateTaskbarIconsState();
  if(typeof updateBrandTooltip==='function') updateBrandTooltip();
}

function winRestore(){
  const w = win();
  // Remove any leftover closed message
  const msg = document.getElementById('win-closed-msg');
  if(msg) msg.remove();

  w.style.transition = 'opacity .22s ease, transform .28s cubic-bezier(.34,1.4,.64,1)';
  w.style.opacity = '1';
  w.style.transform = isMaximized ? 'none' : 'scale(1) translateY(0)';
  w.style.pointerEvents = 'auto';
  isMinimized = false;

  updateBrandIndicator();
  updateTaskbarIconsState();
  if(typeof updateBrandTooltip==='function') updateBrandTooltip();
}

function winMinimize(){
  if(isMinimized){
    winRestore();
  } else {
    const w = win();
    w.style.transition = 'opacity .18s ease, transform .22s cubic-bezier(.4,0,1,1)';
    w.style.transformOrigin = 'bottom center';
    w.style.opacity = '0';
    w.style.transform = 'translateY(36px) scaleY(.92)';
    w.style.pointerEvents = 'none';
    isMinimized = true;
    updateBrandIndicator();
    updateTaskbarIconsState();
    if(typeof updateBrandTooltip==='function') updateBrandTooltip();
  }
}

function winMaximize(){
  const w = win();
  if(isMaximized){
    w.style.transition = 'all .22s cubic-bezier(.34,1.2,.64,1)';
    w.style.inset = '12px 12px 0 12px';
    w.style.borderRadius = 'var(--r-lg) var(--r-lg) 0 0';
    isMaximized = false;
    document.querySelector('.win-dot.max .dot-sym').textContent = '+';
  } else {
    w.style.transition = 'all .22s cubic-bezier(.34,1.2,.64,1)';
    w.style.inset = '0';
    w.style.borderRadius = '0';
    isMaximized = true;
    document.querySelector('.win-dot.max .dot-sym').textContent = '⊡';
  }
}

// Brand icon click: Windows Start-button behavior
// — if minimized → restore to last active page
// — if visible → minimize
document.querySelector('.tb-start').addEventListener('click', ()=>{
  if(isMinimized){
    winRestore();
    // Re-navigate to the page that was active when minimized
    if(currentPage){
      document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
      const pg = document.getElementById('p-'+currentPage);
      if(pg) pg.classList.add('active');
      const meta = PAGE_META[currentPage]||{title:currentPage,crumb:''};
      const ct=document.getElementById('ctx-title');
      if(ct) ct.textContent = meta.title;
      document.querySelectorAll('.tb-icon').forEach(i=>i.classList.remove('active'));
      const ai = document.querySelector(`.tb-icon[data-page="${currentPage}"]`);
      if(ai) ai.classList.add('active');
    }
  } else {
    winMinimize();
  }
});

// Set initial brand indicator
setTimeout(updateBrandIndicator, 100);

// ═══════════════════════════════════════════
// ROLE SWITCHER
// ═══════════════════════════════════════════
function toggleRoleMenu(){
  document.getElementById('role-dropdown').classList.toggle('open');
  // Close LC panel if open
  document.getElementById('lc-panel').classList.remove('open');
}
function setRole(roleTitle, color, initials, fullName, el){
  currentRole=roleTitle;
  // Update titlebar pill
  document.getElementById('win-role-av').style.background=color;
  document.getElementById('win-role-av').textContent=initials;
  document.getElementById('win-role-name').textContent=roleTitle;
  // Update profile button
  const pb=document.getElementById('tb-profile');
  pb.style.background=color;
  pb.textContent=initials;
  pb.setAttribute('data-tip','Role: '+roleTitle);
  // Mark selected
  document.querySelectorAll('.role-dd-item').forEach(i=>i.classList.remove('selected'));
  el.classList.add('selected');
  // Close dropdown
  document.getElementById('role-dropdown').classList.remove('open');
  // Restore window if minimised
  if(isMinimized) winRestore();
  // Rebuild taskbar nav
  buildTaskbar(roleTitle);
  updateBrandTooltip();
  // Navigate to default page
  const cfg=ROLE_CONFIG[roleTitle];
  if(cfg) nav(cfg.defaultPage,null);
}

// ═══════════════════════════════════════════
// LIVE COMMENTARY TOGGLE
// ═══════════════════════════════════════════
function toggleLC(){
  document.getElementById('lc-panel').classList.toggle('open');
  document.getElementById('role-dropdown').classList.remove('open');
  const isOpen = document.getElementById('lc-panel').classList.contains('open');
  // Focus management handled after window.toggleLC patch runs
}

// Close panels on outside click
document.addEventListener('click',e=>{
  const lc=document.getElementById('lc-panel');
  const lcBtn=document.querySelector('.tb-live-btn');
  const rd=document.getElementById('role-dropdown');
  const pb=document.getElementById('tb-profile');
  if(lc && lcBtn && !lc.contains(e.target)&&!lcBtn.contains(e.target)){
    if(lc.classList.contains('open')){
      lc.classList.remove('open');
      setWindowFocus(true);
    }
  }
  if(rd && pb && !rd.contains(e.target)&&!pb.contains(e.target)) rd.classList.remove('open');
});

// ═══════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════
function closeModal(){document.getElementById('modal').classList.remove('open')}
document.getElementById('modal').addEventListener('click',e=>{if(e.target===document.getElementById('modal'))closeModal()});

function openCase(id){
  const e=EMP.find(x=>x.id===id);if(!e)return;
  document.getElementById('modal').classList.add('open');
  document.getElementById('m-title').textContent=e.name+' — Case Detail';
  document.getElementById('m-sub').textContent=e.id+' · '+e.phase+' · '+e.role;
  document.getElementById('m-ic').textContent='📁';
  document.getElementById('m-body').innerHTML=`
    <div class="g2" style="margin-bottom:14px">
      <div style="background:var(--n8);border-radius:var(--r-md);padding:14px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--n4);margin-bottom:10px">Summary</div>
        ${['Employee ID','Department','Joining Date','IT Status','Documents'].map((k,i)=>{
          const v=[e.id,e.dept,e.join,e.it,e.docs][i];
          return`<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid var(--n7)"><span style="color:var(--n4)">${k}</span><span style="font-weight:600">${v}</span></div>`;
        }).join('')}
      </div>
      <div style="background:var(--n8);border-radius:var(--r-md);padding:14px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--n4);margin-bottom:10px">Progress</div>
        ${prog(e.prog,e.st)}
        <div style="margin-top:10px">${badge(e.st)}</div>
      </div>
    </div>
    <div class="f-section">Recent Audit Events</div>
    ${AUDIT.filter(a=>a.emp.startsWith(e.name.split(' ')[0])).map(a=>`
      <div class="ma-item"><div class="ma-time">${a.ts}</div><span class="al-dot ${a.dot||'p'}"></span><div class="ma-text">${a.ev} <span style="color:var(--n5)">[${a.rule}]</span> — ${a.out}</div></div>
    `).join('')||'<div style="text-align:center;padding:16px;color:var(--n4);font-size:12px">No audit events yet.</div>'}`;
  document.getElementById('m-footer').innerHTML=`<button class="btn btn-ghost" onclick="closeModal()">Close</button>`;
}

// ═══════════════════════════════════════════
// WIZARD (read-only — backend-populated)
// ═══════════════════════════════════════════
let wStep=1;
const W_LABELS=['Candidate Details','Pre-Onboarding','Documents','HIL Gate','Provisioning','Complete'];
function openWizard(){wStep=1;document.getElementById('modal').classList.add('open');drawWizard()}
function wNext(){if(wStep<W_LABELS.length){wStep++;drawWizard()}}
function wPrev(){if(wStep>1){wStep--;drawWizard()}}

function wDots(){
  return W_LABELS.map((l,i)=>`
    <div class="wz-step">
      <div class="wz-dot ${i+1<wStep?'done':i+1===wStep?'active':''}">${i+1<wStep?'✓':i+1}</div>
      <div class="wz-label ${i+1===wStep?'active':''}">${l}</div>
    </div>`).join('');
}

function drawWizard(){
  document.getElementById('m-title').textContent='Onboarding Wizard — System Managed';
  document.getElementById('m-sub').textContent=`Step ${wStep} of ${W_LABELS.length} — ${W_LABELS[wStep-1]}`;
  document.getElementById('m-ic').textContent='🤖';
  let body=`<div class="wz-steps">${wDots()}</div>`;

  const sysNote=`<div style="background:var(--primary-light);border:1px solid var(--primary-border);border-radius:var(--r-md);padding:10px 12px;margin-bottom:14px;font-size:11px;color:var(--primary)">🤖 <strong>System-managed:</strong> Fields below are populated by the backend agent. No manual input required.</div>`;

  if(wStep===1){
    body+=sysNote+`<div class="form-grid">
      <div class="fg"><div class="field-label">First Name</div><div class="field-sys">Sarah</div></div>
      <div class="fg"><div class="field-label">Last Name</div><div class="field-sys">Mitchell</div></div>
      <div class="fg"><div class="field-label">Role</div><div class="field-sys">Product Manager</div></div>
      <div class="fg"><div class="field-label">Department</div><div class="field-sys">Product</div></div>
      <div class="fg"><div class="field-label">Manager</div><div class="field-sys">Raghava Kumar</div></div>
      <div class="fg"><div class="field-label">Joining Date</div><div class="field-sys">2026-05-15</div></div>
      <div class="fg"><div class="field-label">Personal Email</div><div class="field-sys">sarah.mitchell@gmail.com</div></div>
      <div class="fg"><div class="field-label">Employee Type</div><div class="field-sys">New Hire</div></div>
    </div>`;
  } else if(wStep===2){
    body+=`<div class="hil-box blue"><div class="hil-title" style="color:var(--primary)">🤖 Agent Auto-Trigger — BR-001</div><div class="hil-desc">Agent will automatically send IT provisioning requests, notify Admin for desk allocation, and schedule candidate follow-up reminders.</div></div>
    ${sysNote}
    <div class="form-grid">
      <div class="fg"><div class="field-label">Hardware Tier</div><div class="field-sys">Standard (M3)</div></div>
      <div class="fg"><div class="field-label">Office Location</div><div class="field-sys">Bangalore HQ</div></div>
      <div class="fg"><div class="field-label">IT Request SLA</div><div class="field-sys">Standard (5 days)</div></div>
      <div class="fg"><div class="field-label">Follow-up Channels</div><div class="field-sys">Email + Phone</div></div>
    </div>
    <div style="margin-top:12px">
      <div class="vl pass">✓ IT provisioning request will be sent on save</div>
      <div class="vl pass">✓ Admin team will be notified for desk & ID card</div>
      <div class="vl wait">⏳ Follow-ups scheduled: 8 May · 12 May · 15 May</div>
    </div>`;
  } else if(wStep===3){
    body+=`<div class="f-section">Identity Documents</div>
    <div class="form-grid" style="margin-bottom:12px">
      <div class="fg"><div class="field-label">Document Type</div><div class="field-sys">Passport</div></div>
      <div class="fg"><div class="field-label">Document Number</div><div class="field-sys">P9920134</div></div>
      <div class="fg"><div class="field-label">Country of Issue</div><div class="field-sys">India</div></div>
      <div class="fg"><div class="field-label">Expiry Date</div><div class="field-sys">2031-03-20</div></div>
    </div>
    <div class="f-section">Document Status</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
      <div class="upload-field uploaded"><div class="upload-ic">📄</div><div><div class="upload-label">Passport / ID Document</div><div class="upload-hint">passport_scan_sarah.pdf</div></div><div class="upload-status ok">✓ Uploaded</div></div>
      <div class="upload-field uploaded"><div class="upload-ic">📝</div><div><div class="upload-label">Employment Agreement</div><div class="upload-hint">Agreement_Sarah_2026.pdf</div></div><div class="upload-status ok">✓ Uploaded</div></div>
      <div class="upload-field"><div class="upload-ic">📋</div><div><div class="upload-label">Tax Declaration (Form 12BB)</div><div class="upload-hint">Awaiting employee submission</div></div><div class="upload-status wait">⏳ Pending</div></div>
      <div class="upload-field"><div class="upload-ic">🏠</div><div><div class="upload-label">Address Proof</div><div class="upload-hint">Awaiting employee submission</div></div><div class="upload-status wait">⏳ Pending</div></div>
    </div>
    <div class="f-section">Validation</div>
    <div class="vl pass">✓ Passport P9920134 — format valid · expiry 5+ years</div>
    <div class="vl pass">✓ Employment agreement — signature detected</div>
    <div class="vl wait">⏳ Tax form not yet submitted</div>
    <div class="vl wait">⏳ Address proof not yet submitted</div>`;
  } else if(wStep===4){
    body+=`<div class="hil-box red"><div class="hil-title" style="color:var(--error)">⛔ HIL Gate 1 — Doc & Background Verification</div><div class="hil-desc">Automated validation passed. Background check complete. HR Coordinator review required before provisioning begins.</div></div>
    <div style="margin-bottom:14px">
      <div class="vl pass">✓ Document validation: all checks passed</div>
      <div class="vl pass">✓ Background check: cleared</div>
      <div class="vl pass">✓ Employment agreement: verified</div>
    </div>
    <div class="form-grid full">
      <div class="fg"><div class="field-label">HR Coordinator Decision</div><div class="field-sys">Awaiting system review</div></div>
      <div class="fg"><div class="field-label">Decision Notes</div><div class="field-sys">—</div></div>
    </div>`;
  } else if(wStep===5){
    body+=`<div class="hil-box green"><div class="hil-title" style="color:var(--success)">✅ HIL 1 Approved — Provisioning Initiated</div><div class="hil-desc" style="color:#166534">HR sign-off recorded. Agent creating HRMS record, provisioning email, and configuring statutory components.</div></div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
      ${psEl('HRMS Record Created','EMP-2026-00849 generated','g')}
      ${psEl('Corporate Email Provisioned','sarah.mitchell@centific.com','g')}
      ${psEl('System Access — Identity Mgmt','Provisioning in progress…','o')}
      ${psEl('Payroll — Bank Account Capture','Awaiting employee submission','o')}
      ${psEl('PF Configuration','India · Grade M3 · 12% rate','o')}
      ${psEl('Organisational Assignment','Product team · Raghava Kumar','g')}
    </div>`;
  } else if(wStep===6){
    body=`<div class="completion">
      <div class="comp-icon">🎉</div>
      <div class="comp-title">Onboarding Initiated!</div>
      <div class="comp-sub">Sarah Mitchell has been added. The agent will now manage all follow-up tasks automatically.</div>
      <div class="comp-detail">
        <div class="comp-row"><span>Employee ID</span><span>EMP-2026-00849</span></div>
        <div class="comp-row"><span>Corporate Email</span><span>sarah.mitchell@centific.com</span></div>
        <div class="comp-row"><span>Joining Date</span><span>15 May 2026</span></div>
        <div class="comp-row"><span>Phase</span><span>Pre-Onboarding Active</span></div>
        <div class="comp-row"><span>Next Agent Action</span><span>Follow-up reminder — 8 May</span></div>
      </div>
      <div style="display:flex;gap:8px;justify-content:center">
        <button class="btn btn-primary" onclick="closeModal();nav('cases',null)">View in Cases →</button>
        <button class="btn btn-ghost" onclick="closeModal();nav('audit',null)">View Audit Log</button>
      </div>
    </div>`;
  }

  document.getElementById('m-body').innerHTML=body;
  document.getElementById('m-footer').innerHTML=wStep<6?`
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    ${wStep>1?'<button class="btn btn-ghost" onclick="wPrev()">← Back</button>':''}
    <button class="btn btn-primary" onclick="wNext()">${wStep===5?'Complete ✓':'Continue →'}</button>
  `:'';
}

function psEl(label,meta,state){
  const bg=state==='g'?'var(--success-light)':'var(--warning-light)';
  const sc=state==='g'?'var(--success)':'var(--warning)';
  const st=state==='g'?'Done':'In Progress';
  const ico=state==='g'?'✅':'⏳';
  return`<div class="ps" style="background:${bg}"><span class="ps-icon">${ico}</span><div class="ps-info"><div class="ps-label">${label}</div><div class="ps-meta">${meta}</div></div><div class="ps-status" style="color:${sc}">${st}</div></div>`;
}

// ═══════════════════════════════════════════
// RENDER FUNCTIONS
// ═══════════════════════════════════════════
function renderOvCases(){
  const el=document.getElementById('ov-cases');if(!el)return;
  const phaseMap={'pre':'Pre-Onboarding','onb':'Onboarding','post':'Post-Onboarding'};
  const phaseTag={'Pre-Onboarding':'purple','Onboarding':'pink','Post-Onboarding':'green'};
  const filtered=currentFilter==='all'?EMP:EMP.filter(e=>e.phase===phaseMap[currentFilter]);
  // Render as compact rows with inline progress — no scroll table
  el.innerHTML=filtered.map(e=>{
    const c=e.st==='completed'?'var(--success)':e.st==='at-risk'||e.st==='blocked'?'var(--warning)':'var(--primary)';
    return`<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid var(--n8);cursor:pointer;transition:background .08s" onmouseover="this.style.background='rgba(89,41,208,.03)'" onmouseout="this.style.background=''" onclick="openCase('${e.id}')">
      <div class="emp-av" style="background:${e.col};width:28px;height:28px;font-size:9px;flex-shrink:0">${e.ini}</div>
      <div style="min-width:0;flex:1.4">
        <div class="emp-name" style="font-size:11.5px">${e.name}</div>
        <div style="font-size:9.5px;color:var(--n5)">${e.role}</div>
      </div>
      <span class="tag ${phaseTag[e.phase]||'purple'}" style="font-size:9px;flex-shrink:0">${e.phase}</span>
      <div style="flex-shrink:0">${badge(e.st)}</div>
      <div style="flex-shrink:0">${days(e.join)}</div>
      <div style="min-width:80px;flex-shrink:0">
        <div style="height:4px;background:var(--n7);border-radius:2px;overflow:hidden;margin-bottom:2px">
          <div style="height:100%;width:${e.prog}%;background:${c};border-radius:2px;transition:width .4s ease"></div>
        </div>
        <div style="font-size:9.5px;color:var(--n5)">${e.prog}%</div>
      </div>
    </div>`;
  }).join('');
}

function tabFilter(el,filter){
  document.querySelectorAll('#overview-tabs .tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  currentFilter=filter;
  renderOvCases();
}

function renderAllCases(){
  const el=document.getElementById('all-cases');if(!el)return;
  const phaseColors={'Pre-Onboarding':'#5929d0','Onboarding':'#CF008B','Post-Onboarding':'#16A34A'};
  el.innerHTML=EMP.map(e=>{
    const pc=phaseColors[e.phase]||'#5929d0';
    const bc=e.st==='completed'?'var(--success)':e.st==='at-risk'||e.st==='blocked'?'var(--warning)':'var(--primary)';
    return`<div style="display:grid;grid-template-columns:1.8fr 1fr 1fr 1fr 90px 80px 80px;align-items:center;gap:0;padding:9px 14px;border-bottom:1px solid var(--n8);cursor:pointer;transition:background .08s" onmouseover="this.style.background='rgba(89,41,208,.03)'" onmouseout="this.style.background=''" onclick="openCase('${e.id}')">
      <div class="emp">
        <div class="emp-av" style="background:${e.col};flex-shrink:0">${e.ini}</div>
        <div style="min-width:0"><div class="emp-name">${e.name}</div><div class="emp-role" style="font-size:9.5px;color:var(--n5)">${e.dept} · ${e.id}</div></div>
      </div>
      <div><span style="font-size:9.5px;font-weight:600;color:${pc};background:${pc}18;padding:2px 7px;border-radius:999px">${e.phase}</span></div>
      <div>${badge(e.st)}</div>
      <div>${days(e.join)}</div>
      <div>
        <div style="height:4px;background:var(--n7);border-radius:2px;overflow:hidden;margin-bottom:2px;width:70px">
          <div style="height:100%;width:${e.prog}%;background:${bc};border-radius:2px"></div>
        </div>
        <div style="font-size:9.5px;color:var(--n5)">${e.prog}%</div>
      </div>
      <div style="font-size:11px;color:var(--n3)">${e.it}</div>
      <div style="font-size:11px;color:var(--n3)">${e.docs}</div>
    </div>`;
  }).join('');
}

function renderMiniAudit(){
  const el=document.getElementById('ov-audit');if(!el)return;
  el.innerHTML=AUDIT.slice(0,5).map(a=>`<div class="ma-item">
    <div class="ma-time">${a.ts}</div>
    <span class="al-dot ${a.dot||'p'}"></span>
    <div class="ma-text"><strong>${a.emp}</strong> · ${a.ev} <span style="color:var(--n5)">[${a.rule}]</span></div>
  </div>`).join('');
}

function renderAuditRows(){
  const el=document.getElementById('audit-rows');if(!el)return;
  const dotColor={p:'var(--primary)',g:'var(--success)',o:'var(--warning)',pk:'var(--pink)'};
  el.innerHTML=AUDIT.map(a=>`
    <div style="display:flex;gap:10px;padding:9px 16px;border-bottom:1px solid var(--n8);align-items:flex-start">
      <div style="font-size:9.5px;color:var(--n5);min-width:46px;padding-top:1px;font-variant-numeric:tabular-nums">${a.ts}</div>
      <div style="width:8px;height:8px;border-radius:50%;background:${dotColor[a.dot||'p']};flex-shrink:0;margin-top:3px"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11.5px;font-weight:600;color:var(--n0)">${a.emp}</div>
        <div style="font-size:11px;color:var(--n2);margin-top:1px">${a.ev}</div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <span style="font-size:9.5px;background:var(--primary-light);color:var(--primary);border-radius:999px;padding:1px 7px;font-weight:600">${a.case}</span>
          <span style="font-size:9.5px;color:var(--n5)">${a.phase} · ${a.rule}</span>
        </div>
      </div>
      <div style="font-size:10.5px;color:var(--n4);flex-shrink:0;text-align:right;max-width:110px">${a.out}</div>
    </div>`).join('');
}

function renderExceptions(){
  const el=document.getElementById('exc-list');if(!el)return;
  el.innerHTML=EXC.map(e=>`<div class="exc">
    <div class="exc-head">
      <span class="exc-tag ${e.tc}">${e.tag}</span>
      ${e.hil?'<span class="exc-tag hil">HIL Required</span>':''}
      <span class="exc-emp">${e.emp}</span>
    </div>
    <div class="exc-type">${e.type}</div>
    <div class="exc-desc">${e.desc}</div>
    <div class="exc-actions">
      <button class="btn-sys btn-sm">Review & Resolve</button>
      <button class="btn-sys btn-sm">Escalate</button>
      <button class="btn-sys btn-sm">Log Decision</button>
    </div>
  </div>`).join('');
}

function renderTaskPanel(){
  const el=document.getElementById('task-panel');if(!el)return;
  const ti=(n,task,meta,st)=>`<div class="task-item"><div class="task-item-name">${n}</div><div class="task-item-meta">${task} · ${meta}</div><div class="task-item-st">${badge(st)}</div></div>`;
  el.innerHTML=`
    <div class="task-col"><div class="task-col-label">IT Provisioning</div>
      ${ti('Aryan Mehta','Laptop Setup','Due 25 Apr','hil')}
      ${ti('Priya Kapoor','Email ID','Due 26 Apr','in-progress')}
      ${ti('Rohit Sharma','System Access','Due 3 May','in-progress')}
      ${ti('Aisha Patel','Laptop + Access','Not started','blocked')}
    </div>
    <div class="task-col"><div class="task-col-label">Admin Preparation</div>
      ${ti('Aryan Mehta','Desk Allocation','Done ✓','completed')}
      ${ti('Priya Kapoor','ID Card Ready','Due 27 Apr','in-progress')}
      ${ti('Rohit Sharma','Desk Allocation','Due 3 May','in-progress')}
      ${ti('Aisha Patel','Access Card','Not started','blocked')}
    </div>
    <div class="task-col"><div class="task-col-label">Candidate Follow-ups</div>
      ${ti('Aryan Mehta','7-day reminder','Responded ✓','completed')}
      ${ti('Priya Kapoor','3-day reminder','Scheduled 25 Apr','in-progress')}
      ${ti('Rohit Sharma','7-day reminder','Due 28 Apr','hil')}
      ${ti('Aisha Patel','Initial contact','No response','at-risk')}
    </div>`;
}

function renderPost(){
  const tb=document.getElementById('post-table');
  const bl=document.getElementById('buddy-list');
  const postEmp=[
    {ini:'WC',col:'#0E2E89',name:'Wei Chen',joining:'✅',pf:'✅',welcome:'✅',buddy:'✅',st:'completed'},
    {ini:'FN',col:'#16A34A',name:'Fatima Noor',joining:'✅',pf:'⏳',welcome:'✅',buddy:'✅',st:'at-risk'},
    {ini:'AM',col:'#5929d0',name:'Aryan Mehta',joining:'⏳',pf:'—',welcome:'—',buddy:'—',st:'in-progress'},
  ];
  if(tb){
    // Replace table with visual checklist rows
    tb.outerHTML='<div id="post-table"></div>';
    const newEl=document.getElementById('post-table');
    if(newEl)newEl.innerHTML=postEmp.map(e=>`
      <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--n8)">
        <div class="emp-av" style="background:${e.col};width:28px;height:28px;font-size:9px;flex-shrink:0">${e.ini}</div>
        <div style="font-size:12px;font-weight:600;color:var(--n0);min-width:90px">${e.name}</div>
        <div style="flex:1;display:flex;gap:0;align-items:center">
          ${[['Joining',e.joining],['PF Form',e.pf],['Welcome',e.welcome],['Buddy',e.buddy]].map(([label,val],i,arr)=>{
            const done=val==='✅';const pending=val==='⏳';
            const clr=done?'var(--success)':pending?'var(--warning)':'var(--n6)';
            const bg=done?'var(--success-light)':pending?'var(--warning-light)':'var(--n8)';
            return`<div style="display:flex;align-items:center">
              <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
                <div style="width:22px;height:22px;border-radius:50%;background:${bg};border:2px solid ${clr};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:${clr}">${done?'✓':pending?'~':''}</div>
                <div style="font-size:8.5px;color:var(--n5);white-space:nowrap">${label}</div>
              </div>
              ${i<arr.length-1?`<div style="width:24px;height:2px;background:${done?'var(--success)':'var(--n7)'}"></div>`:''}
            </div>`;
          }).join('')}
        </div>
        <div>${badge(e.st)}</div>
      </div>`).join('');
  }
  const blEl=document.getElementById('buddy-list');
  if(blEl)blEl.innerHTML=`
    <div class="buddy-item"><div class="emp"><div class="emp-av" style="background:#0E2E89">WC</div><div><div class="emp-name">Wei Chen</div><div class="emp-role">Buddy: Neha Singh · 2.5yr tenure · HR</div></div></div>${badge('completed')}</div>
    <div class="buddy-item"><div class="emp"><div class="emp-av" style="background:#16A34A">FN</div><div><div class="emp-name">Fatima Noor</div><div class="emp-role">Buddy: Pending assignment</div></div></div>${badge('in-progress')}</div>
    <div class="buddy-item"><div class="emp"><div class="emp-av" style="background:#5929d0">AM</div><div><div class="emp-name">Aryan Mehta</div><div class="emp-role">Buddy: Not yet assigned</div></div></div>${badge('blocked')}</div>`;
}

// ═══════════════════════════════════════════
// ROLE-SPECIFIC PAGE BUILDERS
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// REPORTS PAGE BUILDER
// ═══════════════════════════════════════════
function buildReports(){
  const el=document.getElementById('p-reports');if(!el)return;

  // R-01: SVG bar chart — lifecycle breakdown
  const bars=[['All','#5929d0',12,60],['Done','#16A34A',7,35],['Active','#CF008B',4,20],['Risk','#E4902E',1,5]];
  const barSvg=`<svg viewBox="0 0 220 76" style="width:100%;height:76px;display:block;margin-bottom:10px" xmlns="http://www.w3.org/2000/svg">
    ${bars.map(([l,c,n,h],i)=>`
    <g>
      <rect x="${i*56+4}" y="${62-h}" width="44" height="${h}" rx="4" fill="${c}" opacity=".85"/>
      <text x="${i*56+26}" y="${60-h}" text-anchor="middle" font-size="9" fill="#475569" font-family="Poppins,sans-serif" font-weight="700">${n}</text>
      <text x="${i*56+26}" y="74" text-anchor="middle" font-size="8" fill="#94A3B8" font-family="Poppins,sans-serif">${l}</text>
    </g>`).join('')}
  </svg>`;

  // R-02 & R-04: stat rows — minimal, no progress bars
  const statRow=(label,val,col)=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--n8)">
      <span style="font-size:11.5px;color:var(--n3)">${label}</span>
      <span style="font-size:13px;font-weight:700;color:${col}">${val}</span>
    </div>`;

  // R-03: SVG donut
  const circ=2*Math.PI*22;
  const passFrac=0.94;
  const passDash=(circ*passFrac).toFixed(1);
  const failDash=(circ*(1-passFrac)).toFixed(1);
  const donutSvg=`<svg viewBox="0 0 64 64" style="width:64px;height:64px;flex-shrink:0" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="22" fill="none" stroke="#F1F5F9" stroke-width="9"/>
    <circle cx="32" cy="32" r="22" fill="none" stroke="#16A34A" stroke-width="9"
      stroke-dasharray="${passDash} ${failDash}" stroke-linecap="round" transform="rotate(-90 32 32)"/>
    <circle cx="32" cy="32" r="22" fill="none" stroke="#DC2626" stroke-width="9"
      stroke-dasharray="${failDash} ${passDash}" stroke-linecap="round"
      stroke-dashoffset="-${passDash}" transform="rotate(-90 32 32)"/>
    <text x="32" y="36" text-anchor="middle" font-size="10" font-weight="700" fill="#0F172A" font-family="Poppins,sans-serif">94%</text>
  </svg>`;

  el.innerHTML=`<div class="g2">
    <div class="rep-card">
      <div class="rep-title">Onboarding Lifecycle Summary (R-01)</div>
      <div class="rep-desc">Cases by phase · Completion rate · SLA compliance · Weekly</div>
      ${barSvg}
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        ${bars.map(([l,c,n])=>`<div style="display:flex;align-items:center;gap:4px"><div style="width:7px;height:7px;border-radius:2px;background:${c}"></div><span style="font-size:9.5px;color:var(--n4)">${l} <strong style="color:var(--n1)">${n}</strong></span></div>`).join('')}
      </div>
      <button class="btn-sys" style="width:100%;text-align:center">Download Report →</button>
    </div>

    <div class="rep-card">
      <div class="rep-title">Pre-Onboarding Readiness (R-02)</div>
      <div class="rep-desc">IT tasks · Admin prep · Follow-up response</div>
      ${statRow('IT Tasks Completed','8 / 12','var(--primary)')}
      ${statRow('Admin Tasks Done','10 / 12','var(--success)')}
      ${statRow('Follow-up Response','9 / 12','var(--warning)')}
      ${statRow('Avg Lead Time','4.2 days','var(--n2)')}
      <div style="height:12px"></div>
      <button class="btn-sys" style="width:100%;text-align:center">Download Report →</button>
    </div>

    <div class="rep-card">
      <div class="rep-title">Document Validation Report (R-03)</div>
      <div class="rep-desc">Submission failures · Resolution time · Recurring patterns</div>
      <div style="display:flex;align-items:center;gap:18px;margin-bottom:14px">
        ${donutSvg}
        <div>
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">
            <div style="width:9px;height:9px;border-radius:2px;background:var(--success)"></div>
            <span style="font-size:12px;color:var(--n2)">Pass Rate <strong style="color:var(--success)">94%</strong></span>
          </div>
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">
            <div style="width:9px;height:9px;border-radius:2px;background:var(--error)"></div>
            <span style="font-size:12px;color:var(--n2)">Exceptions <strong style="color:var(--error)">6%</strong></span>
          </div>
          <div style="font-size:10px;color:var(--n5)">Top failure: Missing PAN field (3 cases)</div>
        </div>
      </div>
      <button class="btn-sys" style="width:100%;text-align:center">Download Report →</button>
    </div>

    <div class="rep-card">
      <div class="rep-title">Post-Onboarding Completion (R-04)</div>
      <div class="rep-desc">Joining formalities · PF · Buddy · Welcome</div>
      ${statRow('Joining Formalities','100%','var(--success)')}
      ${statRow('Buddy Assignment','83%','var(--primary)')}
      ${statRow('PF Submission','67%','var(--warning)')}
      ${statRow('Welcome Email Sent','100%','var(--success)')}
      <div style="height:12px"></div>
      <button class="btn-sys" style="width:100%;text-align:center">Download Report →</button>
    </div>
  </div>`;
}

function buildOpsManagerDashboard(){
  const el=document.getElementById('p-ops-dashboard');if(!el)return;
  el.innerHTML=`
    <div class="kpi-grid g4" style="margin-bottom:14px">
      <div class="kpi blue"><div class="kpi-label">Total Cases</div><div class="kpi-value">12</div><div class="kpi-meta"><span class="kpi-up">↑ 3</span> from last week</div></div>
      <div class="kpi green"><div class="kpi-label">Completion Rate</div><div class="kpi-value">87%</div><div class="kpi-meta"><span class="kpi-up">↑ 4%</span> vs cohort</div></div>
      <div class="kpi orange"><div class="kpi-label">SLA Breaches</div><div class="kpi-value">2</div><div class="kpi-meta"><span class="kpi-warn">⚠ Action needed</span></div></div>
      <div class="kpi red"><div class="kpi-label">Pending Approvals</div><div class="kpi-value">2</div><div class="kpi-meta">HIL Gate 4</div></div>
    </div>
    <div class="g2">
      <div class="card">
        <div class="card-head"><div class="card-title">Pipeline Health</div><span class="tag green">87% on track</span></div>
        <div class="card-body" style="display:flex;align-items:center;gap:16px">
          <!-- SVG Donut chart -->
          <svg viewBox="0 0 80 80" style="width:80px;height:80px;flex-shrink:0" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#F1F5F9" stroke-width="10"/>
            <!-- Completed 58% = 201deg stroke-dasharray = 201 out of 201 total circumference=201.06 -->
            <circle cx="40" cy="40" r="32" fill="none" stroke="#16A34A" stroke-width="10" stroke-dasharray="116.6 83.5" stroke-linecap="round" stroke-dashoffset="50" transform="rotate(-90 40 40)"/>
            <circle cx="40" cy="40" r="32" fill="none" stroke="#5929d0" stroke-width="10" stroke-dasharray="66.4 133.7" stroke-linecap="round" stroke-dashoffset="-66.6" transform="rotate(-90 40 40)"/>
            <circle cx="40" cy="40" r="32" fill="none" stroke="#E4902E" stroke-width="10" stroke-dasharray="18.1 182" stroke-linecap="round" stroke-dashoffset="-133" transform="rotate(-90 40 40)"/>
            <text x="40" y="43" text-anchor="middle" font-size="11" font-weight="700" fill="#0F172A" font-family="Poppins,sans-serif">87%</text>
          </svg>
          <div style="flex:1">
            ${[['Completed','var(--success)','7','58%'],['In Progress','var(--primary)','4','33%'],['At Risk','var(--warning)','1','9%']].map(([l,c,n,p])=>`
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
              <div style="width:8px;height:8px;border-radius:50%;background:${c};flex-shrink:0"></div>
              <div style="font-size:11px;color:var(--n2);flex:1">${l}</div>
              <div style="font-size:11px;font-weight:700;color:var(--n0)">${n}</div>
              <div style="font-size:10px;color:var(--n5);min-width:28px;text-align:right">${p}</div>
            </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title">HIL Gate 4 — Pending</div><span class="tag pink">2 Pending</span></div>
        <div class="card-body">
          <div class="hil-row" style="background:var(--warning-light);border-left-color:var(--warning);margin-bottom:8px">
            <div class="hil-row-title" style="color:#92400E">Wei Chen — Final Approval</div>
            <div class="hil-row-desc" style="color:#78350F">All stages complete · Awaiting sign-off</div>
          </div>
          <div class="hil-row" style="background:var(--warning-light);border-left-color:var(--warning)">
            <div class="hil-row-title" style="color:#92400E">Fatima Noor — Final Approval</div>
            <div class="hil-row-desc" style="color:#78350F">PF form pending · 1 open item</div>
          </div>
          <div style="margin-top:10px">
            <button class="btn-sys btn-sm">Review Approvals →</button>
          </div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-title">SLA Compliance Overview</div></div>
      ${EMP.map(e=>`
      <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 80px;align-items:center;gap:0;padding:8px 14px;border-bottom:1px solid var(--n8)">
        <div class="emp"><div class="emp-av" style="background:${e.col}">${e.ini}</div><div><div class="emp-name">${e.name}</div><div class="emp-role">${e.role}</div></div></div>
        <span style="font-size:9.5px;font-weight:600;color:${e.phase==='Onboarding'?'#CF008B':e.phase==='Post-Onboarding'?'#16A34A':'#5929d0'};background:${e.phase==='Onboarding'?'#FFD6F4':e.phase==='Post-Onboarding'?'#DCFCE7':'#E8E5FF'};padding:2px 7px;border-radius:999px">${e.phase}</span>
        <div>${badge(e.st)}</div>
        <div>${days(e.join)}</div>
        <div>${e.st==='blocked'?'<span class="sla-breach">Breach</span>':e.st==='at-risk'?'<span class="sla-risk">At Risk</span>':'<span class="sla-ok">On Track</span>'}</div>
      </div>`).join('')}
    </div>`;
}

function buildHILApprovals(){
  const el=document.getElementById('p-hil-approvals');if(!el)return;
  el.innerHTML=`
    <div class="kpi-grid g2" style="margin-bottom:14px">
      <div class="kpi orange"><div class="kpi-label">Pending Approvals</div><div class="kpi-value">2</div><div class="kpi-meta">HIL Gate 4 — Final sign-off</div></div>
      <div class="kpi blue"><div class="kpi-label">Approved This Week</div><div class="kpi-value">5</div><div class="kpi-meta"><span class="kpi-up">All cleared on time</span></div></div>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-title">HIL Gate 4 — Final Approval Queue</div><span class="tag pink">HR Ops Manager Action Required</span></div>
      <div class="card-body">
        ${[{n:'Wei Chen',ini:'WC',col:'#0E2E89',r:'HR Business Partner',prog:95,note:'All stages complete. PF confirmed. Buddy assigned. Welcome email sent.'},
           {n:'Fatima Noor',ini:'FN',col:'#16A34A',r:'Compliance Analyst',prog:80,note:'PF form outstanding. All other activities complete.'}].map(e=>`
        <div style="border:1px solid var(--n7);border-radius:var(--r-md);padding:14px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div class="emp-av" style="background:${e.col};width:32px;height:32px;font-size:11px">${e.ini}</div>
            <div><div style="font-size:13px;font-weight:600">${e.n}</div><div style="font-size:10px;color:var(--n5)">${e.r}</div></div>
            <div style="margin-left:auto">${prog(e.prog,'in-progress')}</div>
          </div>
          <div style="font-size:11.5px;color:var(--n2);margin-bottom:10px;line-height:1.6">${e.note}</div>
          <div style="display:flex;gap:8px">
            <button class="btn-sys btn-sm">Approve</button>
            <button class="btn-sys btn-sm">Request More Info</button>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
}

function buildSLAMonitor(){
  const el=document.getElementById('p-sla');if(!el)return;
  el.innerHTML=`
    <div class="kpi-grid g3" style="margin-bottom:14px">
      <div class="kpi green"><div class="kpi-label">On Track</div><div class="kpi-value">9</div><div class="kpi-meta">Within SLA window</div></div>
      <div class="kpi orange"><div class="kpi-label">At Risk</div><div class="kpi-value">1</div><div class="kpi-meta">Within 24 hrs of breach</div></div>
      <div class="kpi red"><div class="kpi-label">Breached</div><div class="kpi-value">2</div><div class="kpi-meta">Escalation required</div></div>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-title">SLA Tracking — All Cases</div></div>
      ${EMP.map(e=>`
      <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 80px 80px;align-items:center;gap:0;padding:8px 14px;border-bottom:1px solid var(--n8)">
        <div class="emp"><div class="emp-av" style="background:${e.col}">${e.ini}</div><div><div class="emp-name">${e.name}</div></div></div>
        <span style="font-size:9.5px;font-weight:600;color:${e.phase==='Onboarding'?'#CF008B':e.phase==='Post-Onboarding'?'#16A34A':'#5929d0'};background:${e.phase==='Onboarding'?'#FFD6F4':e.phase==='Post-Onboarding'?'#DCFCE7':'#E8E5FF'};padding:2px 7px;border-radius:999px">${e.phase}</span>
        <div>${badge(e.st)}</div>
        <div>${days(e.join)}</div>
        <div style="font-size:10.5px;color:var(--n4)">${e.join}</div>
        <div>${e.st==='blocked'?'<span class="sla-breach">Breach</span>':e.st==='at-risk'?'<span class="sla-risk">At Risk</span>':'<span class="sla-ok">On Track</span>'}</div>
      </div>`).join('')}
    </div>`;
}

function buildEmployeePortal(){
  const el=document.getElementById('p-emp-portal');if(!el)return;
  el.innerHTML=`
    <div class="ov-hero">
      <div class="ov-hero-greeting">Welcome to aegis.ai</div>
      <div class="ov-hero-title">Hello, <span class="accent">Sarah Mitchell</span></div>
      <div class="ov-hero-sub">Joining date: 15 May 2026 · 21 days to go. Complete your pending documents to keep your onboarding on track.</div>
    </div>
    <div class="kpi-grid g3" style="margin-bottom:14px">
      <div class="kpi green"><div class="kpi-label">Completed</div><div class="kpi-value">3</div><div class="kpi-meta">of 8 tasks</div></div>
      <div class="kpi orange"><div class="kpi-label">Pending</div><div class="kpi-value">2</div><div class="kpi-meta">Documents required</div></div>
      <div class="kpi blue"><div class="kpi-label">Days to Joining</div><div class="kpi-value">21</div><div class="kpi-meta">15 May 2026</div></div>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-title">Onboarding Checklist</div></div>
      <div class="card-body">
        ${[
          {done:true,label:'Personal details submitted',meta:'Completed 20 Apr'},
          {done:true,label:'Passport uploaded & verified',meta:'P9920134 · Verified ✓'},
          {done:true,label:'Employment agreement signed',meta:'DocuSign · 21 Apr'},
          {done:false,label:'Tax declaration form (Form 12BB)',meta:'Required before 10 May',urgent:true},
          {done:false,label:'Address proof upload',meta:'Required before 10 May',urgent:true},
          {done:false,label:'Bank account details for payroll',meta:'Secure form — not yet opened'},
          {done:false,label:'PF nomination form',meta:'Available after joining'},
          {done:false,label:'IT equipment preferences',meta:'System-populated'},
        ].map(item=>`
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--n8)">
          <div style="width:20px;height:20px;border-radius:50%;background:${item.done?'var(--success-light)':item.urgent?'var(--error-light)':'var(--n8)'};border:2px solid ${item.done?'var(--success)':item.urgent?'var(--error)':'var(--n6)'};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">${item.done?'✓':item.urgent?'!':''}</div>
          <div style="flex:1"><div style="font-size:12px;font-weight:${item.done?'400':'600'};color:${item.done?'var(--n5)':'var(--n0)'}${item.done?';text-decoration:line-through':''}">${item.label}</div><div style="font-size:10px;color:${item.urgent&&!item.done?'var(--error)':'var(--n5)'}">${item.meta}</div></div>
          ${!item.done?`<button class="btn-sys btn-sm">Pending</button>`:''}
        </div>`).join('')}
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="card-head"><div class="card-title">IT Setup Status</div></div>
      <div class="card-body">
        <div class="vl pass">✓ Corporate email assigned: sarah.mitchell@centific.com</div>
        <div class="vl wait">⏳ Laptop: MacBook Pro M3 · Being configured by IT</div>
        <div class="vl wait">⏳ System access: Pending HR approval</div>
      </div>
    </div>`;
}

function buildEmpDocs(){
  const el=document.getElementById('p-emp-docs');if(!el)return;
  el.innerHTML=`
    <div style="max-width:680px;margin:0 auto">
      <div class="card">
        <div class="card-head"><div class="card-title">My Documents</div><span class="tag orange">2 Pending</span></div>
        <div class="card-body">
          <div class="f-section">Submitted Documents</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
            <div class="upload-field uploaded"><div class="upload-ic">📄</div><div><div class="upload-label">Passport / ID Document</div><div class="upload-hint">passport_scan_sarah.pdf · Verified ✓</div></div><div class="upload-status ok">✓</div></div>
            <div class="upload-field uploaded"><div class="upload-ic">📝</div><div><div class="upload-label">Employment Agreement</div><div class="upload-hint">Agreement_Sarah_2026.pdf · Signed ✓</div></div><div class="upload-status ok">✓</div></div>
          </div>
          <div class="f-section">Pending Submission</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div class="upload-field" style="border-color:var(--error);background:var(--error-light)"><div class="upload-ic">📋</div><div><div class="upload-label" style="color:var(--error)">Tax Declaration Form</div><div class="upload-hint" style="color:var(--error)">Required before 10 May 2026</div></div><div class="upload-status" style="color:var(--error)">Pending</div></div>
            <div class="upload-field" style="border-color:var(--error);background:var(--error-light)"><div class="upload-ic">🏠</div><div><div class="upload-label" style="color:var(--error)">Address Proof</div><div class="upload-hint" style="color:var(--error)">Required before 10 May</div></div><div class="upload-status" style="color:var(--error)">Pending</div></div>
          </div>
        </div>
      </div>
    </div>`;
}

function buildEmpProgress(){
  const el=document.getElementById('p-emp-progress');if(!el)return;
  const steps=[
    {label:'Offer Accepted',meta:'15 Apr 2026 · Completed',st:'done'},
    {label:'Portal Access Received',meta:'20 Apr 2026 · Email token sent',st:'done'},
    {label:'Personal Details & Documents',meta:'21 Apr 2026 · Passport + Agreement submitted',st:'done'},
    {label:'Remaining Documents',meta:'Deadline: 10 May 2026 · 2 items outstanding',st:'active'},
    {label:'HR Verification & Approval',meta:'Awaiting document completion',st:'pending'},
    {label:'Joining Day — 15 May 2026',meta:'21 days to go!',st:'pending'},
    {label:'Post-Onboarding Activities',meta:'PF, buddy assignment, welcome',st:'pending'},
  ];
  const doneCount=steps.filter(s=>s.st==='done').length;
  const pct=Math.round((doneCount/steps.length)*100);
  el.innerHTML=`
    <div style="max-width:680px;margin:0 auto">
      <div class="card">
        <div class="card-head">
          <div class="card-title">My Onboarding Journey</div>
          <span class="tag green">${doneCount}/${steps.length} complete</span>
        </div>
        <div class="card-body">
          <!-- Progress bar -->
          <div style="margin-bottom:18px">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--n5);margin-bottom:6px">
              <span>Overall Progress</span><span style="font-weight:600;color:var(--n0)">${pct}%</span>
            </div>
            <div style="height:6px;background:var(--n7);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#5929d0,#CF008B);border-radius:3px;transition:width .6s ease"></div>
            </div>
          </div>
          <!-- Horizontal timeline -->
          <div style="display:flex;align-items:flex-start;gap:0;overflow:visible;padding-bottom:8px">
            ${steps.map((s,i)=>{
              const clr=s.st==='done'?'var(--success)':s.st==='active'?'var(--primary)':'var(--n6)';
              const bg=s.st==='done'?'var(--success-light)':s.st==='active'?'var(--primary-light)':'var(--n8)';
              return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;position:relative">
                ${i<steps.length-1?`<div style="position:absolute;top:10px;left:calc(50% + 10px);right:calc(-50% + 10px);height:2px;background:${s.st==='done'?'var(--success)':'var(--n7)'};z-index:0"></div>`:''}
                <div style="width:22px;height:22px;border-radius:50%;border:2px solid ${clr};background:${bg};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:${clr};z-index:1;flex-shrink:0">${s.st==='done'?'✓':s.st==='active'?'●':''}</div>
                <div style="text-align:center;margin-top:6px;padding:0 2px">
                  <div style="font-size:9.5px;font-weight:600;color:${s.st==='pending'?'var(--n5)':'var(--n0)'};line-height:1.3">${s.label}</div>
                  <div style="font-size:8.5px;color:var(--n5);margin-top:2px;line-height:1.3">${s.meta}</div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

function buildITQueue(){
  const el=document.getElementById('p-it-queue');if(!el)return;
  el.innerHTML=`
    <div class="kpi-grid g3" style="margin-bottom:14px">
      <div class="kpi orange"><div class="kpi-label">Pending Requests</div><div class="kpi-value">4</div><div class="kpi-meta">⚠ 1 overdue</div></div>
      <div class="kpi blue"><div class="kpi-label">In Progress</div><div class="kpi-value">2</div><div class="kpi-meta">Active configuration</div></div>
      <div class="kpi red"><div class="kpi-label">Blocked</div><div class="kpi-value">1</div><div class="kpi-meta">API timeout issue</div></div>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-title">IT Provisioning Queue</div><span class="tag orange">Assigned to IT Support</span></div>
      ${EMP.map(e=>`
      <div style="display:grid;grid-template-columns:1.6fr 0.8fr 0.8fr 1fr 80px;align-items:center;gap:0;padding:9px 14px;border-bottom:1px solid var(--n8)">
        <div class="emp"><div class="emp-av" style="background:${e.col}">${e.ini}</div><div><div class="emp-name">${e.name}</div><div class="emp-role">${e.role}</div></div></div>
        <div style="font-size:11px;color:var(--n3)">${e.dept}</div>
        <div>${days(e.join)}</div>
        <div style="font-size:10.5px;color:var(--n4)">Laptop, Email, Access</div>
        <div>${badge(e.it==='Provisioned'?'completed':e.it==='Pending HIL'||e.it==='Pending'?'hil':e.it==='Not Started'?'blocked':'in-progress')}</div>
      </div>`).join('')}
    </div>`;
}

function buildITActive(){
  const el=document.getElementById('p-it-active');if(!el)return;
  el.innerHTML=`
    <div class="card">
      <div class="card-head"><div class="card-title">Active Provisioning Tasks</div></div>
      <div class="card-body">
        ${[
          {n:'Priya Kapoor',task:'Email ID Creation',status:'in-progress',due:'26 Apr'},
          {n:'Rohit Sharma',task:'System Access Setup',status:'in-progress',due:'3 May'},
          {n:'Aryan Mehta',task:'Laptop Configuration',status:'hil',due:'25 Apr'},
        ].map(t=>`
        <div style="border:1px solid var(--n7);border-radius:var(--r-sm);padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
          <div style="flex:1"><div style="font-size:12.5px;font-weight:600;color:var(--n0)">${t.n}</div><div style="font-size:10.5px;color:var(--n4)">${t.task} · Due: ${t.due}</div></div>
          ${badge(t.status)}
          <button class="btn-sys btn-sm">Mark Done</button>
        </div>`).join('')}
      </div>
    </div>`;
}

function buildITDone(){
  const el=document.getElementById('p-it-done');if(!el)return;
  el.innerHTML=`
    <div class="card">
      <div class="card-head"><div class="card-title">Completed Provisioning</div><span class="tag green">This week</span></div>
      ${[['Wei Chen','Full provisioning','14 Apr 2026'],['Rohit Sharma','HRMS Record + Email','22 Apr 2026'],['Fatima Noor','Full provisioning','7 Apr 2026']].map(([n,t,d])=>`
      <div style="display:flex;align-items:center;gap:12px;padding:9px 14px;border-bottom:1px solid var(--n8)">
        <div style="flex:1"><div style="font-size:12px;font-weight:600;color:var(--n0)">${n}</div><div style="font-size:10.5px;color:var(--n5)">${t}</div></div>
        <div style="font-size:10.5px;color:var(--n4)">${d}</div>
        ${badge('completed')}
      </div>`).join('')}
    </div>`;
}

function buildAdminTasks(){
  const el=document.getElementById('p-admin-tasks');if(!el)return;
  el.innerHTML=`
    <div class="kpi-grid g3" style="margin-bottom:14px">
      <div class="kpi orange"><div class="kpi-label">Pending Tasks</div><div class="kpi-value">3</div><div class="kpi-meta">Desk + ID cards</div></div>
      <div class="kpi blue"><div class="kpi-label">Joining This Week</div><div class="kpi-value">2</div><div class="kpi-meta">Aryan, Priya — 28 Apr</div></div>
      <div class="kpi green"><div class="kpi-label">Completed</div><div class="kpi-value">8</div><div class="kpi-meta">This month</div></div>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-title">Admin Task Board</div><span class="tag orange">3 Pending</span></div>
      <div class="task-grid">
        <div class="task-col"><div class="task-col-label">Desk Allocation</div>
          <div class="task-item"><div class="task-item-name">Aryan Mehta</div><div class="task-item-meta">Desk 4B · Engineering · Due 25 Apr</div><div class="task-item-st">${badge('completed')}</div></div>
          <div class="task-item"><div class="task-item-name">Priya Kapoor</div><div class="task-item-meta">Desk 7A · Design · Due 27 Apr</div><div class="task-item-st">${badge('in-progress')}</div></div>
          <div class="task-item"><div class="task-item-name">Rohit Sharma</div><div class="task-item-meta">Desk allocation · Due 3 May</div><div class="task-item-st">${badge('in-progress')}</div></div>
          <div class="task-item"><div class="task-item-name">Aisha Patel</div><div class="task-item-meta">Not started — joining 1 May</div><div class="task-item-st">${badge('blocked')}</div></div>
        </div>
        <div class="task-col"><div class="task-col-label">ID Card Preparation</div>
          <div class="task-item"><div class="task-item-name">Aryan Mehta</div><div class="task-item-meta">ID ready for collection</div><div class="task-item-st">${badge('completed')}</div></div>
          <div class="task-item"><div class="task-item-name">Priya Kapoor</div><div class="task-item-meta">Photo pending · Due 27 Apr</div><div class="task-item-st">${badge('in-progress')}</div></div>
          <div class="task-item"><div class="task-item-name">Rohit Sharma</div><div class="task-item-meta">Not started</div><div class="task-item-st">${badge('blocked')}</div></div>
        </div>
        <div class="task-col"><div class="task-col-label">Access Card</div>
          <div class="task-item"><div class="task-item-name">Aryan Mehta</div><div class="task-item-meta">Physical access activated</div><div class="task-item-st">${badge('completed')}</div></div>
          <div class="task-item"><div class="task-item-name">Priya Kapoor</div><div class="task-item-meta">Ready for activation</div><div class="task-item-st">${badge('in-progress')}</div></div>
          <div class="task-item"><div class="task-item-name">Wei Chen</div><div class="task-item-meta">Activated · Post-joining</div><div class="task-item-st">${badge('completed')}</div></div>
        </div>
      </div>
    </div>`;
}

function buildAdminDesk(){
  const el=document.getElementById('p-admin-desk');if(!el)return;
  el.innerHTML=`
    <div class="card">
      <div class="card-head"><div class="card-title">Desk Assignment Status</div></div>
      ${[['Aryan Mehta','Engineering','28 Apr','Desk 4B','Eng Floor','completed'],
         ['Priya Kapoor','Design','28 Apr','Desk 7A','Design Studio','in-progress'],
         ['Wei Chen','HR','Joined','Desk 2C','HR Floor','completed'],
         ['Fatima Noor','Legal','Joined','Desk 9D','Legal Floor','completed'],
         ['Rohit Sharma','Engineering','5 May','TBD','Eng Floor','in-progress'],
         ['Aisha Patel','Analytics','1 May','Not assigned','—','blocked']
        ].map(([n,d,j,desk,floor,st])=>`
      <div style="display:grid;grid-template-columns:1.4fr 0.8fr 0.7fr 0.9fr 1fr 80px;align-items:center;gap:0;padding:8px 14px;border-bottom:1px solid var(--n8)">
        <div style="font-size:12px;font-weight:500;color:var(--n0)">${n}</div>
        <div style="font-size:11px;color:var(--n4)">${d}</div>
        <div style="font-size:11px;color:var(--n4)">${j}</div>
        <div style="font-size:11px;color:var(--n2);font-weight:500">${desk}</div>
        <div style="font-size:10.5px;color:var(--n5)">${floor}</div>
        <div>${badge(st)}</div>
      </div>`).join('')}
    </div>`;
}

function buildAdminID(){
  const el=document.getElementById('p-admin-id');if(!el)return;
  el.innerHTML=`
    <div class="card">
      <div class="card-head"><div class="card-title">ID Card Status</div><span class="tag orange">2 Pending</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;padding:7px 14px;background:var(--n8);border-bottom:1px solid var(--n7)">
        ${['Employee','Photo','Printed','Access','Status'].map(h=>`<div style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--n5)">${h}</div>`).join('')}
      </div>
      ${[['Aryan Mehta',true,true,true,'completed'],
         ['Priya Kapoor',false,false,false,'in-progress'],
         ['Wei Chen',true,true,true,'completed'],
         ['Fatima Noor',true,true,true,'completed'],
         ['Rohit Sharma',false,false,false,'blocked']
        ].map(([n,photo,printed,access,st])=>`
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;align-items:center;padding:9px 14px;border-bottom:1px solid var(--n8)">
        <div style="font-size:12px;font-weight:500;color:var(--n0)">${n}</div>
        ${[photo,printed,access].map(v=>`<div style="text-align:left"><div style="width:16px;height:16px;border-radius:50%;background:${v?'var(--success-light)':'var(--n8)'};border:2px solid ${v?'var(--success)':'var(--n6)'};display:flex;align-items:center;justify-content:center;font-size:8px;color:${v?'var(--success)':'var(--n6)'}">${v?'✓':'—'}</div></div>`).join('')}
        <div>${badge(st)}</div>
      </div>`).join('')}
    </div>`;
}

// ═══════════════════════════════════════════
// LIVE COMMENTARY ENGINE — 3 phases, agent thoughts
// ═══════════════════════════════════════════
const PHASE_GROUPS=[
  {
    phase:'Pre-Onboarding',
    phaseColor:'#5929d0',
    phaseBg:'#E8E5FF',
    rule:'BR-001',
    steps:[
      {
        step:'Candidate Record Intake',
        thoughts:[
          {type:'trigger', text:'Received confirmed candidate record from ATS for Priya Kapoor — Dept: Design, Role: Product Designer'},
          {type:'think',   text:'Checking if joining date is ≥ 7 days away to schedule follow-up cadence...'},
          {type:'activity',text:'Joining date 28 Apr confirmed. Scheduling: 7-day → 3-day → day-of reminders'},
          {type:'think',   text:'Routing IT provisioning request — hardware tier based on role seniority: Design → Standard M3'},
          {type:'activity',text:'IT provisioning request dispatched: Laptop (M3), corporate email, system access for Priya Kapoor'},
          {type:'think',   text:'Admin needs desk + ID card. Checking floor availability for Design Studio...'},
          {type:'activity',text:'Admin team notified: Desk 7A (Design Studio) reserved · ID card preparation queued'},
        ]
      },
      {
        step:'Candidate Follow-up Cadence',
        thoughts:[
          {type:'activity',text:'T-7 reminder sent to Priya Kapoor via email + SMS: "Your joining date is 28 Apr"'},
          {type:'think',   text:'Monitoring for candidate acknowledgement... checking response within 24hrs'},
          {type:'alert',   text:'Aisha Patel — no response to T-7 reminder after 28 hours. Escalating to HR Coordinator'},
          {type:'activity',text:'Aryan Mehta responded to T-7 reminder — joining confirmed, flagged as Active'},
          {type:'think',   text:'Priya Kapoor acknowledged. T-3 reminder scheduled for 25 Apr 09:00 IST'},
          {type:'activity',text:'All follow-up states updated in pipeline. HR readiness summary generated'},
        ]
      }
    ]
  },
  {
    phase:'Onboarding',
    phaseColor:'#CF008B',
    phaseBg:'#FFD6F4',
    rule:'BR-002 / BR-003',
    steps:[
      {
        step:'Document Collection & Validation',
        thoughts:[
          {type:'trigger', text:'Joining day minus 5: initiating document intake for Aryan Mehta'},
          {type:'think',   text:'Generating time-limited secure portal token (expires 72h) — sending to aryan.mehta@gmail.com'},
          {type:'activity',text:'Portal token sent. Awaiting document submission from candidate'},
          {type:'activity',text:'Passport P9920134 received — running automated validation checks...'},
          {type:'think',   text:'Checking: document format ✓ · expiry date > 1yr ✓ · name matches offer letter ✓ · no OCR anomalies ✓'},
          {type:'activity',text:'Passport validation passed. Employment agreement received and signature detected'},
          {type:'alert',   text:"James O'Brien — Tax form (Form 12BB) submitted but PAN Number field is blank. Requesting correction"},
          {type:'hil',     text:'HIL Gate 1 triggered for Aryan Mehta — all docs valid, BG check clear. Awaiting HR Coordinator sign-off before provisioning'},
        ]
      },
      {
        step:'HRMS Record & System Provisioning',
        thoughts:[
          {type:'trigger', text:'HIL Gate 1 approved by HR Coordinator. Initiating HRMS record creation for Aryan Mehta'},
          {type:'think',   text:'Calling HRMS API — setting employee grade M3, department Engineering, reporting manager Raghava Kumar'},
          {type:'activity',text:'HRMS record created: Employee ID EMP-2026-00841 assigned'},
          {type:'think',   text:'Triggering corporate email via Identity Management API — username format: firstname.lastname@centific.com'},
          {type:'activity',text:'Corporate email provisioned: aryan.mehta@centific.com — password reset link sent to personal email'},
          {type:'alert',   text:'Provisioning API timeout on Rohit Sharma — retrying (attempt 2/3). IT team auto-notified'},
          {type:'activity',text:'Retry succeeded: rohit.sharma@centific.com provisioned on attempt 2'},
          {type:'think',   text:'Checking laptop configuration status — IT queue shows 2 devices pending. Aryan Mehta priority-flagged'},
        ]
      },
      {
        step:'Payroll & Statutory Configuration',
        thoughts:[
          {type:'trigger', text:'HRMS record confirmed. Initiating payroll onboarding for Wei Chen'},
          {type:'think',   text:'Opening secure bank detail capture form (AES-256 encrypted channel, zero local storage)'},
          {type:'activity',text:'Bank account details received and forwarded directly to payroll system — not stored locally'},
          {type:'think',   text:'Applying statutory config: Employee in India → PF at 12%, ESI applicable, Grade M3 pay band'},
          {type:'activity',text:'PF configuration applied: 12% employee + 12% employer contributions. ESI enrolled'},
          {type:'alert',   text:"James O'Brien — payroll config blocked pending resolution of Tax form exception F08"},
        ]
      }
    ]
  },
  {
    phase:'Post-Onboarding',
    phaseColor:'#16A34A',
    phaseBg:'#DCFCE7',
    rule:'BR-005 / BR-006',
    steps:[
      {
        step:'Day-1 Activation',
        thoughts:[
          {type:'trigger', text:'Joining date reached for Wei Chen (14 Apr). Initiating post-onboarding workflow'},
          {type:'think',   text:'Drafting personalised welcome email — including team intro, IT contact, first-week schedule'},
          {type:'activity',text:'Welcome email dispatched to Wei Chen and copied to Engineering team lead'},
          {type:'activity',text:'IT confirmed: Laptop ready at Desk 2C, HR Floor. Access card active'},
          {type:'think',   text:'Running buddy matching algorithm — same department, 1.5–3yr tenure, available capacity'},
          {type:'activity',text:'Buddy match found: Neha Singh (2.5yr, HR team, available). Availability confirmed'},
          {type:'activity',text:'Introduction notification sent to both Wei Chen and Neha Singh'},
        ]
      },
      {
        step:'Completion Gate & Audit Close',
        thoughts:[
          {type:'think',   text:'Running mandatory stage checklist for Wei Chen: pre-onboarding ✓ · documents ✓ · provisioning ✓ · payroll ✓ · buddy ✓'},
          {type:'activity',text:'All stages confirmed complete. Triggering HIL Gate 4 for final HR Ops Manager approval'},
          {type:'hil',     text:'HIL Gate 4 raised for Wei Chen — final sign-off required by HR Ops Manager Nandita Mehta'},
          {type:'alert',   text:'Fatima Noor — PF form not yet submitted. Day-14 reminder queued. SLA at risk'},
          {type:'audit',   text:'Case OB-0843 (Wei Chen) audit trail sealed: 14 events logged — immutable, UTC-timestamped, append-only'},
          {type:'audit',   text:'SLA compliance report generated and dispatched to HR Operations. 2 cases flagged approaching deadline'},
        ]
      }
    ]
  }
];

// Flatten into delivery queue
let deliveryQueue=[];
let phaseStepState={}; // key = "pi-si" → {open, eventCount}
let phaseOpenState={}; // pi → open
let qHead=0;

function buildQueue(){
  deliveryQueue=[];
  PHASE_GROUPS.forEach((pg,pi)=>{
    deliveryQueue.push({type:'open-phase',pi});
    pg.steps.forEach((step,si)=>{
      deliveryQueue.push({type:'open-step',pi,si});
      step.thoughts.forEach((ev,ei)=>{
        deliveryQueue.push({type:'event',pi,si,ei});
      });
    });
  });
}
buildQueue();

function nowTs(){return new Date().toTimeString().slice(0,8)}
function evColor(type){
  return{trigger:'#5929d0',think:'#64748B',activity:'#16A34A',alert:'#E4902E',hil:'#CF008B',audit:'#22D3EE'}[type]||'#94A3B8';
}
function evLabel(type){
  return{trigger:'TRIGGER',think:'THINKING',activity:'ACTIVITY',alert:'ALERT',hil:'HIL',audit:'AUDIT'}[type]||type.toUpperCase();
}
function evTagClass(type){
  return{trigger:'trigger',think:'think',activity:'activity',alert:'alert',hil:'hil',audit:'audit'}[type]||'activity';
}

// Add 'think' type to CSS if not there
(function addThinkStyle(){
  const s=document.createElement('style');
  s.textContent='.lc-tag.think{background:#F1F5F9;color:#475569}.lc-ev.think-ev{font-style:italic;opacity:.85}';
  document.head.appendChild(s);
})();

function renderLC(){
  const scroll=document.getElementById('lc-scroll');if(!scroll)return;
  scroll.innerHTML='';

  PHASE_GROUPS.forEach((pg,pi)=>{
    if(!phaseOpenState[pi]&&phaseOpenState[pi]!==false)return; // not yet opened

    const phaseWrap=document.createElement('div');
    phaseWrap.style.cssText='margin-bottom:8px';
    phaseWrap.id='lcp-'+pi;

    // Phase header
    const phHead=document.createElement('div');
    phHead.style.cssText=`display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:8px 8px 0 0;background:${pg.phaseBg};border:1px solid ${pg.phaseColor}22;cursor:pointer;`;
    const stepCount=pg.steps.reduce((acc,_,si)=>{
      const k=`${pi}-${si}`;
      return acc+(phaseStepState[k]?phaseStepState[k].eventCount:0);
    },0);
    const isPhaseOpen=phaseOpenState[pi]!==false;
    phHead.innerHTML=`
      <span style="font-size:8px;color:${pg.phaseColor};transition:transform .15s;transform:${isPhaseOpen?'rotate(0)':'rotate(-90deg)'};display:inline-block">▼</span>
      <span style="font-size:11px;font-weight:700;color:${pg.phaseColor};flex:1">${pg.phase}</span>
      <span style="font-size:9px;font-weight:600;color:${pg.phaseColor};opacity:.7">${stepCount} events</span>`;
    phHead.onclick=()=>{phaseOpenState[pi]=!phaseOpenState[pi];renderLC();};
    phaseWrap.appendChild(phHead);

    if(isPhaseOpen){
      const phBody=document.createElement('div');
      phBody.style.cssText=`border:1px solid ${pg.phaseColor}22;border-top:none;border-radius:0 0 8px 8px;overflow:hidden`;

      pg.steps.forEach((step,si)=>{
        const k=`${pi}-${si}`;
        if(!phaseStepState[k])return;
        const {open:stepOpen,eventCount}=phaseStepState[k];

        const stepWrap=document.createElement('div');
        stepWrap.id=`lcs-${pi}-${si}`;

        const stepHead=document.createElement('div');
        stepHead.style.cssText=`display:flex;align-items:center;gap:6px;padding:6px 10px;background:rgba(248,249,252,.9);cursor:pointer;border-bottom:1px solid #E2E8F0`;
        stepHead.innerHTML=`
          <span style="font-size:7px;color:${pg.phaseColor};opacity:.7">▶</span>
          <span style="font-size:10.5px;font-weight:600;color:#334155;flex:1">${step.step}</span>
          <span style="font-size:9px;color:#94A3B8">${eventCount}/${step.thoughts.length}</span>`;
        stepHead.onclick=(e)=>{e.stopPropagation();phaseStepState[k].open=!phaseStepState[k].open;renderLC();};
        stepWrap.appendChild(stepHead);

        if(stepOpen){
          const evList=document.createElement('div');
          evList.id=`lce-${pi}-${si}`;
          evList.style.cssText='background:#fff;padding:4px 6px';
          for(let ei=0;ei<eventCount;ei++){
            evList.appendChild(makeEventEl(step.thoughts[ei],pi,si,ei,false));
          }
          stepWrap.appendChild(evList);
        }
        phBody.appendChild(stepWrap);
      });
      phaseWrap.appendChild(phBody);
    }
    scroll.appendChild(phaseWrap);
  });
}

function makeEventEl(ev,pi,si,ei,isNew){
  const el=document.createElement('div');
  el.className='lc-ev'+(isNew?' new':'')+(ev.type==='think'?' think-ev':'');
  el.id=`lcev-${pi}-${si}-${ei}`;
  el.style.setProperty('--evc',evColor(ev.type));
  el.innerHTML=`<div class="lc-ev-ts"><span class="lc-tag ${evTagClass(ev.type)}">${evLabel(ev.type)}</span><span style="font-size:9px;color:#94A3B8">⏱ ${nowTs()}</span></div><div class="lc-ev-text">${ev.text}</div>`;
  return el;
}

function tick(){
  if(qHead>=deliveryQueue.length){qHead=0;buildQueue();}
  const item=deliveryQueue[qHead++];

  if(item.type==='open-phase'){
    phaseOpenState[item.pi]=true;
    renderLC();
  } else if(item.type==='open-step'){
    const k=`${item.pi}-${item.si}`;
    if(!phaseStepState[k]) phaseStepState[k]={open:true,eventCount:0};
    renderLC();
  } else if(item.type==='event'){
    const{pi,si,ei}=item;
    const k=`${pi}-${si}`;
    if(!phaseStepState[k])return;
    phaseStepState[k].eventCount++;
    if(phaseStepState[k].open){
      const evList=document.getElementById(`lce-${pi}-${si}`);
      if(evList){
        const newEl=makeEventEl(PHASE_GROUPS[pi].steps[si].thoughts[ei],pi,si,ei,true);
        evList.appendChild(newEl);
        setTimeout(()=>newEl.scrollIntoView({behavior:'smooth',block:'nearest'}),80);
      }
    }
    // update counts
    renderLC();
  }
}

// Seed first phase + step + 3 events
phaseOpenState[0]=true;
phaseStepState['0-0']={open:true,eventCount:0};
qHead=2; // skip open-phase and open-step
renderLC();
for(let i=0;i<3;i++){
  const item=deliveryQueue[qHead++];
  if(item&&item.type==='event'){
    const k=`${item.pi}-${item.si}`;
    phaseStepState[k].eventCount++;
    const evList=document.getElementById(`lce-${item.pi}-${item.si}`);
    if(evList) evList.appendChild(makeEventEl(PHASE_GROUPS[item.pi].steps[item.si].thoughts[item.ei],item.pi,item.si,item.ei,false));
  }
}
setInterval(tick,2600);

// ═══════════════════════════════════════════
// CLOCK
// ═══════════════════════════════════════════
function updateClock(){
  const now=new Date();
  const t=now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});
  const d=now.toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'});
  document.getElementById('tb-time').textContent=t;
  document.getElementById('tb-date').textContent=d;
}
updateClock();
setInterval(updateClock,1000);

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
buildTaskbar('HR Coordinator');
renderOvCases();
renderMiniAudit();
updateBrandTooltip();
updateBrandIndicator();

// ═══════════════════════════════════════════
// WINDOW DRAG — titlebar drag to move
// ═══════════════════════════════════════════
(function initDrag(){
  const titlebar = document.querySelector('.win-titlebar');
  const w = document.querySelector('.app-window');
  if(!titlebar||!w) return;

  let dragging=false, startX=0, startY=0, origLeft=0, origTop=0, origRight=0, origBottom=0;

  titlebar.addEventListener('mousedown', e=>{
    // Don't drag when clicking controls or role pill
    if(e.target.closest('.win-controls')||e.target.closest('.win-role-pill')) return;
    if(isMaximized) return;
    dragging=true;
    startX=e.clientX; startY=e.clientY;
    const rect=w.getBoundingClientRect();
    const vp=document.querySelector('.desktop-viewport');
    const vpRect=vp.getBoundingClientRect();
    origLeft=rect.left-vpRect.left;
    origTop=rect.top-vpRect.top;
    origRight=vpRect.width-(rect.left-vpRect.left+rect.width);
    origBottom=0; // let bottom float
    titlebar.classList.add('dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', e=>{
    if(!dragging) return;
    const dx=e.clientX-startX;
    const dy=e.clientY-startY;
    const newLeft=Math.max(0,origLeft+dx);
    const newTop=Math.max(0,origTop+dy);
    // Switch from inset-based to position-based
    w.style.transition='none';
    w.style.inset='auto';
    w.style.left=newLeft+'px';
    w.style.top=newTop+'px';
    w.style.right=(origRight-dx)+'px';
    w.style.bottom='0';
  });

  document.addEventListener('mouseup', ()=>{
    if(dragging){
      dragging=false;
      titlebar.classList.remove('dragging');
      w.style.transition='opacity .2s ease, transform .22s cubic-bezier(.34,1.2,.64,1), box-shadow .2s ease';
    }
  });
})();

// ═══════════════════════════════════════════
// WINDOW RESIZE — SE corner handle
// ═══════════════════════════════════════════
(function initResize(){
  const handle=document.getElementById('win-resize-se');
  const w=document.querySelector('.app-window');
  if(!handle||!w) return;
  let resizing=false, startX=0, startY=0, startW=0, startH=0;

  handle.addEventListener('mousedown', e=>{
    if(isMaximized) return;
    resizing=true;
    startX=e.clientX; startY=e.clientY;
    const rect=w.getBoundingClientRect();
    startW=rect.width; startH=rect.height;
    document.body.style.cursor='se-resize';
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('mousemove', e=>{
    if(!resizing) return;
    const newW=Math.max(640, startW+(e.clientX-startX));
    const newH=Math.max(400, startH+(e.clientY-startY));
    w.style.transition='none';
    w.style.right='auto';
    w.style.bottom='0';
    w.style.width=newW+'px';
    // Height is constrained by inset bottom=0, so adjust top instead
    w.style.minHeight=newH+'px';
  });

  document.addEventListener('mouseup', ()=>{
    if(resizing){
      resizing=false;
      document.body.style.cursor='';
      w.style.transition='opacity .2s ease, transform .22s cubic-bezier(.34,1.2,.64,1), box-shadow .2s ease';
    }
  });
})();

// ═══════════════════════════════════════════
// WINDOW FOCUS STATE — dims when modal/LC open
// ═══════════════════════════════════════════
function setWindowFocus(focused){
  document.querySelector('.app-window').classList.toggle('unfocused', !focused);
}

// Patch toggleLC to set window focus state
const _origToggleLC = window.toggleLC || toggleLC;
window.toggleLC = function(){
  document.getElementById('lc-panel').classList.toggle('open');
  document.getElementById('role-dropdown').classList.remove('open');
  const isOpen = document.getElementById('lc-panel').classList.contains('open');
  setWindowFocus(!isOpen);
};

// Patch modal to set focus
document.getElementById('modal').addEventListener('transitionend', ()=>{
  const isOpen = document.getElementById('modal').classList.contains('open');
  setWindowFocus(!isOpen);
});

// ═══════════════════════════════════════════
// DYNAMIC WINDOW TITLE — updates per page
// ═══════════════════════════════════════════
function updateWinTitle(page){
  const titleEl = document.getElementById('win-title');
  if(!titleEl) return;
  const titles = {
    'overview':      'aegis.ai — Dashboard',
    'cases':         'aegis.ai — Active Cases (12)',
    'preonboard':    'aegis.ai — Pre-Onboarding',
    'exceptions':    'aegis.ai — Exception Queue',
    'post':          'aegis.ai — Post-Onboarding',
    'audit':         'aegis.ai — Audit Log',
    'reports':       'aegis.ai — Reports',
    'ops-dashboard': 'aegis.ai — Ops Manager Dashboard',
    'hil-approvals': 'aegis.ai — HIL Approvals (2 pending)',
    'sla':           'aegis.ai — SLA Monitor',
    'emp-portal':    'aegis.ai — My Onboarding Portal',
    'emp-docs':      'aegis.ai — My Documents',
    'emp-progress':  'aegis.ai — My Progress',
    'it-queue':      'aegis.ai — IT Queue (4 pending)',
    'it-active':     'aegis.ai — Active IT Tasks',
    'it-done':       'aegis.ai — Completed Provisioning',
    'admin-tasks':   'aegis.ai — Admin Task Board',
    'admin-desk':    'aegis.ai — Desk Assignments',
    'admin-id':      'aegis.ai — ID Card Status',
  };
  titleEl.textContent = titles[page] || 'aegis.ai — Employee Onboarding OS';
}

// Extend nav to also update window title + status bar
const _origNav = nav;
window.nav = function(page, triggerEl){
  _origNav(page, triggerEl);
  updateWinTitle(page);
  const sbRole = document.getElementById('sb-role-text');
  if(sbRole) sbRole.textContent = currentRole;
};

// ═══════════════════════════════════════════
// STATUS BAR — live updates
// ═══════════════════════════════════════════
function updateStatusBar(){
  // Update last action from audit log
  if(AUDIT && AUDIT.length){
    const latest = AUDIT[0];
    const sb = document.getElementById('sb-action-text');
    if(sb) sb.textContent = `${latest.ts} — ${latest.ev.substring(0,35)}${latest.ev.length>35?'…':''}`;
  }
}
updateStatusBar();

// Extend setRole to update status bar
const _origSetRole = setRole;
window.setRole = function(roleTitle, color, initials, fullName, el){
  _origSetRole(roleTitle, color, initials, fullName, el);
  const sbRole = document.getElementById('sb-role-text');
  if(sbRole) sbRole.textContent = roleTitle;
  updateWinTitle(currentPage);
};

// ═══════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════
document.addEventListener('keydown', e=>{
  if(e.ctrlKey||e.metaKey){
    const cfg = ROLE_CONFIG[currentRole];
    if(!cfg) return;
    const num = parseInt(e.key);
    if(num>=1 && num<=cfg.nav.length){
      e.preventDefault();
      nav(cfg.nav[num-1].page, null);
    }
    if(e.key==='l'||e.key==='L'){e.preventDefault();window.toggleLC();}
    if(e.key==='m'||e.key==='M'){e.preventDefault();winMinimize();}
  }
  if(e.key==='Escape'){
    const modal=document.getElementById('modal');
    const lc=document.getElementById('lc-panel');
    if(modal&&modal.classList.contains('open')) closeModal();
    else if(lc&&lc.classList.contains('open')){lc.classList.remove('open');setWindowFocus(true);}
  }
});

// Update tooltip shortcut hints
setTimeout(()=>{
  const cfg=ROLE_CONFIG[currentRole];
  if(cfg) document.querySelectorAll('.tb-icon').forEach((icon,i)=>{
    const page=icon.getAttribute('data-page');
    const item=cfg.nav.find(n=>n.page===page);
    if(item) icon.setAttribute('data-tip',`${item.label} (Ctrl+${i+1})`);
  });
},200);

