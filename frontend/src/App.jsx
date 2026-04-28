import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import HRDashboard from "./components/HRDashboard.jsx";
import CasesTable from "./components/CasesTable.jsx";
import ExceptionQueue from "./components/ExceptionQueue.jsx";
import PreOnboardPanel from "./components/PreOnboardPanel.jsx";
import PostOnboardPanel from "./components/PostOnboardPanel.jsx";
import AuditPanel from "./components/AuditPanel.jsx";
import ReportsPage from "./components/ReportsPage.jsx";
import EmployeeView from "./components/EmployeeView.jsx";
import ITSupportView from "./components/ITSupportView.jsx";
import AdminView from "./components/AdminView.jsx";

const ROLE_CONFIG = {
  "HR Coordinator": {
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
    nav: [
      { label: "My Portal", icon: "M", page: "emp-portal" },
      { label: "Documents", icon: "D", page: "emp-docs" }
    ],
    defaultPage: "emp-portal"
  },
  "IT Support": {
    nav: [
      { label: "Queue", icon: "Q", page: "it-queue", badgeKey: "itQueue" },
      { label: "Active", icon: "A", page: "it-active" },
      { label: "Completed", icon: "C", page: "it-done" }
    ],
    defaultPage: "it-queue"
  },
  "Admin Team": {
    nav: [
      { label: "Task Board", icon: "T", page: "admin-tasks", badgeKey: "adminTasks" },
      { label: "Desks", icon: "D", page: "admin-desk" },
      { label: "ID Cards", icon: "I", page: "admin-id" }
    ],
    defaultPage: "admin-tasks"
  }
};

const ROUTE_BASE = "/dana-aegis-fe";
const DESKTOP_ROUTE = `${ROUTE_BASE}/`;
const PAGE_TO_ROUTE = {
  overview: "/hr/dashboard",
  cases: "/hr/cases",
  preonboard: "/hr/pre-onboard",
  exceptions: "/hr/exceptions",
  post: "/hr/post-onboard",
  audit: "/hr/audit",
  reports: "/hr/reports",
  "ops-dashboard": "/ops/dashboard",
  "hil-approvals": "/ops/approvals",
  sla: "/ops/sla",
  "emp-portal": "/employee/portal",
  "emp-docs": "/employee/documents",
  "it-queue": "/it/queue",
  "it-active": "/it/active",
  "it-done": "/it/completed",
  "admin-tasks": "/admin/tasks",
  "admin-desk": "/admin/desks",
  "admin-id": "/admin/id-cards"
};
const ROLE_PAGE_ROUTES = {
  "HR Coordinator": {
    overview: "/hr/dashboard",
    cases: "/hr/cases",
    preonboard: "/hr/pre-onboard",
    exceptions: "/hr/exceptions",
    post: "/hr/post-onboard",
    audit: "/hr/audit",
    reports: "/hr/reports"
  },
  "HR Ops Manager": {
    "ops-dashboard": "/ops/dashboard",
    "hil-approvals": "/ops/approvals",
    exceptions: "/ops/exceptions",
    sla: "/ops/sla",
    audit: "/ops/audit",
    reports: "/ops/reports"
  },
  "Onboarding Employee": {
    "emp-portal": "/employee/portal",
    "emp-docs": "/employee/documents"
  },
  "IT Support": {
    "it-queue": "/it/queue",
    "it-active": "/it/active",
    "it-done": "/it/completed"
  },
  "Admin Team": {
    "admin-tasks": "/admin/tasks",
    "admin-desk": "/admin/desks",
    "admin-id": "/admin/id-cards"
  }
};
const ROUTE_TO_STATE = Object.fromEntries(
  Object.entries(ROLE_PAGE_ROUTES).flatMap(([roleName, routes]) =>
    Object.entries(routes).map(([page, route]) => [route, { page, role: roleName }])
  )
);
const LEGACY_ROUTE_TO_STATE = {
  "/dashboard": { page: "overview", role: "HR Coordinator" },
  "/cases": { page: "cases", role: "HR Coordinator" },
  "/pre-onboard": { page: "preonboard", role: "HR Coordinator" },
  "/exceptions": { page: "exceptions", role: "HR Coordinator" },
  "/post-onboard": { page: "post", role: "HR Coordinator" },
  "/audit": { page: "audit", role: "HR Coordinator" },
  "/reports": { page: "reports", role: "HR Coordinator" },
  "/approvals": { page: "hil-approvals", role: "HR Ops Manager" },
  "/sla": { page: "sla", role: "HR Ops Manager" }
};

const PAGE_META = {
  overview: ["HR Coordinator - Dashboard", "Pipeline health · Active cases · Lifecycle overview"],
  cases: ["All Active Cases", "Full lifecycle view · employees"],
  preonboard: ["Pre-Onboarding Panel", "IT provisioning · Admin prep · Candidate follow-ups"],
  "portal-public": ["Employee Status Portal", "Secure direct-link case view"],
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
  in_progress: "In Progress",
  pending: "Pending",
  not_started: "Not Started",
  submitted: "Submitted",
  validated: "Validated",
  rejected: "Rejected",
  sent: "Sent",
  "at-risk": "At Risk",
  blocked: "Blocked",
  hil: "Pending HIL"
};

function badge(status) {
  return <span className={`badge ${status}`}>{statusLabels[status] || formatStatusLabel(status)}</span>;
}

function formatDateTime(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatReminderType(value = "") {
  return String(value)
    .replace("t_minus_", "T-")
    .replace("t_plus_", "T+")
    .replace(/_/g, " ")
    .toUpperCase();
}

function formatTaskType(value = "") {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatStatusLabel(value = "") {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatHoursLeft(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "Unknown";
  if (numeric <= 0) return "0h left";
  if (numeric < 1) return `${Math.max(1, Math.round(numeric * 60))}m left`;
  return `${numeric.toFixed(numeric >= 10 ? 0 : 1)}h left`;
}

function hoursBetween(from, to) {
  if (!(from instanceof Date) || !(to instanceof Date)) return null;
  const diff = (to.getTime() - from.getTime()) / 36e5;
  if (!Number.isFinite(diff)) return null;
  return diff;
}

function sumFollowUpStatuses(items = []) {
  return items.reduce((acc, item) => {
    const key = item.sent_at ? "sent" : (item.response_status || "pending").toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function groupByCase(rows = []) {
  return rows.reduce((acc, item) => {
    const key = item.case_number || item.employee_id || "Unknown case";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function locationStateFromPath(pathname) {
  const fallback = { page: ROLE_CONFIG["HR Coordinator"].defaultPage, role: "HR Coordinator", portalToken: "" };
  if (typeof window === "undefined") return fallback;
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (!normalized.startsWith(ROUTE_BASE)) return fallback;
  const route = normalized.slice(ROUTE_BASE.length) || "/hr/dashboard";
  if (route.startsWith("/portal/")) {
    return {
      page: "portal-public",
      role: "Onboarding Employee",
      portalToken: decodeURIComponent(route.slice("/portal/".length))
    };
  }
  const routeState = ROUTE_TO_STATE[route] || LEGACY_ROUTE_TO_STATE[route] || fallback;
  return { ...routeState, portalToken: "" };
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

function routeStateFromLocation() {
  return locationStateFromPath(typeof window === "undefined" ? "/" : window.location.pathname);
}

function pageFromLocation() {
  return routeStateFromLocation().page;
}

function roleFromLocation() {
  return routeStateFromLocation().role;
}

function portalTokenFromLocation() {
  return routeStateFromLocation().portalToken || "";
}

function isDesktopLocation() {
  if (typeof window === "undefined") return false;
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  return pathname === ROUTE_BASE;
}

function initialWindowMode() {
  return isDesktopLocation() ? "minimized" : "open";
}

function routeForPage(page, roleName = roleForPage(page)) {
  if (page === "portal-public") {
    const token = portalTokenFromLocation();
    return `${ROUTE_BASE}/portal/${encodeURIComponent(token || "token")}`;
  }
  const roleRoutes = ROLE_PAGE_ROUTES[roleName] || {};
  const route = roleRoutes[page] || PAGE_TO_ROUTE[page] || PAGE_TO_ROUTE.overview;
  return `${ROUTE_BASE}${route}`;
}

function roleForPage(page) {
  return Object.entries(ROLE_CONFIG).find(([, config]) =>
    config.nav.some((item) => item.page === page)
  )?.[0] || "HR Coordinator";
}

function syncRoute(page, roleName, replace = false, portalToken = "") {
  if (typeof window === "undefined") return;
  const nextPath = page === "portal-public"
    ? `${ROUTE_BASE}/portal/${encodeURIComponent(portalToken || portalTokenFromLocation() || "token")}`
    : routeForPage(page, roleName);
  if (window.location.pathname === nextPath) return;
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({ page, role: roleName }, "", `${nextPath}${window.location.search}`);
}

function syncDesktopRoute(replace = false) {
  if (typeof window === "undefined") return;
  if (window.location.pathname === DESKTOP_ROUTE) return;
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({ desktop: true }, "", `${DESKTOP_ROUTE}${window.location.search}`);
}

function App() {
  const locationState = routeStateFromLocation();
  const [page, setPage] = useState(locationState.page);
  const [role, setRole] = useState(locationState.role);
  const [portalToken, setPortalToken] = useState(locationState.portalToken || "");
  const [roleOpen, setRoleOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(true);
  const [windowMode, setWindowMode] = useState(initialWindowMode);
  const [isMaximized, setIsMaximized] = useState(false);
  const [widgetPositions, setWidgetPositions] = useState(getDefaultWidgetPositions);
  const [data, setData] = useState(null);
  const [portalCase, setPortalCase] = useState(null);
  const [portalLoading, setPortalLoading] = useState(Boolean(locationState.portalToken));
  const [portalError, setPortalError] = useState("");
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
    let ignore = false;
    async function loadPortalCase() {
      if (!portalToken) {
        setPortalCase(null);
        setPortalError("");
        setPortalLoading(false);
        return;
      }
      setPortalLoading(true);
      try {
        const next = await api.caseDetail(portalToken);
        if (!ignore) {
          setPortalCase(next);
          setPortalError("");
        }
      } catch (err) {
        if (!ignore) {
          setPortalCase(null);
          setPortalError(err.message);
        }
      } finally {
        if (!ignore) setPortalLoading(false);
      }
    }
    loadPortalCase();
    return () => {
      ignore = true;
    };
  }, [portalToken]);

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

  useEffect(() => {
    if (windowMode === "open") {
      syncRoute(page, role, true);
    } else {
      syncDesktopRoute(true);
    }
    function handlePopState() {
      const nextState = routeStateFromLocation();
      setPage(nextState.page);
      setRole(nextState.role);
      setPortalToken(nextState.portalToken || "");
      setWindowMode(isDesktopLocation() ? "minimized" : "open");
      setNavOpen(false);
      setRoleOpen(false);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const metrics = data?.metrics || {};
  const cases = data?.cases || [];
  const audit = data?.audit || [];
  const profiles = data?.profiles || [];
  const preOnboardingTasks = data?.preOnboardingTasks || [];
  const roleConfigs = useMemo(() => buildRoleConfigs(profiles, cases), [profiles, cases]);
  const currentRole = roleConfigs[role] || ROLE_CONFIG[role];
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
    const nextPage = roleConfigs[nextRole].defaultPage;
    setPage(nextPage);
    setPortalToken("");
    syncRoute(nextPage, nextRole);
    setRoleOpen(false);
    setNavOpen(false);
    setWindowMode("open");
  }

  function closeWindow() {
    setWindowMode("closed");
    syncDesktopRoute();
    setRoleOpen(false);
    setNavOpen(false);
  }

  function minimizeWindow() {
    if (isMaximized) {
      setIsMaximized(false);
      setWindowMode("open");
      syncRoute(page, role);
      return;
    }
    setWindowMode("minimized");
    syncDesktopRoute();
    setRoleOpen(false);
    setNavOpen(false);
  }

  function toggleMaximizeWindow() {
    setWindowMode("open");
    syncRoute(page, role);
    setIsMaximized((value) => !value);
  }

  function restoreWindow() {
    setWindowMode("open");
    syncRoute(page, role);
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
    syncRoute(nextPage, role);
    setWindowMode("open");
    setNavOpen(false);
  }

  async function openCaseDetail(item) {
    setSelectedCase(item);
    try {
      const detail = await api.caseDetail(item.caseId || item.id);
      setSelectedCase({ ...item, ...detail });
    } catch (err) {
      setSelectedCase(item);
    }
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
                    {!data && !error && <LoadingShell />}
                    {data && <PageRenderer page={page} data={data} cases={cases} metrics={metrics} audit={audit} openCase={openCaseDetail} setPage={setPage} portalCase={portalCase} portalToken={portalToken} portalLoading={portalLoading} portalError={portalError} preOnboardingTasks={preOnboardingTasks} />}
                  </main>
                </div>
              </div>
              <Statusbar audit={audit} source={data?.source} role={role} count={cases.length} />
            </div>
            <LiveCommentary open={liveOpen} role={role} audit={audit} cases={cases} gates={data?.hil_gates || []} />
          </div>
        </div>
      </div>
      <Taskbar roleConfig={currentRole} role={role} clock={clock} onRoleClick={toggleRoleMenu} onStartClick={restoreWindow} windowMode={windowMode} onOpenOfficeApp={setEmbeddedApp} />
      {roleOpen && <RoleDropdown role={role} roleConfigs={roleConfigs} switchRole={switchRole} />}
      {embeddedApp && <EmbeddedAppWindow app={embeddedApp} onClose={() => setEmbeddedApp(null)} />}
      {selectedCase && <CaseModal item={selectedCase} onClose={() => setSelectedCase(null)} />}
    </div>
  );
}

function buildRoleConfigs(profiles, cases) {
  const profileByRole = new Map((profiles || []).map((profile) => [profile.role, profile]));
  const employeeCase = pickEmployeeCase(cases);
  return Object.fromEntries(Object.entries(ROLE_CONFIG).map(([roleName, config]) => {
    const profile = roleName === "Onboarding Employee" && employeeCase?.name
      ? {
          name: employeeCase.name,
          initials: employeeCase.ini || initialsFromDisplayName(employeeCase.name, "NA"),
          color: employeeCase.col
        }
      : profileByRole.get(roleName);
    return [roleName, {
      ...config,
      color: profile?.color || "var(--primary)",
      initials: profile?.initials || initialsFromDisplayName(profile?.name || roleName, "NA"),
      name: profile?.name || roleName
    }];
  }));
}

function initialsFromDisplayName(name, fallback = "NJ") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function PageRenderer({ page, data, cases, metrics, audit, openCase, setPage, portalCase, portalToken, portalLoading, portalError }) {
  if (page === "overview") return <HRDashboard metrics={metrics} cases={cases} audit={audit} onViewAllCases={() => setPage("cases")} onOpenCase={openCase} />;
  if (page === "cases") return <CasesTable cases={cases} onOpenCase={openCase} />;
  if (page === "preonboard") return <PreOnboardPanel tasks={data.preOnboardingTasks || []} followUps={data.followUps || []} />;
  if (page === "portal-public") return <EmployeeView mode="public" item={portalCase} token={portalToken} loading={portalLoading} error={portalError} />;
  if (page === "exceptions") return <ExceptionQueue cases={cases} gates={data.hil_gates} />;
  if (page === "post") return <PostOnboardPanel cases={cases} />;
  if (page === "audit") return <AuditPanel audit={audit} />;
  if (page === "reports") return <ReportsPage analytics={data.analytics} />;
  if (page === "ops-dashboard") return <OpsDashboard metrics={metrics} cases={cases} gates={data.hil_gates} />;
  if (page === "hil-approvals") return <HilApprovals gates={data.hil_gates} cases={cases} />;
  if (page === "sla") return <SlaMonitor cases={cases} gates={data.hil_gates} />;
  if (page === "emp-portal") return <EmployeeView mode="portal" cases={cases} />;
  if (page === "emp-docs") return <EmployeeView mode="docs" cases={cases} />;
  if (page === "it-queue") return <ITSupportView mode="queue" cases={cases} />;
  if (page === "it-active") return <ITSupportView mode="active" cases={cases} />;
  if (page === "it-done") return <ITSupportView mode="done" cases={cases} />;
  if (page === "admin-tasks") return <AdminView mode="tasks" cases={cases} />;
  if (page === "admin-desk") return <AdminView mode="desk" cases={cases} />;
  if (page === "admin-id") return <AdminView mode="id" cases={cases} />;
  return <HRDashboard metrics={metrics} cases={cases} audit={audit} onViewAllCases={() => setPage("cases")} onOpenCase={openCase} />;
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

function RoleDropdown({ role, roleConfigs, switchRole }) {
  return (
    <div className="role-dropdown open" id="role-dropdown">
      <div className="role-dd-head"><div className="role-dd-title">Switch Role</div></div>
      {Object.entries(roleConfigs).map(([name, config]) => (
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

function LiveCommentary({ open, role, audit, cases, gates }) {
  const events = buildLiveCommentaryEvents(role, audit, cases, gates);

  return (
    <aside className={`lc-panel ${open ? "open" : ""}`} id="lc-panel">
      <div className="lc-head">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,.8)" strokeWidth="1.4" /><circle cx="7" cy="7" r="2.5" fill="white" opacity=".9" /><circle cx="7" cy="7" r="1" fill="rgba(220,38,38,1)" /></svg>
        <div className="lc-head-title">Agent Live Commentary</div>
        <div className="lc-live-pill">LIVE</div>
      </div>
      <div className="lc-scroll">
        <div className="lc-feed">
          {events.length === 0 && (
            <div className="lc-empty">No live records returned by the database yet.</div>
          )}
          {events.map((event) => (
            <div className="lc-ev new" style={{ "--evc": event.color }} key={event.id}>
              <div className="lc-ev-ts"><span className={`lc-tag ${event.type}`}>{event.type}</span><span>{event.time}</span></div>
              <div className="lc-ev-text">{event.text}</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function buildLiveCommentaryEvents(role, audit = [], cases = [], gates = []) {
  const scopedCases = filterCasesForRole(role, cases);
  const scopedCaseKeys = new Set(scopedCases.flatMap((item) => [item.caseId, item.id, item.employee_id].filter(Boolean)));
  const employeeCase = role === "Onboarding Employee" ? pickEmployeeCase(cases) : null;
  const employeeKeys = new Set([employeeCase?.caseId, employeeCase?.id, employeeCase?.employee_id, employeeCase?.name].filter(Boolean));

  const auditEvents = audit
    .filter((item) => {
      if (role === "Onboarding Employee") return employeeKeys.has(item.case) || employeeKeys.has(item.emp);
      if (!scopedCaseKeys.size) return true;
      return !item.case || scopedCaseKeys.has(item.case);
    })
    .slice(0, 8)
    .map((item, index) => ({
      id: `audit-${item.case || "system"}-${item.ts || index}-${index}`,
      type: liveTypeFromAudit(item),
      color: liveColorFromAudit(item),
      time: item.ts || item.created_at || "",
      text: [item.emp, item.case, item.phase, item.ev, item.out].filter(Boolean).join(" · ")
    }));

  const hilEvents = gates
    .filter((item) => {
      if (role === "Onboarding Employee") return employeeKeys.has(item.case_number) || employeeKeys.has(item.employee_id) || employeeKeys.has(item.candidate_name);
      if (role === "IT Support" || role === "Admin Team") return false;
      return !scopedCaseKeys.size || scopedCaseKeys.has(item.case_number) || scopedCaseKeys.has(item.employee_id);
    })
    .slice(0, 5)
    .map((item, index) => ({
      id: `hil-${item.gate_id || item.case_number || index}`,
      type: item.decision === "pending" ? "hil" : "audit",
      color: item.decision === "pending" ? "#CF008B" : "#0E766E",
      time: item.decided_at || item.email_sent_at || item.token_expires_at || "",
      text: [item.candidate_name, item.case_number, item.gate_type, item.decision, item.flag_description, item.email_sent_to].filter(Boolean).join(" · ")
    }));

  const caseEvents = scopedCases
    .slice(0, 8)
    .map((item, index) => ({
      id: `case-${item.caseId || item.id || index}`,
      type: liveTypeFromCase(item),
      color: item.col || liveColorFromCase(item),
      time: item.join || item.updated_at || item.created_at || "",
      text: [item.name, item.caseId, item.phase, statusLabels[item.st] || item.st, `${item.prog || 0}%`, item.docs, item.it, item.slaLabel].filter(Boolean).join(" · ")
    }));

  return [...auditEvents, ...hilEvents, ...caseEvents].slice(0, 16);
}

function filterCasesForRole(role, cases = []) {
  if (role === "Onboarding Employee") {
    const employeeCase = pickEmployeeCase(cases);
    return employeeCase?.caseId || employeeCase?.id ? [employeeCase] : [];
  }
  if (role === "HR Ops Manager") {
    return cases.filter((item) => item.st === "hil" || item.st === "at-risk" || item.st === "blocked");
  }
  if (role === "IT Support") {
    return cases.filter((item) => item.it && item.it !== "Completed" && item.it !== "Provisioned");
  }
  if (role === "Admin Team") {
    return cases.filter((item) => item.phase === "Pre-Onboarding" || item.phase === "Onboarding");
  }
  return cases;
}

function liveTypeFromAudit(item = {}) {
  const value = `${item.ev || ""} ${item.out || ""}`.toLowerCase();
  if (value.includes("hil") || value.includes("approval")) return "hil";
  if (value.includes("alert") || value.includes("blocked") || value.includes("failed") || value.includes("rejected")) return "alert";
  if (value.includes("trigger") || value.includes("created")) return "trigger";
  return "audit";
}

function liveColorFromAudit(item = {}) {
  const type = liveTypeFromAudit(item);
  if (type === "alert") return "#E4902E";
  if (type === "hil") return "#CF008B";
  if (type === "trigger") return "#5929d0";
  return "#0E766E";
}

function liveTypeFromCase(item = {}) {
  if (item.st === "hil") return "hil";
  if (item.st === "blocked" || item.st === "at-risk") return "alert";
  if (item.phase === "Pre-Onboarding") return "trigger";
  return "activity";
}

function liveColorFromCase(item = {}) {
  if (item.st === "blocked" || item.st === "at-risk") return "#E4902E";
  if (item.st === "hil") return "#CF008B";
  if (item.phase === "Pre-Onboarding") return "#5929d0";
  return "#0E766E";
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
            <div><div className="card-title">Active Pipeline</div><div className="card-sub">Realtime GET polling · backend case data</div></div>
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
      <div className="react-table-header"><span>Employee</span><span>Owner</span><span>Phase</span><span>Status</span><span>Progress</span><span>IT</span><span>Docs</span></div>
      {cases.map((item) => <CaseRow key={item.caseId} item={item} openCase={openCase} />)}
    </div>
  );
}

function CaseRow({ item, openCase }) {
  return (
    <div onClick={() => openCase?.(item)} style={{ display: "grid", gridTemplateColumns: "1.6fr 1.25fr 1.1fr 1fr 80px 80px 90px", columnGap: 10, alignItems: "center", padding: "9px 14px", borderBottom: "1px solid var(--n8)", cursor: openCase ? "pointer" : "default" }}>
      <div className="emp"><div className="emp-av" style={{ background: item.col }}>{item.ini}</div><div><div className="emp-name">{item.name}</div><div className="emp-role">{item.dept} · {item.caseId}</div></div></div>
      <div style={{ fontSize: 10.5, color: "var(--n3)" }}>{item.owner}</div>
      <span className={`tag ${phaseTagClass(item.phase)}`}>{item.phase}</span>
      <div>{badge(item.st)}</div>
      <div style={{ fontSize: 11, color: "var(--n3)" }}>{item.prog}%</div>
      <div style={{ fontSize: 11, color: "var(--n3)" }}>{item.it}</div>
      <div style={{ fontSize: 11, color: "var(--n3)" }}>{item.docs}</div>
    </div>
  );
}

function PreOnboard({ tasks = [], followUps = [] }) {
  const taskCounts = tasks.reduce((acc, task) => {
    const team = task.assigned_team || "other";
    acc[team] = (acc[team] || 0) + 1;
    return acc;
  }, {});
  return (
    <div className="g2">
      <div className="card">
        <div className="card-head">
          <div><div className="card-title">Pre-Onboarding Task Panel</div><div className="card-sub">IT provisioning · Admin prep · Candidate follow-ups</div></div>
          <span className="tag purple">{tasks.length} Tasks</span>
        </div>
        <div className="kpi-grid g3" style={{ padding: "0 14px 14px" }}>
          <Kpi color="blue" label="IT Tasks" value={taskCounts.it || 0} meta="Laptop and email setup" />
          <Kpi color="orange" label="Admin Tasks" value={taskCounts.admin || 0} meta="Desk and ID card prep" />
          <Kpi color="green" label="Follow-Ups" value={followUps.length} meta="Reminder records" />
        </div>
        <div className="pre-task-table">
          <div className="pre-task-head"><span>Task</span><span>Case</span><span>Team</span><span>Status</span><span>Due</span><span>SLA</span></div>
          {!tasks.length && <div className="pre-task-row"><strong>No task rows returned</strong><span>Waiting for backend task records</span><span>-</span><span className="badge pending">Pending</span><span>-</span><span>-</span></div>}
          {tasks.map((task) => (
            <div className="pre-task-row" key={task.id || `${task.case_number}-${task.task_type}`}>
              <strong>{formatTaskType(task.task_type)}</strong>
              <span>{task.case_number || task.employee_id || "-"}</span>
              <span>{formatStatusLabel(task.assigned_team)}</span>
              <span><span className="pre-task-badge">{badge(task.status)}</span></span>
              <span>{formatDateTime(task.due_date)}</span>
              <span>{task.sla_compliant === false ? "At risk" : "On track"}</span>
            </div>
          ))}
        </div>
      </div>
      <ReminderPanel followUps={followUps} />
    </div>
  );
}

function ReminderPanel({ followUps = [] }) {
  const grouped = Object.entries(groupByCase(followUps)).map(([caseNumber, rows]) => ({
    caseNumber,
    rows: rows.slice().sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0)),
    counts: sumFollowUpStatuses(rows)
  }));
  return (
    <div className="card">
      <div className="card-head">
        <div><div className="card-title">Reminders</div><div className="card-sub">Scheduled follow-ups from backend records</div></div>
        <span className="tag orange">{followUps.filter((item) => !item.sent_at).length} Pending</span>
      </div>
      <div className="reminder-list">
        {!grouped.length && <div className="reminder-row"><strong>No reminders returned</strong><span>Waiting for follow-up records</span></div>}
        {grouped.map((group) => {
          const latest = group.rows[0];
          return (
            <div className="reminder-row reminder-group" key={group.caseNumber}>
              <strong>{group.caseNumber} · {group.counts.sent || 0} sent · {group.counts.pending || 0} pending</strong>
              <span>{formatDateTime(latest?.scheduled_at)} · {formatReminderType(latest?.follow_up_type)}</span>
              <span className="reminder-chips">
                <span className="tag purple">Scheduled {group.rows.length}</span>
                <span className="tag green">Sent {group.counts.sent || 0}</span>
                <span className="tag orange">Pending {group.counts.pending || 0}</span>
              </span>
              <span className="reminder-sub">{group.rows.map((item) => `${formatReminderType(item.follow_up_type)}: ${item.sent_at ? "Sent" : item.response_status || "Pending"}`).join(" · ")}</span>
            </div>
          );
        })}
      </div>
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
      <div className="exc-actions"><button className="btn-sys">Live status</button>{badge(item.st)}</div>
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

function SlaMonitor({ cases, gates = [] }) {
  const pendingCases = cases.filter((item) => item.st === "hil");
  const gateByCase = new Map(gates.filter((gate) => gate.decision === "pending").map((gate) => [gate.case_number, gate]));
  const onTrack = cases.filter((x) => x.slaLabel === "On Track").length;
  const atRisk = cases.filter((x) => x.st === "at-risk").length;
  const breached = cases.filter((x) => x.st === "blocked").length;
  return (
    <>
      <div className="kpi-grid g3"><Kpi color="green" label="On Track" value={onTrack} meta="Within SLA" /><Kpi color="orange" label="At Risk" value={atRisk} meta="Within breach window" /><Kpi color="red" label="Breached" value={breached} meta="Escalation required" /></div>
      <div className="card">
        <div className="card-head">
          <div><div className="card-title">SLA Tracking - Pending HIL</div><div className="card-sub">Deadline and escalation overview</div></div>
          <span className="tag pink">{pendingCases.length} Reviewing</span>
        </div>
        <div className="sla-list">
          {!pendingCases.length && <div className="sla-row"><strong>No pending HIL cases</strong><span>SLA countdown will appear here once a case enters review</span></div>}
          {pendingCases.map((item) => {
            const gate = gateByCase.get(item.caseId);
            const hoursLeft = gate?.token_expires_at ? hoursBetween(new Date(), new Date(gate.token_expires_at)) : null;
            const reviewStart = gate?.email_sent_at ? new Date(gate.email_sent_at) : null;
            return (
              <div className="sla-row" key={item.caseId}>
                <strong>{item.name} · {item.caseId}</strong>
                <span>{item.owner} · {item.dept} · {item.prog}% complete</span>
                <span className={`sla-pill ${hoursLeft !== null && hoursLeft <= 1 ? "late" : "watch"}`}>Time in review: {hoursLeft === null ? "Unknown" : formatHoursLeft(hoursLeft)}</span>
                <span className="sla-sub">{reviewStart ? `Review started ${formatDateTime(reviewStart.toISOString())}` : "Review timing derived from gate expiration"}</span>
              </div>
            );
          })}
        </div>
      </div>
      <Board title="SLA Tracking - All Cases" subtitle="Deadline and escalation overview" rows={cases} />
    </>
  );
}

function EmployeePortal({ cases, item: providedItem }) {
  const item = providedItem || pickEmployeeCase(cases);
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

function PublicPortal({ item, token, loading, error }) {
  if (loading) {
    return <LoadingShell title="Opening secure portal" subtitle={token ? `Looking up ${token}` : "Fetching your case"} />;
  }
  if (error) {
    return <div className="card" style={{ padding: 20 }}><div className="card-title">Portal unavailable</div><div className="card-sub">{error}</div></div>;
  }
  if (!item || !item.caseId) {
    return <div className="card" style={{ padding: 20 }}><div className="card-title">Case not found</div><div className="card-sub">No onboarding case matched this portal token.</div></div>;
  }
  return (
    <div className="employee-portal">
      <div className="card" style={{ padding: 16 }}>
        <div className="card-head" style={{ padding: 0, marginBottom: 12 }}>
          <div>
            <div className="card-title">Secure Employee Portal</div>
            <div className="card-sub">Read-only case status, document state, and onboarding progress</div>
          </div>
          <span className="tag purple">{item.caseId}</span>
        </div>
        <div className="employee-status-list" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <InfoPill label="Case status" value={statusLabels[item.st] || formatStatusLabel(item.st)} />
          <InfoPill label="Document status" value={item.docs || "Pending"} />
          <InfoPill label="Onboarding progress" value={`${item.prog || 0}%`} />
          <InfoPill label="Assigned HR" value={item.owner || "HR Coordinator"} />
        </div>
      </div>
      <EmployeeHero item={item} />
      <div className="employee-grid">
        <EmployeeJourney item={item} />
        <EmployeeStatusPanel item={item} />
      </div>
      <EmployeeReadOnlyCards item={item} focus="docs" />
    </div>
  );
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
  const docRejections = docs.filter((doc) => doc.status === "Rejected" || doc.rejectionReason || doc.correctionInstructions);
  return (
    <div className="card employee-doc-card">
      <div className="card-head">
        <div><div className="card-title">Submitted Documents</div><div className="card-sub">Read-only validation trail from onboarding records</div></div>
        <span className="tag purple">{docs.filter((doc) => doc.status === "Validated").length}/{docs.length} Validated</span>
      </div>
      {!!docRejections.length && (
        <div className="doc-remediation">
          <strong>Rejected documents need correction</strong>
          {docRejections.map((doc) => (
            <div className="doc-remediation-row" key={`${doc.name}-remediation`}>
              <span>{doc.name}</span>
              <small>{[doc.rejectionReason, doc.correctionInstructions].filter(Boolean).join(" · ")}</small>
            </div>
          ))}
        </div>
      )}
      <div className="employee-doc-table">
        <div className="employee-doc-head"><span>Document</span><span>Submitted</span><span>Timing</span><span>Validation</span></div>
        {!docs.length && (
          <div className="employee-doc-row">
            <div><strong>No document rows returned</strong><small>Waiting for backend document records</small></div>
            <span>-</span>
            <span className="doc-timing pending">Pending</span>
            <span className="doc-validation pending">Pending</span>
          </div>
        )}
        {docs.map((doc) => (
          <div className="employee-doc-row" key={doc.name}>
            <div><strong>{doc.name}</strong><small>{doc.status === "Rejected" ? [doc.rejectionReason, doc.correctionInstructions].filter(Boolean).join(" · ") : doc.rejectionReason || doc.correctionInstructions || doc.owner}</small></div>
            <span>{doc.submittedAt}</span>
            <span className={`doc-timing ${doc.timing === "Late" ? "late" : doc.timing === "Pending" ? "pending" : "ontime"}`}>{doc.timing}</span>
            <span className={`doc-validation ${doc.status.toLowerCase().replace(/\s+/g, "-")}`}>{doc.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getDocumentSubmissions(item = {}) {
  const documents = item.documentRows || item.documents || item.document_rows || [];
  return documents.map((doc, index) => ({
    name: doc.document_type || doc.name || doc.type || `Document ${index + 1}`,
    owner: doc.owner || doc.source || doc.uploaded_by || "-",
    submittedAt: doc.submitted_at || doc.created_at || "-",
    timing: doc.timing || doc.sla_status || "-",
    status: formatStatusLabel(doc.status || "Pending"),
    rejectionReason: doc.rejection_reason || item.rejectionReason,
    correctionInstructions: doc.correction_instructions || item.correctionInstructions
  }));
}

function LoadingShell({ title = "Loading dashboard", subtitle = "Fetching live data from the backend" }) {
  return (
    <div className="loading-shell">
      <div className="card" style={{ padding: 20 }}>
        <div className="card-title">{title}</div>
        <div className="card-sub">{subtitle}</div>
        <div className="loading-grid">
          <div className="loading-card" />
          <div className="loading-card" />
          <div className="loading-card" />
          <div className="loading-card loading-wide" />
        </div>
      </div>
    </div>
  );
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
  return <div style={{ display: "flex", gap: 10, padding: "9px 16px", borderBottom: "1px solid var(--n8)", alignItems: "flex-start" }}><div style={{ fontSize: 9.5, color: "var(--n5)", minWidth: 46 }}>{item.ts}</div><span className={`al-dot ${item.dot || "p"}`} /><div style={{ flex: 1 }}><div style={{ fontSize: 11.5, fontWeight: 600 }}>{item.emp} · {item.case}</div><div style={{ fontSize: 10.5, color: "var(--n4)" }}>{item.ev}</div></div><span className="tag purple">{item.out || item.phase}</span></div>;
}

function WorkflowCard({ title, items }) {
  return <div className="card"><div className="card-head"><div className="card-title">{title}</div></div><div className="workflow-list">{items.map((item, index) => <div className="workflow-step" key={item}><div className="workflow-step-num">{index + 1}</div><div><div className="emp-name">{item}</div><div className="emp-role">Fetched as read-only workflow metadata</div></div></div>)}</div></div>;
}

function Reports({ analytics }) {
  return <Analytics analytics={analytics} />;
}

function CaseModal({ item, onClose }) {
  const rejectionRows = [
    item.rejectionReason && ["Rejection Reason", item.rejectionReason],
    item.correctionInstructions && ["Correction", item.correctionInstructions]
  ].filter(Boolean);
  return (
    <div className="modal-wrap open" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-head-ic">□</div>
          <div style={{ flex: 1 }}><div className="modal-title">{item.name} - Case Detail</div><div className="modal-sub">{item.caseId} · {item.phase} · {item.role}</div></div>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <div className="modal-body">
          <div className="g2">
            <InfoBox title="Summary" rows={[["Employee ID", item.id], ["Department", item.dept], ["Owner", item.owner], ["SLA", item.slaLabel]]} />
            <InfoBox title="Status" rows={[["Case Status", statusLabels[item.st] || item.st], ["IT", item.it], ["Documents", item.docs], ["Risk Score", item.riskScore]]} />
          </div>
          {!!rejectionRows.length && <InfoBox title="Document Remediation" rows={rejectionRows} />}
          <ReminderPanel followUps={item.followUps || []} />
          <DocumentSubmissionDetails item={item} />
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
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
        <div className="office-preview-row">
          <span className="office-preview-dot">-</span>
          <span>No workspace records returned by the backend for this preview.</span>
        </div>
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
        <span className="tb-logo-text">AEGIS.AI</span>
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

