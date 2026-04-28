import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  LineChart, Line, CartesianGrid,
} from "recharts";

const COLORS = ["#5929d0", "#0E2E89", "#CF008B", "#E4902E", "#16A34A", "#E11D48", "#0E766E", "#7C3AED"];

// ── Shared UI helpers ──────────────────────────────────────────────────────

function ChartCard({ title, sub, children, exportId, onExport, loading }) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="card-head">
        <div>
          <div className="card-title">{title}</div>
          {sub && <div className="card-sub">{sub}</div>}
        </div>
        {exportId && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onExport(exportId)}
            disabled={loading}
            style={{ fontSize: 11 }}
          >
            {loading ? "Exporting…" : "Export CSV ↓"}
          </button>
        )}
      </div>
      <div style={{ padding: "0 14px 14px" }}>{children}</div>
    </div>
  );
}

function StatRow({ label, value, pct }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid var(--n8)" }}>
      <span style={{ fontSize: 12, flex: 1, color: "var(--n3)" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 28, textAlign: "right" }}>{value}</span>
      {pct !== undefined && (
        <span style={{ fontSize: 10, color: "var(--n5)", minWidth: 38, textAlign: "right" }}>{pct}%</span>
      )}
    </div>
  );
}

function MiniKpi({ color, label, value, sub }) {
  return (
    <div style={{ background: "var(--n9)", borderRadius: 8, padding: "10px 12px", borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 10, color: "var(--n5)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--n4)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: "var(--n3)" }}>{label}</span>
        <span style={{ color: "var(--n5)", fontWeight: 600 }}>{value} · {pct}%</span>
      </div>
      <div style={{ background: "var(--n8)", borderRadius: 4, height: 6 }}>
        <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 4, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function SectionDivider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 8px" }}>
      <div style={{ flex: 1, height: 1, background: "var(--n7)" }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--n4)", whiteSpace: "nowrap", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--n7)" }} />
    </div>
  );
}

// ── Cases-derived stats (HR Coordinator cross-role view) ───────────────────

function useCasesStats(cases) {
  return useMemo(() => {
    const byPhase = {}, byDept = {}, byIt = {}, byStatutory = {}, byTaxConfig = {};
    let welcomeSent = 0, mgrSent = 0, hrSignedOff = 0, itActionOpen = 0, itFailed = 0;
    const byJoining = { "0-7d": 0, "8-14d": 0, "15-30d": 0, "30+d": 0 };
    const byStatus = { completed: 0, "in-progress": 0, hil: 0, "at-risk": 0, blocked: 0 };
    const now = new Date();

    for (const c of cases) {
      // Phase
      const phase = c.phase || "Unknown";
      byPhase[phase] = (byPhase[phase] || 0) + 1;

      // Department
      const dept = c.dept || "Other";
      byDept[dept] = (byDept[dept] || 0) + 1;

      // IT status
      const itKey = (c.it || "Not Started").slice(0, 20);
      byIt[itKey] = (byIt[itKey] || 0) + 1;
      if (String(c.it || "").toLowerCase().includes("fail")) itFailed++;
      if (c.it_admin_action_item_open) itActionOpen++;

      // Notifications
      if ((c.welcome_email_status || "") === "sent" || c.welcomeEmailSent) welcomeSent++;
      if ((c.manager_notification_status || "") === "sent") mgrSent++;
      if ((c.hr_signoff_status || "") === "signed_off") hrSignedOff++;

      // Statutory / Tax
      if (c.statutory_form_type) {
        byStatutory[c.statutory_form_type] = (byStatutory[c.statutory_form_type] || 0) + 1;
      }
      const tax = c.tax_statutory_config_status || "not_started";
      byTaxConfig[tax] = (byTaxConfig[tax] || 0) + 1;

      // Joining cohort
      if (c.join) {
        const diff = Math.ceil((new Date(c.join) - now) / 86400000);
        if (diff >= 0 && diff <= 7) byJoining["0-7d"]++;
        else if (diff > 7 && diff <= 14) byJoining["8-14d"]++;
        else if (diff > 14 && diff <= 30) byJoining["15-30d"]++;
        else if (diff > 30) byJoining["30+d"]++;
      }

      // UI status bucket
      const st = c.st || "in-progress";
      if (byStatus[st] !== undefined) byStatus[st]++;
    }

    return {
      byPhase, byDept, byIt, byStatutory, byTaxConfig,
      welcomeSent, mgrSent, hrSignedOff, itActionOpen, itFailed,
      byJoining, byStatus,
    };
  }, [cases]);
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ReportsPage({ analytics = {}, cases = [], metrics = {}, isHRCoordinator = false }) {
  const status = analytics.byStatus || {};
  const topRisks = analytics.topRisks || [];

  const [r01, setR01] = useState(null);
  const [r03, setR03] = useState(null);
  const [r04, setR04] = useState(null);
  const [r06, setR06] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  const stats = useCasesStats(cases);
  const n = cases.length || 1;

  useEffect(() => {
    const base = "/dana-aegis/api/v1/reports";
    Promise.all([
      fetch(`${base}/r01`).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`${base}/r03`).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`${base}/r04`).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`${base}/r06`).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([d1, d3, d4, d6]) => {
      if (d1) setR01(d1);
      if (d3) setR03(d3);
      if (d4) setR04(d4);
      if (d6) setR06(d6);
    });
  }, []);

  async function handleExport(reportId) {
    setExportLoading(true);
    try {
      const res = await fetch(`/dana-aegis/api/v1/reports/export?report_id=${reportId}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export error:", err);
    } finally {
      setExportLoading(false);
    }
  }

  // ── Shared chart data (from API) ───────────────────────────────────────
  const riskTimeline = (r01?.risk_timeline || []).map((row) => ({
    day: row.joining_day ? row.joining_day.slice(5, 10) : "?",
    risk: row.avg_risk_score || 0,
  }));

  const statusBarData = Object.entries(status).map(([key, val]) => ({
    name: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    count: val,
  }));

  const docBarData = (r03?.by_document_type || []).map((row) => ({
    name: (row.document_type || "Doc").replace(/_/g, " "),
    submitted: row.submitted || 0,
    validated: row.validated || 0,
    rejected: row.rejected || 0,
  }));

  const postPieData = (r04?.checklist_completion || []).map((row, i) => ({
    name: row.item,
    value: row.rate_pct || 0,
    fill: COLORS[i % COLORS.length],
  }));

  // ── Cases-derived chart data (HR Coordinator) ──────────────────────────
  const phaseBarData = Object.entries(stats.byPhase)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count], i) => ({ name, count, fill: COLORS[i % COLORS.length] }));

  const deptBarData = Object.entries(stats.byDept)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name: name.slice(0, 12), count }));

  const itBarData = Object.entries(stats.byIt)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count], i) => ({ name, count, fill: COLORS[i % COLORS.length] }));

  const joiningBarData = [
    { name: "This Week",  count: stats.byJoining["0-7d"],  fill: "#E11D48" },
    { name: "Next Week",  count: stats.byJoining["8-14d"],  fill: "#E4902E" },
    { name: "This Month", count: stats.byJoining["15-30d"], fill: "#5929d0" },
    { name: "Future",     count: stats.byJoining["30+d"],   fill: "#0E766E" },
  ];

  const statutoryBarData = Object.entries(stats.byStatutory)
    .map(([name, count], i) => ({ name, count, fill: COLORS[(i + 2) % COLORS.length] }));

  const taxPieData = Object.entries(stats.byTaxConfig).map(([name, value], i) => ({
    name: name.replace(/_/g, " "),
    value,
    fill: COLORS[(i + 4) % COLORS.length],
  }));

  const hilBarData = (r06?.by_gate_type || []).map((row) => ({
    name: (row.gate_type || "").replace(/_/g, " ").slice(0, 20),
    approved: row.approved || 0,
    rejected: row.rejected || 0,
    pending: row.pending || 0,
  }));

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="reports-page">

      {/* ══════════════════════════════════════════════════════════════════
          HR COORDINATOR — CROSS-ROLE ANALYTICS BANNER
      ══════════════════════════════════════════════════════════════════ */}
      {isHRCoordinator && (
        <>
          {/* ── Banner ─────────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 12, background: "linear-gradient(120deg, #1a0a3e 0%, #0a1e4a 60%, #0a2e2e 100%)", border: "1px solid #2a1a5a" }}>
            <div style={{ padding: "14px 16px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                HR Coordinator · Cross-Role Analytics Dashboard
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>All Reports · All Roles · Live Data</div>
              <div style={{ fontSize: 11, color: "#8899aa", marginTop: 3 }}>
                Consolidated view: IT Provisioning · Admin · Welcome Tracking · Compliance · HIL · Pipeline
              </div>
            </div>
          </div>

          {/* ── Executive KPIs ─────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 12 }}>
            <MiniKpi color="#5929d0" label="Total Cases"        value={cases.length}                                                               sub="All cohorts" />
            <MiniKpi color="#16A34A" label="Completed"          value={stats.byStatus.completed}                                                   sub="Fully done" />
            <MiniKpi color="#0E2E89" label="In Progress"        value={stats.byStatus["in-progress"]}                                              sub="Active now" />
            <MiniKpi color="#CF008B" label="Pending HIL"        value={stats.byStatus.hil}                                                         sub="Awaiting review" />
            <MiniKpi color="#E11D48" label="At Risk / Blocked"  value={(stats.byStatus["at-risk"] || 0) + (stats.byStatus.blocked || 0)}           sub="Needs attention" />
            <MiniKpi color="#0E766E" label="Welcome Sent"       value={stats.welcomeSent}                                                          sub={`of ${cases.length} cases`} />
          </div>

          {/* ── Pipeline Distribution ──────────────────────────────── */}
          <ChartCard title="Pipeline Distribution" sub="Phase breakdown · Department load · Live from cases">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--n4)", marginBottom: 8 }}>Phase Breakdown</div>
                {phaseBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={phaseBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {phaseBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div style={{ padding: 14, color: "var(--n5)", fontSize: 12 }}>No data</div>}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--n4)", marginBottom: 8 }}>Department Load</div>
                {deptBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={deptBarData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 9 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={74} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#5929d0" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div style={{ padding: 14, color: "var(--n5)", fontSize: 12 }}>No data</div>}
              </div>
            </div>

            {/* Status mini-pills */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginTop: 14 }}>
              {[
                { label: "Completed",  value: stats.byStatus.completed,        color: "#16A34A" },
                { label: "In Progress",value: stats.byStatus["in-progress"],   color: "#5929d0" },
                { label: "Pending HIL",value: stats.byStatus.hil,              color: "#CF008B" },
                { label: "At Risk",    value: stats.byStatus["at-risk"],        color: "#E4902E" },
                { label: "Blocked",    value: stats.byStatus.blocked,           color: "#E11D48" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "var(--n9)", borderRadius: 6, padding: "6px 10px", textAlign: "center", borderTop: `3px solid ${color}` }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
                  <div style={{ fontSize: 9, color: "var(--n5)", marginTop: 1 }}>{label}</div>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* ── Joining Cohort Forecast ────────────────────────────── */}
          <ChartCard title="Joining Cohort Forecast" sub="Upcoming joiners by time window · IT & Admin preparation priority">
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={joiningBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {joiningBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
                {joiningBarData.map(({ name, count, fill }) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: fill, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, flex: 1, color: "var(--n3)" }}>{name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{count}</span>
                  </div>
                ))}
                <div style={{ marginTop: 4, fontSize: 10, color: "var(--n5)", borderTop: "1px solid var(--n8)", paddingTop: 6 }}>
                  Total upcoming: {joiningBarData.reduce((s, x) => s + x.count, 0)}
                </div>
              </div>
            </div>
          </ChartCard>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          R01 — PIPELINE OVERVIEW  (all roles)
      ══════════════════════════════════════════════════════════════════ */}
      {isHRCoordinator && <SectionDivider label="R01 · Pipeline Report" />}
      <ChartCard
        title="R01 · Pipeline Overview"
        sub="Case status distribution · SLA compliance"
        exportId="r01"
        onExport={handleExport}
        loading={exportLoading}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          {Object.entries(r01?.kpis || {}).slice(0, 6).map(([key, val]) => (
            <StatRow key={key} label={key.replace(/_/g, " ")} value={val} />
          ))}
        </div>
        {statusBarData.length > 0 && (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={statusBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {statusBarData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {r01?.sla_compliance && (
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--n4)" }}>
            SLA Compliance: <strong style={{ color: "var(--success)" }}>
              {r01.sla_compliance.sla_compliance_rate_pct ?? "—"}%
            </strong>
          </div>
        )}
      </ChartCard>

      {/* ── Risk Timeline ───────────────────────────────────────────── */}
      {riskTimeline.length > 0 && (
        <ChartCard title="Risk Timeline" sub="Average risk score by joining cohort">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={riskTimeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--n8)" />
              <XAxis dataKey="day" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="risk" stroke="#E11D48" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          HR COORDINATOR — IT SUPPORT ROLE VIEW
      ══════════════════════════════════════════════════════════════════ */}
      {isHRCoordinator && (
        <>
          <SectionDivider label="IT Support & Admin Role View" />
          <ChartCard title="IT Provisioning Status" sub="Live IT status from all cases · Action items · Blocked requests">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {itBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={itBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {itBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--n4)", marginBottom: 8 }}>IT Summary</div>
                {itBarData.map(({ name, count, fill }) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid var(--n8)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: fill, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, flex: 1, color: "var(--n3)" }}>{name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{count}</span>
                    <span style={{ fontSize: 10, color: "var(--n5)", minWidth: 32, textAlign: "right" }}>{Math.round((count / n) * 100)}%</span>
                  </div>
                ))}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#E4902E", marginBottom: 4 }}>Admin Task View</div>
                  <StatRow label="Pre-Onboarding Cases"    value={stats.byPhase["Pre-Onboarding"] || 0} />
                  <StatRow label="IT Action Items Open"    value={stats.itActionOpen} />
                  <StatRow label="IT Failure Count"        value={stats.itFailed} />
                </div>
              </div>
            </div>
          </ChartCard>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          HR COORDINATOR — HR PLATFORM ENGINEER ROLE VIEW
      ══════════════════════════════════════════════════════════════════ */}
      {isHRCoordinator && (
        <>
          <SectionDivider label="HR Platform Engineer Role View" />
          <ChartCard title="Notification & Signoff Tracking" sub="Welcome emails · Manager notifications · HR signoff status across all cases">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
              {/* Welcome Email */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--n4)", marginBottom: 10 }}>Welcome Emails</div>
                <ProgressBar label="Sent"     value={stats.welcomeSent}             total={cases.length} color="#16A34A" />
                <ProgressBar label="Not Sent" value={cases.length - stats.welcomeSent} total={cases.length} color="#E4902E" />
                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <div style={{ background: "var(--n9)", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#16A34A" }}>{stats.welcomeSent}</div>
                    <div style={{ fontSize: 9, color: "var(--n5)" }}>Sent</div>
                  </div>
                  <div style={{ background: "var(--n9)", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#E4902E" }}>{cases.length - stats.welcomeSent}</div>
                    <div style={{ fontSize: 9, color: "var(--n5)" }}>Pending</div>
                  </div>
                </div>
              </div>

              {/* Manager Notifications */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--n4)", marginBottom: 10 }}>Manager Notifications</div>
                <ProgressBar label="Sent"    value={stats.mgrSent}              total={cases.length} color="#5929d0" />
                <ProgressBar label="Pending" value={cases.length - stats.mgrSent} total={cases.length} color="#CF008B" />
                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <div style={{ background: "var(--n9)", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#5929d0" }}>{stats.mgrSent}</div>
                    <div style={{ fontSize: 9, color: "var(--n5)" }}>Sent</div>
                  </div>
                  <div style={{ background: "var(--n9)", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#CF008B" }}>{cases.length - stats.mgrSent}</div>
                    <div style={{ fontSize: 9, color: "var(--n5)" }}>Pending</div>
                  </div>
                </div>
              </div>

              {/* HR Signoff */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--n4)", marginBottom: 10 }}>HR Signoff</div>
                <ProgressBar label="Signed Off" value={stats.hrSignedOff}              total={cases.length} color="#16A34A" />
                <ProgressBar label="Pending"    value={cases.length - stats.hrSignedOff} total={cases.length} color="#E11D48" />
                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <div style={{ background: "var(--n9)", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#16A34A" }}>{stats.hrSignedOff}</div>
                    <div style={{ fontSize: 9, color: "var(--n5)" }}>Done</div>
                  </div>
                  <div style={{ background: "var(--n9)", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#E11D48" }}>{cases.length - stats.hrSignedOff}</div>
                    <div style={{ fontSize: 9, color: "var(--n5)" }}>Pending</div>
                  </div>
                </div>
              </div>
            </div>
          </ChartCard>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          R03 — DOCUMENT SUBMISSION  (all roles)
      ══════════════════════════════════════════════════════════════════ */}
      {isHRCoordinator && <SectionDivider label="R03 · Document Submission Report" />}
      <ChartCard
        title="R03 · Document Submission"
        sub="Submission and validation rates by document type"
        exportId="r03"
        onExport={handleExport}
        loading={exportLoading}
      >
        {r03?.summary && (
          <div style={{ marginBottom: 10 }}>
            <StatRow label="Total Documents" value={r03.summary.total_docs} pct={r03.summary.overall_submission_rate_pct} />
          </div>
        )}
        {docBarData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={docBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="submitted" fill="#5929d0" radius={[3, 3, 0, 0]} />
              <Bar dataKey="validated" fill="#16A34A" radius={[3, 3, 0, 0]} />
              <Bar dataKey="rejected"  fill="#E11D48" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ padding: 14, color: "var(--n5)", fontSize: 12 }}>Loading R03 data…</div>
        )}
      </ChartCard>

      {/* ══════════════════════════════════════════════════════════════════
          HR COORDINATOR — COMPLIANCE REVIEWER ROLE VIEW
      ══════════════════════════════════════════════════════════════════ */}
      {isHRCoordinator && (statutoryBarData.length > 0 || taxPieData.length > 0) && (
        <>
          <SectionDivider label="Compliance Reviewer Role View" />
          <ChartCard title="Tax & Statutory Forms" sub="Statutory form type distribution · Tax configuration status across all cases">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {statutoryBarData.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--n4)", marginBottom: 8 }}>Statutory Form Types</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={statutoryBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {statutoryBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 8 }}>
                    {statutoryBarData.map(({ name, count, fill }) => (
                      <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: fill, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, flex: 1, color: "var(--n3)" }}>{name}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{count}</span>
                        <span style={{ fontSize: 10, color: "var(--n5)" }}>{Math.round((count / n) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {taxPieData.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--n4)", marginBottom: 8 }}>Tax Configuration Status</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={taxPieData} cx="50%" cy="50%" innerRadius={32} outerRadius={58} dataKey="value" label={({ value }) => value} labelLine={false}>
                        {taxPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </ChartCard>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          R04 — POST-ONBOARDING COMPLETION  (all roles)
      ══════════════════════════════════════════════════════════════════ */}
      {isHRCoordinator && <SectionDivider label="R04 · Post-Onboarding Report" />}
      <ChartCard
        title="R04 · Post-Onboarding Completion"
        sub="Checklist completion rates across all cases"
        exportId="r04"
        onExport={handleExport}
        loading={exportLoading}
      >
        {postPieData.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "center" }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={postPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ value }) => `${value}%`} labelLine={false}>
                  {postPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div>
              {(r04?.checklist_completion || []).map((row) => (
                <StatRow key={row.item} label={row.item} value={row.completed} pct={row.rate_pct} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ padding: 14, color: "var(--n5)", fontSize: 12 }}>Loading R04 data…</div>
        )}
      </ChartCard>

      {/* ══════════════════════════════════════════════════════════════════
          R06 — HIL GATE THROUGHPUT  (all roles)
      ══════════════════════════════════════════════════════════════════ */}
      {isHRCoordinator && <SectionDivider label="R06 · HIL Gate Throughput — HR Ops Manager View" />}
      <ChartCard
        title="R06 · HIL Gate Throughput"
        sub="Approval rates · Average resolution time"
        exportId="r06"
        onExport={handleExport}
        loading={exportLoading}
      >
        {r06?.by_gate_type?.length > 0 ? (
          <>
            {isHRCoordinator && hilBarData.length > 0 && (
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={hilBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="approved" fill="#16A34A" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="rejected" fill="#E11D48" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="pending"  fill="#CF008B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div style={{ marginTop: isHRCoordinator ? 12 : 0 }}>
              {(r06.by_gate_type || []).map((row) => (
                <div key={row.gate_type} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.gate_type?.replace(/_/g, " ")}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {[
                      { label: "Total",     value: row.total },
                      { label: "Approved",  value: row.approved },
                      { label: "Rejected",  value: row.rejected },
                      { label: "Avg Hours", value: row.avg_resolution_hours ?? "—" },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: "var(--n9)", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{value}</div>
                        <div style={{ fontSize: 9, color: "var(--n5)" }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {r06.sla_overview && (
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--n4)" }}>
                SLA Breach Rate: <strong style={{ color: "var(--error)" }}>
                  {r06.sla_overview.breach_rate_pct ?? "0"}%
                </strong>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: 14, color: "var(--n5)", fontSize: 12 }}>Loading R06 data…</div>
        )}
      </ChartCard>

      {/* ══════════════════════════════════════════════════════════════════
          TOP RISKS  (all roles)
      ══════════════════════════════════════════════════════════════════ */}
      {isHRCoordinator && <SectionDivider label="Risk Watchlist" />}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Top Risks</div>
          <span className="tag orange">{topRisks.length} Watchlist</span>
        </div>
        {!topRisks.length && <div style={{ padding: 14, color: "var(--n5)" }}>No risk rows returned.</div>}
        {topRisks.map((item) => (
          <div key={item.caseId} style={{ display: "grid", gridTemplateColumns: "1.4fr auto auto", gap: 10, alignItems: "center", padding: "10px 14px", borderTop: "1px solid var(--n8)" }}>
            <div>
              <div className="emp-name" style={{ fontSize: 12 }}>{item.name}</div>
              <div className="emp-role" style={{ fontSize: 10 }}>{item.caseId} · {item.scenario}</div>
            </div>
            <span className={`badge ${item.st}`}>{item.st}</span>
            <span style={{ fontSize: 11, color: "var(--n4)" }}>{item.riskScore || "-"}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
