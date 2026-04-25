import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";

const ROLE_CONFIG = {
  "HR Coordinator": {
    color: "#5929d0",
    initials: "JR",
    name: "Jagadeeswar R",
    nav: [
      { label: "Dashboard", icon: "D", page: "overview" },
      { label: "Cases", icon: "C", page: "cases", badgeKey: "active" },
      { label: "Pre-Onboard", icon: "P", page: "preonboard" },
      { label: "Exceptions", icon: "!", page: "exceptions", badgeKey: "blocked" },
      { label: "Post-Onboard", icon: "O", page: "post" },
      { label: "Audit", icon: "A", page: "audit" },
      { label: "Reports", icon: "R", page: "reports" }
    ],
    defaultPage: "overview"
  },
  "HR Ops Manager": {
    color: "#CF008B",
    initials: "NM",
    name: "Nandita Mehta",
    nav: [
      { label: "Dashboard", icon: "D", page: "ops-dashboard" },
      { label: "Approvals", icon: "H", page: "hil-approvals", badgeKey: "pendingHil" },
      { label: "Exceptions", icon: "!", page: "exceptions", badgeKey: "blocked" },
      { label: "SLA Monitor", icon: "S", page: "sla" },
      { label: "Audit", icon: "A", page: "audit" },
      { label: "Reports", icon: "R", page: "reports" }
    ],
    defaultPage: "ops-dashboard"
  },
  "Onboarding Employee": {
    color: "#0E2E89",
    initials: "AY",
    name: "Amina Yusuf",
    nav: [
      { label: "My Portal", icon: "M", page: "emp-portal" },
      { label: "Documents", icon: "D", page: "emp-docs" }
    ],
    defaultPage: "emp-portal"
  },
  "IT Support": {
    color: "#E4902E",
    initials: "KP",
    name: "Kiran Patel",
    nav: [
      { label: "Queue", icon: "Q", page: "it-queue", badgeKey: "itQueue" },
      { label: "Active", icon: "A", page: "it-active" },
      { label: "Completed", icon: "C", page: "it-done" }
    ],
    defaultPage: "it-queue"
  },
  "Admin Team": {
    color: "#16A34A",
    initials: "AR",
    name: "Asha Rao",
    nav: [
      { label: "Task Board", icon: "T", page: "admin-tasks", badgeKey: "adminTasks" },
      { label: "Desks", icon: "D", page: "admin-desk" },
      { label: "ID Cards", icon: "I", page: "admin-id" }
    ],
    defaultPage: "admin-tasks"
  }
};

const PAGE_META = {
  overview: ["HR Coordinator - Dashboard", "Pipeline health · Active cases · Lifecycle overview"],
  cases: ["All Active Cases", "Full lifecycle view · employees"],
  preonboard: ["Pre-Onboarding Panel", "IT provisioning · Admin prep · Candidate follow-ups"],
  exceptions: ["Exception & HIL Queue", "Requires human-in-loop review"],
  post: ["Post-Onboarding", "Joining formalities · PF · Buddy assignment"],
  audit: ["Audit Log", "Append-only · All lifecycle events"],
  reports: ["Reports", "Onboarding analytics · Download ready"],
  "ops-dashboard": ["HR Ops Manager Dashboard", "Pipeline health · Approvals · SLA oversight"],
  "hil-approvals": ["HIL Approvals", "HR Ops Manager sign-off required"],
  sla: ["SLA Monitor", "SLA compliance · deadline tracking · escalation overview"],
  "emp-portal": ["My Onboarding Portal", "Employee onboarding checklist"],
  "emp-docs": ["My Documents", "Document submissions · validation status"],
  "it-queue": ["IT Provisioning Queue", "Active requests · pending · overdue"],
  "it-active": ["Active IT Tasks", "Currently in progress by IT Support"],
  "it-done": ["Completed Provisioning", "Provisioning completed this week"],
  "admin-tasks": ["Admin Task Board", "Desk, ID card & access card preparation"],
  "admin-desk": ["Desk Assignments", "Desk allocation tracker"],
  "admin-id": ["ID Card Status", "Card printing & access activation"]
};

const ROLE_NOTES = {
  "HR Coordinator": "Track active cases, review pre-onboarding progress, monitor exceptions, and follow every new joiner through post-onboarding.",
  "HR Ops Manager": "Watch pipeline health, approve HIL requests, review SLA risks, and audit lifecycle activity across all onboarding cohorts.",
  "Onboarding Employee": "Check your onboarding progress, review pending documents, and follow the steps needed before and after joining.",
  "IT Support": "Work through provisioning requests, identify blocked access setup, and confirm laptop, email, and system readiness.",
  "Admin Team": "Prepare desks, ID cards, access cards, and joining-day logistics for incoming employees."
};

const ICONS = {
  dashboard: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 10.5 10 4l7 6.5M5 9v7h4v-4h2v4h4V9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  cases: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M6 5.5h8M6 9.5h8M6 13.5h5M4 3.5h12c.8 0 1.5.7 1.5 1.5v10c0 .8-.7 1.5-1.5 1.5H4c-.8 0-1.5-.7-1.5-1.5V5c0-.8.7-1.5 1.5-1.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  preonboard: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 4v12M4 10h12M5.5 5.5h9v9h-9v-9Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  exceptions: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 6v5M10 14h.01M8.7 3.8 2.8 14.2c-.5.9.1 1.8 1.1 1.8h12.2c1 0 1.6-.9 1.1-1.8L11.3 3.8c-.6-1-2-1-2.6 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  post: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 10 3 3 7-7M10 17a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  audit: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M6 4h8M6 8h8M6 12h5M4 2.5h12v15H4v-15Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  reports: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 16V4M4 16h12M7 13V9M10 13V6M13 13v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  approvals: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M6 10.5 8.5 13 14 7.5M4 3.5h12v13H4v-13Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  sla: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 5v5l3 2M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  portal: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4.5 16c.8-2.4 2.7-3.8 5.5-3.8s4.7 1.4 5.5 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  docs: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M6 3.5h5l3 3v10H6v-13ZM11 3.5v3h3M8 10h4M8 13h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  progress: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 14.5h12M5 11l3-3 2 2 5-5M5 16.5h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  queue: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 5h10M5 10h10M5 15h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  active: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 4h6l1 3H6l1-3ZM5 7h10v9H5V7ZM8 10h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  done: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 10 3 3 7-7M4 16h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  tasks: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 5h10M5 10h10M5 15h10M3.5 5h.01M3.5 10h.01M3.5 15h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  desk: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 8h12v5H4V8ZM6 13v3M14 13v3M6 5h8v3H6V5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  idcard: <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3.5 5.5h13v9h-13v-9ZM6.5 9a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0ZM6 13c.5-1 1.3-1.5 2-1.5s1.5.5 2 1.5M12 8h2.5M12 11h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
};

const ICON_MAP = {
  overview: "dashboard",
  cases: "cases",
  preonboard: "preonboard",
  exceptions: "exceptions",
  post: "post",
  audit: "audit",
  reports: "reports",
  "ops-dashboard": "dashboard",
  "hil-approvals": "approvals",
  sla: "sla",
  "emp-portal": "portal",
  "emp-docs": "docs",
  "it-queue": "queue",
  "it-active": "active",
  "it-done": "done",
  "admin-tasks": "tasks",
  "admin-desk": "desk",
  "admin-id": "idcard"
};

const statusLabels = {
  completed: "Completed",
  "in-progress": "In Progress",
  "at-risk": "At Risk",
  blocked: "Blocked",
  hil: "Pending HIL"
};

function badge(status) {
  return <span className={`badge ${status}`}>{statusLabels[status] || status}</span>;
}

function PageIcon({ page }) {
  return ICONS[ICON_MAP[page] || "dashboard"];
}

function phaseTagClass(phase = "") {
  if (phase.includes("Pre")) return "purple";
  if (phase.includes("Post")) return "orange";
  if (phase.includes("Completed")) return "green";
  return "pink";
}

function getDefaultWidgetPositions() {
  if (typeof window === "undefined") {
    return {
      clock: { x: 28, y: 28 },
      welcome: { x: 1120, y: 420 }
    };
  }
  return {
    clock: { x: 30, y: 30 },
    welcome: {
      x: Math.max(24, window.innerWidth - 360),
      y: Math.max(240, window.innerHeight - 330)
    }
  };
}

function App() {
  const [role, setRole] = useState("HR Coordinator");
  const [page, setPage] = useState(ROLE_CONFIG["HR Coordinator"].defaultPage);
  const [roleOpen, setRoleOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(true);
  const [windowMode, setWindowMode] = useState("open");
  const [isMaximized, setIsMaximized] = useState(false);
  const [widgetPositions, setWidgetPositions] = useState(getDefaultWidgetPositions);
  const [data, setData] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [embeddedApp, setEmbeddedApp] = useState(null);
  const [error, setError] = useState("");
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const next = await api.dashboard();
        if (!ignore) {
          setData(next);
          setError("");
        }
      } catch (err) {
        if (!ignore) setError(err.message);
      }
    }
    load();
    const poll = setInterval(load, 5000);
    return () => {
      ignore = true;
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function clampWidgetsToViewport() {
      setWidgetPositions((current) => ({
        clock: {
          x: Math.max(12, Math.min(window.innerWidth - 330, current.clock.x)),
          y: Math.max(12, Math.min(window.innerHeight - 230, current.clock.y))
        },
        welcome: {
          x: Math.max(12, Math.min(window.innerWidth - 300, current.welcome.x)),
          y: Math.max(180, Math.min(window.innerHeight - 285, current.welcome.y))
        }
      }));
    }
    window.addEventListener("resize", clampWidgetsToViewport);
    clampWidgetsToViewport();
    return () => window.removeEventListener("resize", clampWidgetsToViewport);
  }, []);

  const currentRole = ROLE_CONFIG[role];
  const metrics = data?.metrics || {};
  const cases = data?.cases || [];
  const audit = data?.audit || [];
  const meta = PAGE_META[page] || [page, ""];
  const derivedCounts = useMemo(() => ({
    active: metrics.active || 0,
    pendingHil: metrics.pendingHil || 0,
    blocked: metrics.blocked || 0,
    itQueue: cases.filter((item) => item.it !== "Completed").length,
    adminTasks: cases.filter((item) => item.phase === "Pre-Onboarding" || item.phase === "Onboarding").length
  }), [metrics, cases]);

  function switchRole(nextRole) {
    setRole(nextRole);
    setPage(ROLE_CONFIG[nextRole].defaultPage);
    setRoleOpen(false);
    setNavOpen(false);
    setWindowMode("open");
  }

  function closeWindow() {
    setWindowMode("closed");
    setRoleOpen(false);
    setNavOpen(false);
  }

  function minimizeWindow() {
    if (isMaximized) {
      setIsMaximized(false);
      setWindowMode("open");
      return;
    }
    setWindowMode("minimized");
    setRoleOpen(false);
    setNavOpen(false);
  }

  function toggleMaximizeWindow() {
    setWindowMode("open");
    setIsMaximized((value) => !value);
  }

  function restoreWindow() {
    setWindowMode("open");
  }

  function toggleRoleMenu() {
    setRoleOpen((value) => !value);
    setNavOpen(false);
    setLiveOpen(true);
  }

  function toggleLivePanel() {
    setLiveOpen(true);
    setRoleOpen(false);
    setNavOpen(false);
  }

  function openPage(nextPage) {
    setPage(nextPage);
    setWindowMode("open");
    setNavOpen(false);
  }

  function moveWidget(id, position) {
    setWidgetPositions((current) => ({ ...current, [id]: position }));
  }

  return (
    <div className="desktop">
      <div className="desktop-viewport">
        {windowMode !== "open" && (
          <div className="desktop-widget-layer">
            <DesktopClockWidget clock={clock} position={widgetPositions.clock} onMove={(position) => moveWidget("clock", position)} />
            <WelcomeWidget role={role} roleConfig={currentRole} position={widgetPositions.welcome} onMove={(position) => moveWidget("welcome", position)} />
          </div>
        )}
        <div className={`app-window ${windowMode} ${isMaximized ? "maximized" : ""} ${selectedCase ? "unfocused" : ""}`}>
          <Titlebar role={role} roleConfig={currentRole} onRoleClick={toggleRoleMenu} onClose={closeWindow} onMinimize={minimizeWindow} onMaximize={toggleMaximizeWindow} isMaximized={isMaximized} />
          <div className="app-composite">
            <div className="app-primary-pane">
              <div className="win-body">
                <div className="ctx-banner">
                  <button className={`hamburger-btn react-shell-button ${navOpen ? "active" : ""}`} onClick={() => setNavOpen((value) => !value)} data-tip="Dashboard menu">
                    <span />
                    <span />
                    <span />
                  </button>
                  <div className="ctx-live-dot" />
                  <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                    <span style={{ fontSize: 10.5, color: "var(--n5)", fontWeight: 500 }}>aegis.ai</span>
                    <span style={{ fontSize: 10, color: "var(--n6)" }}>›</span>
                    <span className="ctx-title">{meta[0]}</span>
                    <span className="ctx-crumb">{meta[1]}</span>
                  </div>
                  <div className="ctx-right">
                    <div className="ctx-agent-chip"><div className="ctx-agent-dot" /><span>GET-only MVP · Live Polling</span></div>
                  </div>
                </div>
                  {navOpen && <DashboardMenu page={page} nav={currentRole.nav} counts={derivedCounts} onNavigate={openPage} />}
                <div className="win-content">
                  <main className="win-main">
                    {error && <div className="card" style={{ padding: 14, color: "var(--error)" }}>Backend unavailable: {error}</div>}
                    {!data && !error && <div className="card" style={{ padding: 18 }}>Loading dashboard...</div>}
                    {data && <PageRenderer page={page} data={data} cases={cases} metrics={metrics} audit={audit} openCase={setSelectedCase} setPage={setPage} />}
                  </main>
                </div>
              </div>
              <Statusbar audit={audit} source={data?.source} role={role} count={cases.length} />
            </div>
            <LiveCommentary open={liveOpen} role={role} audit={audit} cases={cases} />
          </div>
        </div>
      </div>
      <Taskbar roleConfig={currentRole} role={role} clock={clock} onRoleClick={toggleRoleMenu} onStartClick={restoreWindow} windowMode={windowMode} onOpenOfficeApp={setEmbeddedApp} />
      {roleOpen && <RoleDropdown role={role} switchRole={switchRole} />}
      {embeddedApp && <EmbeddedAppWindow app={embeddedApp} onClose={() => setEmbeddedApp(null)} />}
      {selectedCase && <CaseModal item={selectedCase} onClose={() => setSelectedCase(null)} />}
    </div>
  );
}

function PageRenderer({ page, data, cases, metrics, audit, openCase, setPage }) {
  if (page === "overview") return <Overview metrics={metrics} cases={cases} audit={audit} setPage={setPage} openCase={openCase} />;
  if (page === "cases") return <Cases cases={cases} openCase={openCase} />;
  if (page === "preonboard") return <PreOnboard cases={cases} />;
  if (page === "exceptions") return <Exceptions cases={cases} gates={data.hil_gates} />;
  if (page === "post") return <PostOnboard cases={cases} />;
  if (page === "audit") return <Audit audit={audit} />;
  if (page === "reports") return <Analytics analytics={data.analytics} />;
  if (page === "ops-dashboard") return <OpsDashboard metrics={metrics} cases={cases} gates={data.hil_gates} />;
  if (page === "hil-approvals") return <HilApprovals gates={data.hil_gates} cases={cases} />;
  if (page === "sla") return <SlaMonitor cases={cases} />;
  if (page === "emp-portal") return <EmployeePortal cases={cases} />;
  if (page === "emp-docs") return <EmployeeDocs cases={cases} />;
  if (page === "it-queue") return <ItQueue cases={cases} />;
  if (page === "it-active") return <ItActive cases={cases} />;
  if (page === "it-done") return <ItDone cases={cases} />;
  if (page === "admin-tasks") return <AdminTasks cases={cases} />;
  if (page === "admin-desk") return <AdminDesk cases={cases} />;
  if (page === "admin-id") return <AdminId cases={cases} />;
  return <Overview metrics={metrics} cases={cases} audit={audit} setPage={setPage} openCase={openCase} />;
}

function Titlebar({ role, roleConfig, onRoleClick, onClose, onMinimize, onMaximize, isMaximized }) {
  return (
    <div className="win-titlebar">
      <div className="win-controls">
        <button className="win-dot close react-shell-button" onClick={onClose} aria-label="Close window"><span className="dot-sym">x</span></button>
        <button className="win-dot min react-shell-button" onClick={onMinimize} aria-label="Minimize window"><span className="dot-sym">-</span></button>
        <button className="win-dot max react-shell-button" onClick={onMaximize} aria-label={isMaximized ? "Restore window" : "Maximize window"}><span className="dot-sym">{isMaximized ? "-" : "+"}</span></button>
      </div>
      <div className="win-title">aegis.ai - Employee Onboarding OS</div>
      <button className="win-role-pill react-shell-button" onClick={onRoleClick}>
        <div className="win-role-av" style={{ background: roleConfig.color }}>{roleConfig.initials}</div>
        <span className="win-role-name">{role}</span>
      </button>
    </div>
  );
}

function RoleDropdown({ role, switchRole }) {
  return (
    <div className="role-dropdown open" id="role-dropdown">
      <div className="role-dd-head"><div className="role-dd-title">Switch Role</div></div>
      {Object.entries(ROLE_CONFIG).map(([name, config]) => (
        <button key={name} className={`role-dd-item react-shell-button ${role === name ? "selected" : ""}`} onClick={() => switchRole(name)}>
          <div className="role-av" style={{ background: config.color }}>{config.initials}</div>
          <div className="role-dd-info">
            <div className="role-dd-name">{config.name}</div>
            <div className="role-dd-desc">{name}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function DashboardMenu({ page, nav, counts, onNavigate }) {
  return (
    <div className="dashboard-menu">
      <div className="dashboard-menu-title">Dashboard Menu</div>
      {nav.map((item) => {
        const count = item.badgeKey ? counts[item.badgeKey] : 0;
        return (
          <button key={item.page} className={`dashboard-menu-item react-shell-button ${page === item.page ? "active" : ""}`} onClick={() => onNavigate(item.page)}>
            <span className="dashboard-menu-icon"><PageIcon page={item.page} /></span>
            <span>{item.label}</span>
            {count > 0 && <span className="dashboard-menu-badge">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function LiveCommentary({ open, role, audit, cases }) {
  const recent = audit.slice(0, 8);
  const common = {
    pre: cases.filter((item) => item.phase === "Pre-Onboarding").length,
    onboard: cases.filter((item) => item.phase === "Onboarding").length,
    post: cases.filter((item) => item.phase === "Post-Onboarding" || item.phase === "Completed").length,
    hil: cases.filter((item) => item.st === "hil").length,
    risk: cases.filter((item) => item.st === "at-risk" || item.st === "blocked").length
  };
  const roleGroups = {
    "HR Coordinator": [
      ["Pre-Onboarding", "#5929d0", [["trigger", `Candidate intake active for ${common.pre} pre-onboarding cases.`], ["activity", "IT provisioning, admin prep, and candidate reminders are being monitored from backend data."], ["audit", recent[0] ? `${recent[0].emp}: ${recent[0].ev}` : "Waiting for first backend activity event."]]],
      ["Onboarding", "#CF008B", [["activity", `${common.onboard} onboarding cases are moving through document, HIL, and setup checks.`], ["hil", `${common.hil} cases currently need human approval.`], ["alert", `${common.risk} cases need closer attention.`]]],
      ["Post-Onboarding", "#0E766E", [["activity", `${common.post} cases are in post-onboarding or complete.`], ["audit", recent[1] ? `${recent[1].emp}: ${recent[1].ev}` : "Post-onboarding audit stream is ready."], ["activity", "Payroll, buddy assignment, and closure status stay visible in the lifecycle views."]]]
    ],
    "HR Ops Manager": [
      ["Approvals", "#CF008B", [["hil", `${common.hil} HIL approvals are waiting for decision.`], ["alert", `${common.risk} SLA or blocker items need manager visibility.`], ["audit", recent[0] ? `${recent[0].emp}: ${recent[0].ev}` : "Approval audit stream is ready."]]],
      ["SLA Monitor", "#E4902E", [["activity", "Pipeline health is being recalculated from GET analytics."], ["alert", "At-risk cases are surfaced for escalation review."], ["audit", recent[1] ? `${recent[1].emp}: ${recent[1].ev}` : "SLA watcher is waiting for events."]]],
      ["Reports", "#0E766E", [["activity", "Completion, department, and document validation metrics are available."], ["audit", "Manager dashboard is synced with backend summary counts."]]]
    ],
    "Onboarding Employee": [
      ["My Portal", "#0E2E89", [["activity", "Your document state and onboarding progress are visible in one place."], ["trigger", "Pending items are highlighted from the current onboarding case."], ["audit", "Profile data is refreshed from the backend read model."]]],
      ["Documents", "#5929d0", [["activity", "Document submission and validation states are tracked."], ["alert", "Incomplete items remain visible until resolved."]]],
      ["Onboarding Loop", "#0E766E", [["activity", "Milestones update as HR, IT, payroll, PF, bank details, mail, and approval steps complete."]]]
    ],
    "IT Support": [
      ["Provisioning", "#E4902E", [["trigger", `${cases.filter((item) => item.it !== "Completed").length} IT provisioning requests need review.`], ["activity", "Laptop, email, and access readiness are grouped by case."], ["alert", `${cases.filter((item) => item.it?.includes("Failed") || item.st === "blocked").length} IT-linked blockers are visible.`]]],
      ["Active Tasks", "#5929d0", [["activity", "In-progress setup work stays visible in the active task view."], ["audit", recent[0] ? `${recent[0].emp}: ${recent[0].ev}` : "IT activity stream is ready."]]],
      ["Completed", "#0E766E", [["activity", "Completed provisioning cases remain available for verification."]]]
    ],
    "Admin Team": [
      ["Desk Prep", "#16A34A", [["trigger", `${cases.filter((item) => item.phase !== "Completed").length} admin preparation tasks are queued.`], ["activity", "Desk, ID card, and access card work is grouped by task board."], ["alert", `${common.pre} upcoming joiners need pre-joining logistics.`]]],
      ["ID Cards", "#E4902E", [["activity", "Photo, print, and access activation statuses are tracked."], ["audit", recent[0] ? `${recent[0].emp}: ${recent[0].ev}` : "Admin audit stream is ready."]]],
      ["Access", "#0E766E", [["activity", "Physical access readiness is visible for post-joining support."]]]
    ]
  };
  const phaseGroups = (roleGroups[role] || roleGroups["HR Coordinator"]).map(([label, color, events]) => ({ label, color, events }));
  const events = phaseGroups.flatMap((group) => group.events.map(([type, text]) => ({ type, text, color: group.color })));

  return (
    <aside className={`lc-panel ${open ? "open" : ""}`} id="lc-panel">
      <div className="lc-head">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,.8)" strokeWidth="1.4" /><circle cx="7" cy="7" r="2.5" fill="white" opacity=".9" /><circle cx="7" cy="7" r="1" fill="rgba(220,38,38,1)" /></svg>
        <div className="lc-head-title">Agent Live Commentary</div>
        <div className="lc-live-pill">LIVE</div>
      </div>
      <div className="lc-scroll">
        <div className="lc-feed">
          {events.map((event, index) => (
            <div className="lc-ev new" style={{ "--evc": event.color }} key={`${event.type}-${index}`}>
              <div className="lc-ev-ts"><span className={`lc-tag ${event.type}`}>{event.type}</span><span>now</span></div>
              <div className="lc-ev-text">{event.text}</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function DraggableWidget({ className, position, onMove, children }) {
  const dragRef = useRef(null);

  function startDrag(event) {
    event.preventDefault();
    const widgetEl = event.currentTarget;
    widgetEl.setPointerCapture?.(event.pointerId);
    const widgetWidth = widgetEl.offsetWidth || 220;
    const widgetHeight = widgetEl.offsetHeight || 150;
    dragRef.current = {
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y
    };

    function handleMove(moveEvent) {
      const nextX = Math.max(12, Math.min(window.innerWidth - widgetWidth - 12, moveEvent.clientX - dragRef.current.offsetX));
      const nextY = Math.max(12, Math.min(window.innerHeight - widgetHeight - 68, moveEvent.clientY - dragRef.current.offsetY));
      onMove({ x: nextX, y: nextY });
    }

    function stopDrag() {
      dragRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopDrag);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stopDrag);
  }

  return (
    <section className={`desktop-widget ${className}`} style={{ left: position.x, top: position.y }} onPointerDown={startDrag} onDragStart={(event) => event.preventDefault()}>
      {children}
    </section>
  );
}

function DesktopClockWidget({ clock, position, onMove }) {
  return (
    <DraggableWidget className="clock-widget" position={position} onMove={onMove}>
      <div className="weather-main">
        <div>
          <div className="widget-clock-time">{clock.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
          <div className="widget-clock-date">{clock.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        <div className="weather-side">
          <div className="weather-sun">☀️</div>
          <div className="weather-temp">32°C</div>
          <div className="weather-place">Hyderabad, IN</div>
        </div>
      </div>
      <div className="weather-line" />
      <div className="weather-meta"><span><b>58%</b> Humidity</span><span><b>12 km/h</b> Wind</span><span><b>Sunny</b></span></div>
    </DraggableWidget>
  );
}

function WelcomeWidget({ role, roleConfig, position, onMove }) {
  return (
    <DraggableWidget className="welcome-widget" position={position} onMove={onMove}>
      <div className="sticky-tape" />
      <div className="sticky-pin">📌</div>
      <div className="sticky-title">Welcome to the Employee Onboarding System!</div>
      <p className="sticky-note">Your journey starts here. Check your tasks and let us get you set up! 🎉</p>
      <p className="sticky-sign">- The HR Team ✨</p>
      <div className="sticky-corner" />
    </DraggableWidget>
  );
}

function Overview({ metrics, cases, audit, setPage, openCase }) {
  return (
    <>
      <div className="kpi-grid g4">
        <Kpi color="blue" label="Active Cases" value={metrics.active || 0} meta={`${metrics.avgProgress || 0}% avg progress`} />
        <Kpi color="purple" label="In Progress" value={metrics.inProgress || 0} meta="Onboarding active" />
        <Kpi color="orange" label="Pending HIL" value={metrics.pendingHil || 0} meta="Approval needed" />
        <Kpi color="green" label="Completed" value={metrics.completed || 0} meta="Fully closed" />
      </div>
      <div className="g2">
        <div className="card">
          <div className="card-head">
            <div><div className="card-title">Active Pipeline</div><div className="card-sub">Realtime GET polling · scenario-rich dummy data</div></div>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage("cases")}>View All →</button>
          </div>
          <div style={{ padding: 0, maxHeight: 340, overflowY: "auto" }}>
            {cases.slice(0, 8).map((item) => <CompactCase key={item.caseId} item={item} openCase={openCase} />)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <HilStatusCard cases={cases} metrics={metrics} />
          <RecentActivity audit={audit} />
        </div>
      </div>
    </>
  );
}

function Kpi({ color, label, value, meta }) {
  return <div className={`kpi ${color}`}><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-meta">{meta}</div></div>;
}

function CompactCase({ item, openCase }) {
  const progressColor = item.st === "completed" ? "var(--success)" : item.st === "at-risk" || item.st === "blocked" ? "var(--warning)" : "var(--primary)";
  return (
    <div onClick={() => openCase?.(item)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: "1px solid var(--n8)", cursor: openCase ? "pointer" : "default" }}>
      <div className="emp-av" style={{ background: item.col, width: 28, height: 28, fontSize: 9, flexShrink: 0 }}>{item.ini}</div>
      <div style={{ minWidth: 0, flex: 1.4 }}><div className="emp-name" style={{ fontSize: 11.5 }}>{item.name}</div><div style={{ fontSize: 9.5, color: "var(--n5)" }}>{item.role}</div></div>
      <span className={`tag ${phaseTagClass(item.phase)}`} style={{ fontSize: 9, flexShrink: 0 }}>{item.phase}</span>
      <div style={{ flexShrink: 0 }}>{badge(item.st)}</div>
      <div style={{ minWidth: 80, flexShrink: 0 }}>
        <div style={{ height: 4, background: "var(--n7)", borderRadius: 2, overflow: "hidden", marginBottom: 2 }}><div style={{ height: "100%", width: `${item.prog}%`, background: progressColor, borderRadius: 2 }} /></div>
        <div style={{ fontSize: 9.5, color: "var(--n5)" }}>{item.prog}%</div>
      </div>
    </div>
  );
}

function HilStatusCard({ cases, metrics }) {
  return (
    <div className="card">
      <div className="card-head"><div className="card-title">HIL Gate Status</div><span className="tag pink">{metrics.pendingHil || 0} Pending</span></div>
      <div className="card-body np">
        {cases.filter((item) => item.backgroundVerification).slice(0, 5).map((item) => (
          <div className="hil-row" key={item.caseId}><div className="hil-row-title">{item.name}</div><div className="hil-row-desc">{item.docs} · {item.caseId}</div></div>
        ))}
      </div>
    </div>
  );
}

function RecentActivity({ audit }) {
  return (
    <div className="card">
      <div className="card-head"><div className="card-title">Recent Agent Activity</div></div>
      <div className="card-body">{audit.slice(0, 5).map((item, index) => <AuditMini key={`${item.case}-${index}`} item={item} />)}</div>
    </div>
  );
}

function Cases({ cases, openCase }) {
  return (
    <div className="card">
      <div className="card-head"><div><div className="card-title">All Active Cases</div><div className="card-sub">Read-only data fetched from backend GET endpoints</div></div></div>
      <div className="react-table-header"><span>Employee</span><span>Phase</span><span>Status</span><span>Scenario</span><span>Progress</span><span>IT</span><span>Docs</span></div>
      {cases.map((item) => <CaseRow key={item.caseId} item={item} openCase={openCase} />)}
    </div>
  );
}

function CaseRow({ item, openCase }) {
  return (
    <div onClick={() => openCase?.(item)} style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 90px 80px 80px", alignItems: "center", padding: "9px 14px", borderBottom: "1px solid var(--n8)", cursor: openCase ? "pointer" : "default" }}>
      <div className="emp"><div className="emp-av" style={{ background: item.col }}>{item.ini}</div><div><div className="emp-name">{item.name}</div><div className="emp-role">{item.dept} · {item.caseId}</div></div></div>
      <span className={`tag ${phaseTagClass(item.phase)}`}>{item.phase}</span>
      <div>{badge(item.st)}</div>
      <div style={{ fontSize: 10.5, color: "var(--n3)" }}>{item.scenario}</div>
      <div style={{ fontSize: 11, color: "var(--n3)" }}>{item.prog}%</div>
      <div style={{ fontSize: 11, color: "var(--n3)" }}>{item.it}</div>
      <div style={{ fontSize: 11, color: "var(--n3)" }}>{item.docs}</div>
    </div>
  );
}

function PreOnboard({ cases }) {
  const rows = cases.filter((item) => item.phase === "Pre-Onboarding");
  return (
    <div className="card">
      <div className="card-head">
        <div><div className="card-title">Pre-Onboarding Task Panel</div><div className="card-sub">IT provisioning · Admin prep · Candidate follow-ups</div></div>
        <span className="tag purple">{rows.length} Active</span>
      </div>
      <TaskGrid columns={[["Candidate Follow-up", rows.filter((item) => item.docs !== "Verified")], ["IT Provisioning", rows.filter((item) => item.it !== "Completed")], ["Admin Prep", rows]]} />
    </div>
  );
}

function Exceptions({ cases, gates }) {
  const rows = cases.filter((item) => ["blocked", "at-risk", "hil"].includes(item.st));
  return (
    <>
      <div className="kpi-grid g3">
        <Kpi color="red" label="Blockers" value={cases.filter((x) => x.st === "blocked").length} meta="Needs intervention" />
        <Kpi color="orange" label="At Risk" value={cases.filter((x) => x.st === "at-risk").length} meta="SLA watch" />
        <Kpi color="pink" label="HIL Pending" value={cases.filter((x) => x.st === "hil").length} meta="Awaiting review" />
      </div>
      <div className="card">
        <div className="card-head"><div className="card-title">Exception & HIL Queue</div><span className="tag pink">Requires System Action</span></div>
        {rows.map((item) => <ExceptionItem key={item.caseId} item={item} />)}
        {gates.filter((gate) => gate.decision === "pending").map((gate) => <GateException key={gate.gate_id} gate={gate} />)}
      </div>
    </>
  );
}

function PostOnboard({ cases }) {
  return <Board title="Post-Onboarding Checklist" subtitle="Joining formalities · PF · Buddy assignment" rows={cases.filter((item) => item.phase === "Post-Onboarding" || item.phase === "Completed")} />;
}

function Board({ title, subtitle, rows }) {
  return <div className="card"><div className="card-head"><div><div className="card-title">{title}</div><div className="card-sub">{subtitle}</div></div></div>{rows.map((item) => <CompactCase key={item.caseId} item={item} />)}</div>;
}

function TaskGrid({ columns }) {
  return (
    <div className="task-grid">
      {columns.map(([label, rows]) => (
        <div className="task-col" key={label}>
          <div className="task-col-label">{label}</div>
          {rows.slice(0, 6).map((item) => (
            <div className="task-item" key={`${label}-${item.caseId}`}>
              <div className="task-item-name">{item.name}</div>
              <div className="task-item-meta">{item.dept} · {item.role} · {item.caseId}</div>
              <div className="task-item-st">{badge(item.st)}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ExceptionItem({ item }) {
  const tag = item.st === "blocked" ? "blocker" : item.st === "hil" ? "hil" : "high";
  return (
    <div className="exc">
      <div className="exc-head"><span className={`exc-tag ${tag}`}>{tag}</span><span className="exc-emp">{item.name}</span></div>
      <div className="exc-type">{item.scenario}</div>
      <div className="exc-desc">{item.caseId} · {item.phase} · {item.docs} · {item.it}</div>
      <div className="exc-actions"><button className="btn-sys">Backend GET synced</button>{badge(item.st)}</div>
    </div>
  );
}

function GateException({ gate }) {
  return (
    <div className="exc">
      <div className="exc-head"><span className="exc-tag hil">HIL</span><span className="exc-emp">{gate.candidate_name}</span></div>
      <div className="exc-type">{gate.gate_type}</div>
      <div className="exc-desc">{gate.case_number} approval status: {gate.decision}. Frontend polling updates this row when HR approves or rejects.</div>
      <div className="exc-actions"><button className="btn-sys">{gate.email_sent_to || "HR approver"}</button><span className="badge hil">Pending HIL</span></div>
    </div>
  );
}

function OpsDashboard({ metrics, cases, gates }) {
  const completion = metrics.active ? Math.round(((metrics.completed || 0) / metrics.active) * 100) : 0;
  return (
    <>
      <div className="kpi-grid g4"><Kpi color="blue" label="Total Cases" value={metrics.active || 0} meta="All cohorts" /><Kpi color="green" label="Completion Rate" value={`${completion}%`} meta="Closed cases" /><Kpi color="orange" label="SLA Breaches" value={metrics.atRisk || 0} meta="Escalation required" /><Kpi color="red" label="Pending Approvals" value={metrics.pendingHil || 0} meta="HIL gates" /></div>
      <div className="g2"><AnalyticsCard title="Pipeline Health" values={{ completed: metrics.completed || 0, in_progress: metrics.inProgress || 0, at_risk: metrics.atRisk || 0, blocked: metrics.blocked || 0 }} /><HilApprovals gates={gates} cases={cases} compact /></div>
    </>
  );
}

function HilApprovals({ gates, compact = false }) {
  const pending = gates.filter((gate) => gate.decision === "pending");
  return (
    <div className="card">
      <div className="card-head"><div><div className="card-title">HIL Approval Queue</div><div className="card-sub">Email-based approve/reject statuses</div></div><span className="tag pink">{pending.length} Pending</span></div>
      <div className="card-body np">
        {(compact ? pending.slice(0, 4) : gates).map((gate) => <div className="hil-row" key={gate.gate_id}><div className="hil-row-title">{gate.candidate_name} · {gate.gate_type}</div><div className="hil-row-desc">{gate.case_number} · {gate.decision} · {gate.email_sent_to || "no email"}</div></div>)}
      </div>
    </div>
  );
}

function SlaMonitor({ cases }) {
  return (
    <>
      <div className="kpi-grid g3"><Kpi color="green" label="On Track" value={cases.filter((x) => x.slaLabel === "On Track").length} meta="Within SLA" /><Kpi color="orange" label="At Risk" value={cases.filter((x) => x.st === "at-risk").length} meta="Within breach window" /><Kpi color="red" label="Breached" value={cases.filter((x) => x.st === "blocked").length} meta="Escalation required" /></div>
      <Board title="SLA Tracking - All Cases" subtitle="Deadline and escalation overview" rows={cases} />
    </>
  );
}

function EmployeePortal({ cases }) {
  const item = pickEmployeeCase(cases);
  return (
    <div className="employee-portal">
      <EmployeeHero item={item} />
      <div className="employee-grid">
        <EmployeeJourney item={item} />
        <EmployeeStatusPanel item={item} />
      </div>
      <EmployeeReadOnlyCards item={item} />
    </div>
  );
}

function EmployeeDocs({ cases }) {
  const item = pickEmployeeCase(cases);
  return <div className="employee-portal"><EmployeeHero item={item} compact /><EmployeeReadOnlyCards item={item} focus="docs" /></div>;
}

function pickEmployeeCase(cases) {
  return cases.find((x) => x.st !== "completed") || cases[0] || {};
}

function EmployeeHero({ item, compact = false }) {
  const progress = getEmployeePipeline(item).progress;
  return (
    <section className={`employee-hero ${compact ? "compact" : ""}`}>
      <div className="employee-avatar" style={{ background: item?.col || "#5929d0" }}>{item?.ini || "NJ"}</div>
      <div className="employee-hero-main">
        <div className="employee-eyebrow">Employee Onboarding Portal</div>
        <h2>{item?.name || "New Joiner"}</h2>
        <p>{item?.role || "Candidate"} · {item?.dept || "Department"} · {item?.caseId || "Case pending"}</p>
        <div className="employee-progress-track"><div style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="employee-hero-status">
        <span className={`badge ${employeeStatusTone(item?.st)}`}>{employeeStatusLabel(item?.st)}</span>
        <strong>{progress}%</strong>
        <span>overall progress</span>
      </div>
    </section>
  );
}

function EmployeeJourney({ item }) {
  const { steps } = getEmployeePipeline(item);
  return (
    <div className="card employee-card">
      <div className="card-head"><div><div className="card-title">Onboarding Journey</div><div className="card-sub">Read-only status synced from backend</div></div></div>
      <div className="employee-timeline">
        {steps.map((step, index) => (
          <div className={`employee-step ${step.done ? "done" : step.active ? "active" : "wait"}`} key={step.label}>
            <div className="employee-step-node">{step.done ? "OK" : index + 1}</div>
            <div><strong>{step.label}</strong><span>{step.meta}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getEmployeePipeline(item = {}) {
  const docsStatus = getBackendField(item, "docs", "docsStatus", "docs_status", "documentStatus", "document_status");
  const itStatus = getBackendField(item, "it", "itStatus", "it_status", "hrmsTicketStatus", "hrms_ticket_status");
  const payrollStatus = getBackendField(item, "payrollStatus", "payroll_status", "taxStatus", "tax_status");
  const pfStatus = getBackendField(item, "pfStatus", "pf_status", "pfFormStatus", "pf_form_status");
  const bankStatus = getBackendField(item, "bankStatus", "bank_status", "bankDetailsStatus", "bank_details_status");
  const mailStatus = getBackendField(item, "onboardingMailStatus", "onboarding_mail_status", "welcomeEmailStatus", "welcome_email_status", "mailStatus", "mail_status");
  const approvalStatus = getBackendField(item, "hrApprovalStatus", "hr_approval_status", "approvalStatus", "approval_status", "hilDecision", "hil_decision");

  const docsSubmitted = isSubmittedStatus(docsStatus);
  const docsValidated = isCompleteStatus(docsStatus);
  const hrmsTicket = isStartedStatus(itStatus);
  const taxPfConfig = isCompleteStatus(payrollStatus) || normal(payrollStatus).includes("configured") || normal(pfStatus).includes("configured");
  const bankCollected = isCompleteStatus(bankStatus) || normal(bankStatus).includes("collected");
  const onboardingMail = isCompleteStatus(mailStatus) || normal(mailStatus).includes("sent");
  const pfForm = normal(pfStatus).includes("submitted") || normal(pfStatus).includes("captured") || isCompleteStatus(getBackendField(item, "pfFormStatus", "pf_form_status"));
  const hrApproved = item.st === "completed" || isCompleteStatus(approvalStatus) || normal(approvalStatus).includes("approved");

  const rawSteps = [
    { label: "Document Submission", done: docsSubmitted, meta: docsSubmitted ? "Pre-onboarding documents submitted" : "No submitted document status from backend yet" },
    { label: "Document Validation", done: docsValidated, meta: docsValidated ? "Pre-onboarding documents HR verified" : docsSubmitted ? "Awaiting HR verification" : "Waiting for submitted documents" },
    { label: "IT and HRMS Ticket Creation", done: hrmsTicket, meta: hrmsTicket ? itStatus || "Ticket status received from backend" : "No IT/HRMS ticket status from backend yet" },
    { label: "Tax and PF Configuration", done: taxPfConfig, meta: taxPfConfig ? "Tax/PF configuration completed in backend" : "No tax/PF configuration status from backend yet" },
    { label: "Bank Details Collection", done: bankCollected, meta: bankCollected ? "Bank details collected" : "No bank details collection status from backend yet" },
    { label: "Onboarding Mail", done: onboardingMail, meta: onboardingMail ? "Onboarding mail sent" : "No onboarding mail status from backend yet" },
    { label: "PF Form Filling", done: pfForm, meta: pfForm ? "PF form submitted" : "No PF form submission status from backend yet" },
    { label: "HR Approval", done: hrApproved, meta: hrApproved ? "HR approval closes onboarding loop" : "No HR approval status from backend yet" }
  ];
  const firstPending = rawSteps.findIndex((step) => !step.done);
  const steps = rawSteps.map((step, index) => ({ ...step, active: index === firstPending }));
  const progress = Math.round((steps.filter((step) => step.done).length / steps.length) * 100);
  return { steps, progress };
}

function getBackendField(item = {}, ...keys) {
  const detail = item.detail || {};
  for (const key of keys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== "") return item[key];
    if (detail[key] !== undefined && detail[key] !== null && detail[key] !== "") return detail[key];
  }
  return "";
}

function normal(value) {
  return String(value || "").toLowerCase();
}

function isSubmittedStatus(value) {
  const text = normal(value);
  if (!text || text.includes("not submitted") || text.includes("missing")) return false;
  return text.includes("submitted") || text.includes("verified") || text.includes("validated") || text.includes("approved") || text.includes("pending");
}

function isStartedStatus(value) {
  const text = normal(value);
  return Boolean(text && !text.includes("not started") && !text.includes("pending"));
}

function isCompleteStatus(value) {
  const text = normal(value);
  return ["complete", "completed", "done", "verified", "validated", "approved", "configured", "submitted", "sent", "collected", "captured", "created"].some((token) => text.includes(token));
}

function EmployeeStatusPanel({ item }) {
  const { steps } = getEmployeePipeline(item);
  const docSubmission = steps.find((step) => step.label === "Document Submission");
  const docValidation = steps.find((step) => step.label === "Document Validation");
  return (
    <div className="card employee-card">
      <div className="card-head"><div className="card-title">Current Status</div><span className={`tag ${phaseTagClass(item?.phase)}`}>{item?.phase || "Onboarding"}</span></div>
      <div className="employee-status-list">
        <InfoPill label="Case status" value={employeeStatusLabel(item?.st)} />
        <InfoPill label="Scenario" value={item?.scenario || "Normal onboarding"} />
        <InfoPill label="Document submission" value={docSubmission?.done ? "Pre-onboarding docs submitted" : "Pending"} />
        <InfoPill label="HR verification" value={docValidation?.done ? "Completed" : "Pending"} />
        <InfoPill label="IT setup" value={item?.it || "Not started"} />
      </div>
    </div>
  );
}

function InfoPill({ label, value }) {
  return <div className="employee-info-pill"><span>{label}</span><strong>{value}</strong></div>;
}

function employeeStatusLabel(status) {
  if (status === "at-risk") return "In Progress";
  return statusLabels[status] || status || "Active";
}

function employeeStatusTone(status) {
  if (status === "at-risk") return "in-progress";
  return status || "in-progress";
}

function EmployeeReadOnlyCards({ item, focus }) {
  const { steps } = getEmployeePipeline(item);
  const preDocsSubmitted = steps.find((step) => step.label === "Document Submission")?.done;
  const pfSubmitted = steps.find((step) => step.label === "PF Form Filling")?.done;
  const hrVerified = steps.find((step) => step.label === "Document Validation")?.done;
  const hrApproved = steps.find((step) => step.label === "HR Approval")?.done;
  const cards = [
    ["Document Submission", preDocsSubmitted ? `Pre-onboarding docs submitted - PF form ${pfSubmitted ? "submitted" : "pending"}` : "Pre-onboarding docs pending", preDocsSubmitted && pfSubmitted ? "good" : "wait"],
    ["Document Validation", hrVerified ? "HR verification completed" : "HR verification pending", hrVerified ? "good" : "wait"],
    ["IT Provisioning", item?.it || "Not started", item?.it === "Completed" ? "good" : item?.it?.includes("Failed") ? "bad" : "wait"],
    ["HR Review", hrApproved ? "Approved" : item?.st === "hil" ? "Pending HIL" : "In progress", hrApproved ? "good" : "wait"]
  ];
  return (
    <>
      <div className="employee-readonly-grid">
        {cards.map(([title, value, tone]) => (
          <div className={`employee-mini-card ${tone} ${focus && title.toLowerCase().includes(focus) ? "focus" : ""}`} key={title}>
            <span>{title}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <DocumentSubmissionDetails item={item} />
    </>
  );
}

function DocumentSubmissionDetails({ item }) {
  const docs = getDocumentSubmissions(item);
  return (
    <div className="card employee-doc-card">
      <div className="card-head">
        <div><div className="card-title">Submitted Documents</div><div className="card-sub">Read-only validation trail from onboarding records</div></div>
        <span className="tag purple">{docs.filter((doc) => doc.status === "Validated").length}/{docs.length} Validated</span>
      </div>
      <div className="employee-doc-table">
        <div className="employee-doc-head"><span>Document</span><span>Submitted</span><span>Timing</span><span>Validation</span></div>
        {docs.map((doc) => (
          <div className="employee-doc-row" key={doc.name}>
            <div><strong>{doc.name}</strong><small>{doc.owner}</small></div>
            <span>{doc.submittedAt}</span>
            <span className={`doc-timing ${doc.timing === "Late" ? "late" : doc.timing === "Pending" ? "pending" : "ontime"}`}>{doc.timing}</span>
            <span className={`doc-validation ${doc.status.toLowerCase()}`}>{doc.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getDocumentSubmissions(item = {}) {
  const verified = isCompleteStatus(getBackendField(item, "docs", "docsStatus", "docs_status", "documentStatus", "document_status"));
  const bankDone = isCompleteStatus(getBackendField(item, "bankStatus", "bank_status", "bankDetailsStatus", "bank_details_status"));
  const taxDone = isCompleteStatus(getBackendField(item, "payrollStatus", "payroll_status", "taxStatus", "tax_status"));
  const baseDay = Number(String(item.caseId || "1001").replace(/\D/g, "").slice(-2)) || 9;
  return [
    { name: "Identity Proof", owner: "Candidate upload", submittedAt: `Apr ${Math.max(1, baseDay - 5)}, 2026 - 09:42 AM`, timing: "On time", status: "Validated" },
    { name: "Address Proof", owner: "Candidate upload", submittedAt: `Apr ${Math.max(1, baseDay - 4)}, 2026 - 11:18 AM`, timing: "On time", status: verified ? "Validated" : "Review" },
    { name: "Education Certificates", owner: "Candidate upload", submittedAt: `Apr ${Math.max(1, baseDay - 2)}, 2026 - 04:35 PM`, timing: item.st === "blocked" ? "Late" : "On time", status: item.st === "blocked" ? "Review" : "Validated" },
    { name: "Bank Details", owner: "Payroll record", submittedAt: bankDone ? `Apr ${Math.max(1, baseDay - 1)}, 2026 - 02:10 PM` : "Not submitted", timing: bankDone ? "On time" : "Pending", status: bankDone ? "Validated" : "Pending" },
    { name: "Tax Declaration", owner: "Payroll record", submittedAt: taxDone ? `Apr ${baseDay}, 2026 - 10:05 AM` : "Not submitted", timing: taxDone ? "On time" : "Pending", status: taxDone ? "Validated" : "Pending" }
  ];
}

function ItQueue({ cases }) {
  return <><div className="kpi-grid g3"><Kpi color="orange" label="Pending Requests" value={cases.filter((x) => x.it !== "Completed").length} meta="IT queue" /><Kpi color="blue" label="In Progress" value={cases.filter((x) => x.it.includes("Progress") || x.it.includes("Queue")).length} meta="Active config" /><Kpi color="red" label="Blocked" value={cases.filter((x) => x.it.includes("Failed") || x.st === "blocked").length} meta="Needs review" /></div><Board title="IT Provisioning Queue" subtitle="Laptop, email, access" rows={cases} /></>;
}

function ItActive({ cases }) {
  return <Board title="Active Provisioning Tasks" subtitle="Currently in progress by IT Support" rows={cases.filter((x) => x.it !== "Completed" && x.st !== "completed")} />;
}

function ItDone({ cases }) {
  return <Board title="Completed Provisioning" subtitle="Provisioning completed this week" rows={cases.filter((x) => x.it === "Completed" || x.prog > 85)} />;
}

function AdminTasks({ cases }) {
  const active = cases.filter((x) => x.phase !== "Completed");
  return <><div className="kpi-grid g3"><Kpi color="orange" label="Pending Tasks" value={active.length} meta="Desk + ID cards" /><Kpi color="blue" label="Joining This Week" value={cases.filter((x) => x.phase === "Pre-Onboarding").length} meta="Prep needed" /><Kpi color="green" label="Completed" value={cases.filter((x) => x.st === "completed").length} meta="This month" /></div><div className="card"><div className="card-head"><div className="card-title">Admin Task Board</div><span className="tag orange">{active.length} Pending</span></div><TaskGrid columns={[["Desk Allocation", cases.slice(0, 6)], ["ID Card Preparation", cases.filter((item) => item.prog < 90).slice(0, 6)], ["Access Card", cases.filter((item) => item.phase !== "Pre-Onboarding" || item.prog > 20).slice(0, 6)]]} /></div></>;
}

function AdminDesk({ cases }) {
  return <Board title="Desk Assignment Status" subtitle="Desk allocation tracker" rows={cases} />;
}

function AdminId({ cases }) {
  return <Board title="ID Card Status" subtitle="Card printing and access activation" rows={cases.filter((x) => x.phase !== "Pre-Onboarding" || x.prog > 20)} />;
}

function Analytics({ analytics }) {
  const status = analytics.byStatus || {};
  const phase = analytics.byPhase || {};
  const bg = analytics.byBackgroundVerification || {};
  const risks = analytics.topRisks || [];
  const completed = status.completed || 0;
  const total = Object.values(status).reduce((sum, value) => sum + value, 0) || 1;
  const completionRate = Math.round((completed / total) * 100);
  return (
    <div className="reports-page">
      <div className="reports-hero">
        <div>
          <div className="reports-kicker">Live Analytics</div>
          <div className="reports-title">Onboarding Performance</div>
          <div className="reports-sub">Pipeline health, verification mix, risk and phase movement from backend GET data.</div>
        </div>
        <div className="reports-donut" style={{ "--pct": `${completionRate * 3.6}deg` }}>
          <div><strong>{completionRate}%</strong><span>complete</span></div>
        </div>
      </div>
      <div className="reports-grid">
        <VisualBars title="Status Distribution" values={status} />
        <VisualBars title="Phase Movement" values={phase} palette="phase" />
        <PieLegend title="Document Validation" values={bg} />
        <DepartmentChart values={analytics.byDepartment || {}} />
        <RiskTimeline risks={risks} />
      </div>
    </div>
  );
}

function AnalyticsCard({ title, values }) {
  const total = Object.values(values).reduce((sum, value) => sum + value, 0) || 1;
  return <div className="card"><div className="card-head"><div className="card-title">{title}</div></div><div className="card-body">{Object.entries(values).map(([key, value]) => <div key={key} style={{ marginBottom: 10 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}><span>{key.replaceAll("_", " ")}</span><strong>{value}</strong></div><div className="analytics-bar"><div className="analytics-fill" style={{ width: `${(value / total) * 100}%` }} /></div></div>)}</div></div>;
}

function VisualBars({ title, values, palette = "status" }) {
  const total = Object.values(values).reduce((sum, value) => sum + value, 0) || 1;
  return (
    <div className="card report-card">
      <div className="card-head"><div className="card-title">{title}</div></div>
      <div className="report-bars">
        {Object.entries(values).map(([key, value], index) => (
          <div className="report-bar-row" key={key}>
            <div className="report-bar-label"><span>{key.replaceAll("_", " ")}</span><strong>{value}</strong></div>
            <div className="report-bar-track"><div className={`report-bar-fill ${palette}-${index}`} style={{ width: `${(value / total) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PieLegend({ title, values }) {
  const entries = Object.entries(values);
  const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1;
  let cursor = 0;
  const stops = entries.map(([key, value], index) => {
    const start = cursor;
    const end = cursor + (value / total) * 360;
    cursor = end;
    return `var(--pie-${index}) ${start}deg ${end}deg`;
  }).join(", ");
  return (
    <div className="card report-card">
      <div className="card-head"><div className="card-title">{title}</div></div>
      <div className="pie-wrap">
        <div className="pie-chart" style={{ background: `conic-gradient(${stops || "var(--n7) 0deg 360deg"})` }}><span>{total}</span></div>
        <div className="pie-legend">
          {entries.map(([key, value], index) => <div key={key}><span className={`pie-dot pie-${index}`} />{key.replaceAll("_", " ")}<strong>{value}</strong></div>)}
        </div>
      </div>
    </div>
  );
}

function DepartmentChart({ values }) {
  const max = Math.max(...Object.values(values), 1);
  return (
    <div className="card report-card">
      <div className="card-head"><div className="card-title">Department Load</div></div>
      <div className="dept-chart">
        {Object.entries(values).map(([key, value]) => <div className="dept-col" key={key}><div className="dept-bar" style={{ height: `${Math.max(10, (value / max) * 100)}%` }} /><span>{key.slice(0, 3)}</span><strong>{value}</strong></div>)}
      </div>
    </div>
  );
}

function RiskTimeline({ risks }) {
  return (
    <div className="card report-card report-wide">
      <div className="card-head"><div className="card-title">Risk Timeline</div><span className="tag orange">{risks.length} Watchlist</span></div>
      <div className="risk-timeline">
        {risks.map((item, index) => (
          <div className="risk-step" key={item.caseId}>
            <div className="risk-node">{index + 1}</div>
            <div><div className="emp-name">{item.name}</div><div className="emp-role">{item.caseId} · {item.scenario}</div></div>
            {badge(item.st)}
          </div>
        ))}
      </div>
    </div>
  );
}

function Audit({ audit }) {
  return <div className="card"><div className="card-head"><div className="card-title">Audit Log</div></div><div className="card-body np">{audit.map((item, index) => <AuditRow key={`${item.case}-${index}`} item={item} />)}</div></div>;
}

function AuditMini({ item }) {
  return <div className="ma-item"><div className="ma-time">{item.ts}</div><span className={`al-dot ${item.dot || "p"}`} /><div className="ma-text"><strong>{item.emp}</strong> · {item.ev}</div></div>;
}

function AuditRow({ item }) {
  return <div style={{ display: "flex", gap: 10, padding: "9px 16px", borderBottom: "1px solid var(--n8)", alignItems: "flex-start" }}><div style={{ fontSize: 9.5, color: "var(--n5)", minWidth: 46 }}>{item.ts}</div><span className={`al-dot ${item.dot || "p"}`} /><div style={{ flex: 1 }}><div style={{ fontSize: 11.5, fontWeight: 600 }}>{item.emp} · {item.case}</div><div style={{ fontSize: 10.5, color: "var(--n4)" }}>{item.ev} [{item.rule}]</div></div><span className="tag purple">{item.out || item.phase}</span></div>;
}

function WorkflowCard({ title, items }) {
  return <div className="card"><div className="card-head"><div className="card-title">{title}</div></div><div className="workflow-list">{items.map((item, index) => <div className="workflow-step" key={item}><div className="workflow-step-num">{index + 1}</div><div><div className="emp-name">{item}</div><div className="emp-role">Fetched as read-only workflow metadata</div></div></div>)}</div></div>;
}

function Reports({ analytics }) {
  return <Analytics analytics={analytics} />;
}

function CaseModal({ item, onClose }) {
  return <div className="modal-wrap open" onClick={onClose}><div className="modal" onClick={(event) => event.stopPropagation()}><div className="modal-head"><div className="modal-head-ic">□</div><div style={{ flex: 1 }}><div className="modal-title">{item.name} - Case Detail</div><div className="modal-sub">{item.caseId} · {item.phase} · {item.role}</div></div><button className="modal-close" onClick={onClose}>x</button></div><div className="modal-body"><div className="g2"><InfoBox title="Summary" rows={[["Employee ID", item.id], ["Department", item.dept], ["Scenario", item.scenario], ["SLA", item.slaLabel]]} /><InfoBox title="Status" rows={[["Case Status", statusLabels[item.st] || item.st], ["IT", item.it], ["Documents", item.docs], ["Risk Score", item.riskScore]]} /></div></div><div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Close</button></div></div></div>;
}

function EmbeddedAppWindow({ app, onClose }) {
  return (
    <div className="embedded-app-window">
      <div className="embedded-app-titlebar">
        <div className="win-controls">
          <button className="win-dot close react-shell-button" onClick={onClose} aria-label={`Close ${app.label}`}><span className="dot-sym">x</span></button>
          <button className="win-dot min react-shell-button" onClick={onClose} aria-label={`Minimize ${app.label}`}><span className="dot-sym">-</span></button>
          <span className="win-dot max"><span className="dot-sym">+</span></span>
        </div>
        <div className="embedded-app-title"><OfficeIcon type={app.key} />{app.label}</div>
      </div>
      <div className="embedded-app-body">
        <OfficeAppPreview app={app} />
      </div>
    </div>
  );
}

function OfficeAppPreview({ app }) {
  const rows = {
    outlook: ["Welcome email queued for new joiners", "Document validation update received", "IT provisioning reminder sent"],
    calendar: ["09:30 HR onboarding sync", "11:00 IT provisioning review", "15:00 New joiner welcome call"],
    teams: ["HR Ops: HIL approval pending", "IT Support: Laptop allocation updated", "Admin Team: Desk 7A reserved"],
    excel: ["Active cases: 22", "Pending HIL: 3", "Average progress: 53%"]
  };
  return (
    <div className={`office-preview ${app.key}`}>
      <div className="office-preview-hero">
        <OfficeIcon type={app.key} />
        <div>
          <div className="office-preview-title">{app.label}</div>
          <div className="office-preview-sub">Embedded workspace preview</div>
        </div>
        <a className="btn btn-primary btn-sm" href={app.href} target="_blank" rel="noreferrer">Open Microsoft {app.label}</a>
      </div>
      <div className="office-preview-list">
        {rows[app.key].map((row, index) => (
          <div className="office-preview-row" key={row}>
            <span className="office-preview-dot">{index + 1}</span>
            <span>{row}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoBox({ title, rows }) {
  return <div style={{ background: "var(--n8)", borderRadius: "var(--r-md)", padding: 14 }}><div className="f-section">{title}</div>{rows.map(([key, value]) => <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px solid var(--n7)" }}><span style={{ color: "var(--n4)" }}>{key}</span><span style={{ fontWeight: 600 }}>{value}</span></div>)}</div>;
}

function Statusbar({ audit, source, role, count }) {
  const latest = audit[0];
  return <div className="win-statusbar"><div className="sb-item"><div className="sb-dot green" /><span>System Ready</span></div><div className="sb-divider" /><div className="sb-item"><span>{source || "loading"} data source</span></div><div className="sb-right"><span>{count} cases active</span><div className="sb-divider" /><span>{role}</span><div className="sb-divider" /><span>{latest ? `${latest.ts} - ${latest.ev.slice(0, 35)}` : "Waiting for data"}</span></div></div>;
}

const OFFICE_APPS = [
  { label: "Outlook", key: "outlook", href: "https://outlook.office.com/mail/" },
  { label: "Calendar", key: "calendar", href: "https://outlook.office.com/calendar/" },
  { label: "Teams", key: "teams", href: "https://teams.microsoft.com/" },
  { label: "Excel", key: "excel", href: "https://www.office.com/launch/excel" }
];

function OfficeIcon({ type }) {
  if (type === "outlook") {
    return <svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="8" width="30" height="32" rx="6" fill="#0078D4" /><path d="M20 16h16v16H20z" fill="#28A8EA" /><path d="M20 24 36 16v16L20 24Z" fill="#50D9FF" opacity=".75" /><rect x="4" y="13" width="24" height="24" rx="4" fill="#0078D4" /><circle cx="16" cy="25" r="6" fill="#fff" /><circle cx="16" cy="25" r="3" fill="#0078D4" /></svg>;
  }
  if (type === "calendar") {
    return <svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="8" width="34" height="33" rx="6" fill="#2563EB" /><path d="M7 14c0-3.3 2.7-6 6-6h22c3.3 0 6 2.7 6 6v6H7v-6Z" fill="#fff" /><path d="M14 27h20M14 33h13" stroke="#fff" strokeWidth="3" strokeLinecap="round" /><text x="24" y="18" textAnchor="middle" fontSize="9" fontWeight="900" fill="#2563EB">31</text></svg>;
  }
  if (type === "teams") {
    return <svg viewBox="0 0 48 48" aria-hidden="true"><rect x="13" y="12" width="28" height="25" rx="6" fill="#6264A7" /><circle cx="34" cy="11" r="5" fill="#7B83EB" /><circle cx="38" cy="22" r="4" fill="#7B83EB" /><rect x="4" y="15" width="24" height="22" rx="4" fill="#4B53BC" /><path d="M10 21h13v3h-5v10h-3V24h-5v-3Z" fill="#fff" /></svg>;
  }
  return <svg viewBox="0 0 48 48" aria-hidden="true"><rect x="12" y="8" width="29" height="32" rx="5" fill="#21A366" /><path d="M25 13h11v6H25v-6Zm0 8h11v6H25v-6Zm0 8h11v6H25v-6Z" fill="#fff" opacity=".65" /><rect x="5" y="13" width="24" height="24" rx="4" fill="#107C41" /><path d="m11 20 4 5-4 6h4l2-3 2 3h4l-4-6 4-5h-4l-2 3-2-3h-4Z" fill="#fff" /></svg>;
}

function Taskbar({ roleConfig, role, clock, onRoleClick, onStartClick, windowMode, onOpenOfficeApp }) {
  return (
    <div className="taskbar">
      <button className={`tb-start react-shell-button ${windowMode !== "open" ? "needs-restore" : ""}`} data-tip="Dashboard" onClick={onStartClick}>
        <div className="tb-logo-mark">
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3.5 10.2 10 4.4l6.5 5.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5.2 9.2v6.3h3.2v-3.4h3.2v3.4h3.2V9.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
      <div className="tb-sep" />
      <div className="tb-nav">
        {OFFICE_APPS.map((item) => (
          <button key={item.key} className="tb-office-icon react-shell-button" data-tip={`Open ${item.label}`} onClick={() => onOpenOfficeApp(item)}>
            <OfficeIcon type={item.key} />
          </button>
        ))}
      </div>
      <div className="tb-right"><div className="tb-clock"><div>{clock.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div><div className="tb-clock-sub">{clock.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</div></div><button className="tb-profile-btn react-shell-button" data-tip={`Role: ${role}`} onClick={onRoleClick} style={{ background: roleConfig.color }}><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.7" /><path d="M4.8 16c.9-3.2 2.7-4.7 5.2-4.7s4.3 1.5 5.2 4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></button></div>
    </div>
  );
}

export default App;

