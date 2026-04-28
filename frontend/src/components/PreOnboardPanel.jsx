function format(value = "") {
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function dateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function PreOnboardPanel({ tasks = [], followUps = [] }) {
  const grouped = followUps.reduce((acc, item) => {
    const key = item.case_number || item.employee_id || "Unknown case";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="g2">
      <div className="card">
        <div className="card-head">
          <div><div className="card-title">Pre-Onboarding Task Panel</div><div className="card-sub">IT provisioning · Admin prep · Candidate follow-ups</div></div>
          <span className="tag purple">{tasks.length} Tasks</span>
        </div>
        <div className="pre-task-table">
          <div className="pre-task-head"><span>Task</span><span>Case</span><span>Team</span><span>Status</span><span>Due</span><span>SLA</span></div>
          {tasks.map((task) => (
            <div className="pre-task-row" key={task.id || `${task.case_number}-${task.task_type}`}>
              <strong>{format(task.task_type)}</strong>
              <span>{task.case_number || task.employee_id || "-"}</span>
              <span>{format(task.assigned_team)}</span>
              <span className={`badge ${task.status}`}>{format(task.status)}</span>
              <span>{dateTime(task.due_date)}</span>
              <span>{task.sla_compliant === false ? "At risk" : "On track"}</span>
            </div>
          ))}
          {!tasks.length && <div className="pre-task-row"><strong>No task rows returned</strong><span>Waiting for backend task records</span><span>-</span><span>-</span><span>-</span><span>-</span></div>}
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <div><div className="card-title">Reminders</div><div className="card-sub">Scheduled follow-ups by case</div></div>
          <span className="tag orange">{followUps.filter((item) => !item.sent_at).length} Pending</span>
        </div>
        <div className="reminder-list">
          {Object.entries(grouped).map(([caseNumber, rows]) => (
            <div className="reminder-row" key={caseNumber}>
              <strong>{caseNumber}</strong>
              <span>{rows.length} scheduled · {rows.filter((item) => item.sent_at).length} sent · {rows.filter((item) => !item.sent_at).length} pending</span>
            </div>
          ))}
          {!Object.keys(grouped).length && <div className="reminder-row"><strong>No reminders returned</strong><span>Waiting for follow-up records</span></div>}
        </div>
      </div>
    </div>
  );
}
