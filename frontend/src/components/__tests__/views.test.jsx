import { render, screen } from "@testing-library/react";

import HRDashboard from "../HRDashboard.jsx";
import CasesTable from "../CasesTable.jsx";
import ExceptionQueue from "../ExceptionQueue.jsx";
import PreOnboardPanel from "../PreOnboardPanel.jsx";
import PostOnboardPanel from "../PostOnboardPanel.jsx";
import AuditPanel from "../AuditPanel.jsx";
import ReportsPage from "../ReportsPage.jsx";
import EmployeeView from "../EmployeeView.jsx";
import ITSupportView from "../ITSupportView.jsx";
import AdminView from "../AdminView.jsx";

const caseRow = {
  caseId: "OB-2026-0013",
  name: "Asha Verma",
  dept: "Engineering",
  phase: "Pre-Onboarding",
  st: "in-progress",
  prog: 54,
  it: "In Progress",
  docs: "Submitted",
  owner: "Priya Nair - HR Coordinator",
  col: "#0E2E89",
  ini: "AV",
  scenario: "Pre-boarding in progress",
  riskScore: 44,
  documentRows: [{ document_type: "Identity Proof", status: "validated" }]
};

const followUp = {
  id: "fu-1",
  case_number: "OB-2026-0013",
  follow_up_type: "t_minus_3",
  sent_at: null
};

const task = {
  id: "task-1",
  task_type: "laptop_setup",
  case_number: "OB-2026-0013",
  assigned_team: "it",
  status: "in_progress",
  due_date: "2026-05-02T09:00:00Z",
  sla_compliant: true
};

const gate = {
  gate_id: "g-1",
  candidate_name: "Asha Verma",
  gate_type: "Doc Bg Verification",
  decision: "pending",
  case_number: "OB-2026-0013",
  email_sent_to: "hr@example.com"
};

test("HRDashboard renders active pipeline", () => {
  render(<HRDashboard metrics={{ active: 1, inProgress: 1, pendingHil: 0, completed: 0, avgProgress: 54 }} cases={[caseRow]} audit={[]} onViewAllCases={() => {}} onOpenCase={() => {}} />);
  expect(screen.getByText("Active Pipeline")).toBeInTheDocument();
});

test("CasesTable renders case owner", () => {
  render(<CasesTable cases={[caseRow]} onOpenCase={() => {}} />);
  expect(screen.getByText("Priya Nair - HR Coordinator")).toBeInTheDocument();
});

test("ExceptionQueue renders pending gate", () => {
  render(<ExceptionQueue cases={[{ ...caseRow, st: "hil" }]} gates={[gate]} />);
  expect(screen.getByText("Exception & HIL Queue")).toBeInTheDocument();
});

test("PreOnboardPanel renders task and reminders", () => {
  render(<PreOnboardPanel tasks={[task]} followUps={[followUp]} />);
  expect(screen.getByText("Pre-Onboarding Task Panel")).toBeInTheDocument();
  expect(screen.getByText("Reminders")).toBeInTheDocument();
});

test("PostOnboardPanel renders checklist title", () => {
  render(<PostOnboardPanel cases={[{ ...caseRow, phase: "Post-Onboarding" }]} />);
  expect(screen.getByText("Post-Onboarding Checklist")).toBeInTheDocument();
});

test("AuditPanel renders audit heading", () => {
  render(<AuditPanel audit={[{ ts: "10:30", emp: "Asha Verma", case: "OB-2026-0013", ev: "Case created", out: "created" }]} />);
  expect(screen.getByText("Audit Log")).toBeInTheDocument();
});

test("ReportsPage renders report heading", () => {
  render(<ReportsPage analytics={{ byStatus: { "in-progress": 1 }, byPhase: { "Pre-Onboarding": 1 }, topRisks: [caseRow] }} />);
  expect(screen.getByText("Reports")).toBeInTheDocument();
});

test("EmployeeView public mode renders secure portal heading", () => {
  render(<EmployeeView mode="public" item={caseRow} loading={false} error="" token="OB-2026-0013" />);
  expect(screen.getByText("Secure Employee Portal")).toBeInTheDocument();
});

test("ITSupportView queue mode renders queue title", () => {
  render(<ITSupportView mode="queue" cases={[caseRow]} />);
  expect(screen.getByText("IT Provisioning Queue")).toBeInTheDocument();
});

test("AdminView tasks mode renders board title", () => {
  render(<AdminView mode="tasks" cases={[caseRow]} />);
  expect(screen.getByText("Admin Task Board")).toBeInTheDocument();
});
