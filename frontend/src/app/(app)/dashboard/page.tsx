"use client";
import { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import Link from "next/link";
import { useRoundsStore } from "@/lib/store/useRoundsStore";
import { useIssuesStore } from "@/lib/store/useIssuesStore";
import { useResidentsStore } from "@/lib/store/useResidentsStore";
import { useAngelsStore } from "@/lib/store/useAngelsStore";
import { useQapiStore } from "@/lib/store/useQapiStore";

type Range = "today" | "week" | "month";

function ini(n: string) { return n.split(" ").map((p) => p[0]).join(""); }

const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const TODAY = "2026-05-06";

export default function DashboardPage() {
  const [range, setRange] = useState<Range>("week");
  const completedRounds = useRoundsStore((s) => s.completedRounds);
  const templates = useRoundsStore((s) => s.templates);
  const issues = useIssuesStore((s) => s.issues);
  const residents = useResidentsStore((s) => s.residents);
  const angels = useAngelsStore((s) => s.angels);
  const qapis = useQapiStore((s) => s.qapis);

  const activeTemplate = templates.find((t) => t.active && t.type === "angel");

  const activeResidents = residents.filter((r) => r.status === "active").length;
  const openIssues = issues.filter((i) => i.status === "open");

  const { kpi, chartData, hourlyData, angelStats } = useMemo(() => {
    const now = new Date(TODAY + "T23:59:59");
    const startOfToday = new Date(TODAY + "T00:00:00");

    function roundsInRange(start: Date, end: Date) {
      return completedRounds.filter((r) => {
        const d = new Date(r.completedAt);
        return d >= start && d <= end;
      });
    }

    function issuesInRange(start: Date, end: Date) {
      const raised = issues.filter((i) => { const d = new Date(i.createdAt); return d >= start && d <= end; });
      const resolved = issues.filter((i) => i.resolvedAt && (() => { const d = new Date(i.resolvedAt!); return d >= start && d <= end; })());
      return { raised, resolved };
    }

    // Active angel count for denominator
    const activeAngels = angels.filter((a) => !a.absent);
    const assignedResidents = residents.filter((r) => r.status === "active" && r.angelId !== null);
    const expectedPerDay = assignedResidents.length;

    // Today
    const todayRounds = roundsInRange(startOfToday, now);
    const resolvedToday = issues.filter((i) => i.resolvedAt && new Date(i.resolvedAt) >= startOfToday && new Date(i.resolvedAt) <= now);
    const todayKpi = {
      completed: todayRounds.length,
      rate: expectedPerDay > 0 ? `${Math.round((todayRounds.length / expectedPerDay) * 100)}%` : "—",
      open: openIssues.length,
      resolved: resolvedToday.length,
      census: activeResidents,
    };

    // This week (last 7 days)
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0,0,0,0);
    const weekRounds = roundsInRange(weekStart, now);
    const weekIssues = issuesInRange(weekStart, now);
    const weekKpi = {
      completed: weekRounds.length,
      rate: `${Math.round((weekRounds.length / Math.max(expectedPerDay * 7, 1)) * 100)}%`,
      open: openIssues.length,
      resolved: weekIssues.resolved.length,
      census: activeResidents,
    };

    // This month (last 30 days)
    const monthStart = new Date(now); monthStart.setDate(now.getDate() - 29); monthStart.setHours(0,0,0,0);
    const monthRounds = roundsInRange(monthStart, now);
    const monthIssues = issuesInRange(monthStart, now);
    const monthKpi = {
      completed: monthRounds.length,
      rate: `${Math.round((monthRounds.length / Math.max(expectedPerDay * 30, 1)) * 100)}%`,
      open: openIssues.length,
      resolved: monthIssues.resolved.length,
      census: activeResidents,
    };

    const kpiMap = { today: todayKpi, week: weekKpi, month: monthKpi };

    // Chart data
    function buildWeekChart() {
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now); day.setDate(now.getDate() - i); day.setHours(0,0,0,0);
        const dayEnd = new Date(day); dayEnd.setHours(23,59,59);
        const rds = roundsInRange(day, dayEnd);
        const raised = issues.filter((x) => { const d = new Date(x.createdAt); return d >= day && d <= dayEnd; }).length;
        const resolved = issues.filter((x) => x.resolvedAt && (() => { const d = new Date(x.resolvedAt!); return d >= day && d <= dayEnd; })()).length;
        result.push({
          d: DAY_LABELS[day.getDay()],
          rate: expectedPerDay > 0 ? Math.round((rds.length / expectedPerDay) * 100) : 0,
          raised, resolved,
        });
      }
      return result;
    }

    function buildTodayChart() {
      const result = [];
      for (let h = 6; h <= 14; h++) {
        const start = new Date(TODAY + `T${String(h).padStart(2,"0")}:00:00`);
        const end = new Date(TODAY + `T${String(h).padStart(2,"0")}:59:59`);
        const rds = roundsInRange(start, end);
        const raised = issues.filter((x) => { const d = new Date(x.createdAt); return d >= start && d <= end; }).length;
        const resolved = issues.filter((x) => x.resolvedAt && (() => { const d = new Date(x.resolvedAt!); return d >= start && d <= end; })()).length;
        result.push({ d: h < 12 ? `${h}a` : h === 12 ? "12p" : `${h-12}p`, rate: rds.length * 12, raised, resolved });
      }
      return result;
    }

    function buildMonthChart() {
      const result = [];
      for (let w = 4; w >= 1; w--) {
        const wEnd = new Date(now); wEnd.setDate(now.getDate() - (w - 1) * 7);
        const wStart = new Date(wEnd); wStart.setDate(wEnd.getDate() - 6); wStart.setHours(0,0,0,0);
        const rds = roundsInRange(wStart, wEnd);
        const raised = issues.filter((x) => { const d = new Date(x.createdAt); return d >= wStart && d <= wEnd; }).length;
        const resolved = issues.filter((x) => x.resolvedAt && (() => { const d = new Date(x.resolvedAt!); return d >= wStart && d <= wEnd; })()).length;
        result.push({ d: `W${5-w}`, rate: expectedPerDay > 0 ? Math.round((rds.length / (expectedPerDay * 7)) * 100) : 0, raised, resolved });
      }
      return result;
    }

    const chartDataMap = { today: buildTodayChart(), week: buildWeekChart(), month: buildMonthChart() };

    // Hourly totals for mini bar (today)
    const hourly = [];
    for (let h = 6; h <= 12; h++) {
      const start = new Date(TODAY + `T${String(h).padStart(2,"0")}:00:00`);
      const end = new Date(TODAY + `T${String(h).padStart(2,"0")}:59:59`);
      hourly.push({ h: h < 12 ? `${h}a` : "12p", n: roundsInRange(start, end).length });
    }

    // Angel stats today
    const stats = activeAngels.map((a) => {
      const myResidents = residents.filter((r) => r.angelId === a.id && r.status === "active");
      const done = todayRounds.filter((r) => r.angelId === a.id).length;
      return { name: a.name, rounds: done, total: myResidents.length };
    });

    return {
      kpi: kpiMap,
      chartData: chartDataMap,
      hourlyData: hourly,
      angelStats: stats,
    };
  }, [completedRounds, issues, residents, angels, range]);

  // QAPI compliance KPI cards — live compliance rate per active QAPI in selected range
  const qapiKpis = useMemo(() => {
    const now = new Date(TODAY + "T23:59:59");
    const start = range === "today"
      ? new Date(TODAY + "T00:00:00")
      : range === "week"
        ? (() => { const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d; })()
        : (() => { const d = new Date(now); d.setDate(d.getDate() - 29); d.setHours(0,0,0,0); return d; })();

    const inRange = completedRounds.filter((r) => {
      const d = new Date(r.completedAt);
      return d >= start && d <= now;
    });

    return qapis.filter((q) => q.status === "active").map((qapi) => {
      const sections = activeTemplate?.sections.filter((s) => s.qapiId === qapi.id) ?? [];
      const qIds = new Set(sections.flatMap((s) => s.questions.map((q) => q.questionId)));
      const qapiAnswers = inRange.flatMap((r) => r.answers.filter((a) => qIds.has(a.questionId)));
      const yes = qapiAnswers.filter((a) => a.answer).length;
      const total = qapiAnswers.length;
      const rate = total > 0 ? Math.round((yes / total) * 100) : null;
      const qapiIssues = issues.filter((i) => {
        const d = new Date(i.createdAt);
        return d >= start && d <= now && i.status === "open" &&
          sections.some((s) => s.questions.some((q) => q.text === i.questionText));
      }).length;
      return { id: qapi.id, title: qapi.title, rate, issues: qapiIssues, rounds: inRange.length };
    });
  }, [completedRounds, issues, qapis, activeTemplate, range]);

  const current = kpi[range];
  const chart = chartData[range];

  return (
    <div className="max-w-[1240px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["today","week","month"] as Range[]).map((r) => (
            <button key={r} onClick={() => setRange(r)} style={{
              fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s",
              border: `1px solid ${range === r ? "var(--blue)" : "var(--hair-strong)"}`,
              background: range === r ? "var(--blue-tint)" : "var(--surface)",
              color: range === r ? "var(--blue)" : "var(--muted)",
            }}>
              {r === "today" ? "Today" : r === "week" ? "This week" : "This month"}
            </button>
          ))}
        </div>
        <button style={{ fontSize: 12, fontWeight: 500, padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--blue)", color: "#fff", cursor: "pointer" }}>
          Export compliance report
        </button>
      </div>

      {/* Active QAPI template banner */}
      {activeTemplate && (
        <div style={{ background: "var(--blue-tint)", border: "1px solid var(--blue-pale)", borderRadius: 10, padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--blue-mid)", marginBottom: 2 }}>Active QAPI Template</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--blue-deep)" }}>{activeTemplate.name}</p>
            <p style={{ fontSize: 11, color: "var(--blue)", marginTop: 2 }}>
              {activeTemplate.sections.reduce((n, s) => n + s.questions.length, 0)} questions · Started {new Date(activeTemplate.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <Link href="/rounds" style={{ fontSize: 12, padding: "6px 13px", borderRadius: 7, border: "1px solid var(--hair-strong)", background: "var(--surface)", color: "var(--ink-soft)", cursor: "pointer", whiteSpace: "nowrap", fontWeight: 500, textDecoration: "none" }}>
            Manage template
          </Link>
        </div>
      )}

      {/* 5 KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
        {[
          { label: "Rounds Completed", value: String(current.completed), color: "var(--ink)" },
          { label: "Completion Rate",  value: current.rate,              color: "var(--blue)" },
          { label: "Open Issues",      value: String(current.open),      color: "var(--red)" },
          { label: "Resolved",         value: String(current.resolved),  color: "var(--green)" },
          { label: "Active Residents", value: String(current.census),    color: "var(--blue)" },
        ].map((k) => (
          <div key={k.label} style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 10, padding: "12px 14px", transition: "all 0.15s", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: k.color, lineHeight: 1, fontFamily: "var(--font-mono)" }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* QAPI Compliance KPI cards */}
      {qapiKpis.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            QAPI Compliance — {range === "today" ? "Today" : range === "week" ? "This Week" : "This Month"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(qapiKpis.length, 3)},1fr)`, gap: 10 }}>
            {qapiKpis.map((q) => {
              const rateColor = q.rate === null ? "var(--muted)" : q.rate >= 90 ? "var(--green)" : q.rate >= 75 ? "var(--amber)" : "var(--red)";
              const rateBg   = q.rate === null ? "var(--surface)" : q.rate >= 90 ? "var(--green-tint)" : q.rate >= 75 ? "var(--amber-tint)" : "var(--red-tint)";
              return (
                <Link key={q.id} href={`/reports`} style={{ textDecoration: "none" }}>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "14px 16px", boxShadow: "var(--shadow-sm)", cursor: "pointer", transition: "all 0.15s", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3, flex: 1 }}>{q.title}</span>
                      {q.issues > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: "var(--red-tint)", color: "var(--red)", flexShrink: 0 }}>{q.issues} open</span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-mono)", color: rateColor, lineHeight: 1 }}>
                          {q.rate !== null ? `${q.rate}%` : "—"}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>Compliance</div>
                      </div>
                      {q.rate !== null && (
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: rateBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: rateColor }}>{q.rate >= 90 ? "✓" : q.rate >= 75 ? "!" : "✗"}</div>
                        </div>
                      )}
                    </div>
                    {q.rate !== null && (
                      <div style={{ height: 4, borderRadius: 4, background: "var(--hair-strong)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${q.rate}%`, background: rateColor, borderRadius: 4, transition: "width 0.4s" }} />
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>
                      {q.rounds > 0 ? `${q.rounds} rounds in range` : "No rounds in range"}
                      <span style={{ color: "var(--blue)", marginLeft: 6, fontWeight: 500 }}>View report →</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 2-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>

        {/* LEFT column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Completion rate area chart */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "16px 20px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
              Completion Rate — {range === "today" ? "Today by hour" : range === "week" ? "This week" : "This month"}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1A5FA8" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#1A5FA8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hair)" />
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0,100]} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => [`${v}%`, "Rate"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--hair)" }} />
                <Area type="monotone" dataKey="rate" stroke="#1A5FA8" strokeWidth={2} fill="url(#rateGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Issues raised vs resolved */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "16px 20px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Issues Raised vs Resolved</div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hair)" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--hair)" }} />
                <Bar dataKey="raised" name="Raised" fill="var(--red-edge)" radius={[3,3,0,0]} maxBarSize={16} />
                <Bar dataKey="resolved" name="Resolved" fill="var(--green-edge)" radius={[3,3,0,0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Angel completion + hourly mini */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "14px 16px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Angel Completion Today</div>
              {angelStats.map((a) => (
                <div key={a.name} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>{a.name.split(" ")[0]} {a.name.split(" ")[1]?.[0]}.</span>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>{a.rounds}/{a.total}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 4, background: "var(--hair-strong)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${a.total > 0 ? Math.round((a.rounds / a.total) * 100) : 0}%`, background: a.rounds === a.total ? "var(--green)" : "var(--blue)", borderRadius: 4, transition: "width 0.3s" }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "14px 16px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Completions by Hour (Today)</div>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={hourlyData} margin={{ top: 0, right: 0, bottom: 0, left: -28 }}>
                  <XAxis dataKey="h" tick={{ fontSize: 9, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--hair)" }} />
                  <Bar dataKey="n" name="Rounds" fill="var(--blue-mid)" radius={[2,2,0,0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Open issues panel */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "14px 16px", boxShadow: "var(--shadow-sm)", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Open Issues</div>
              <Link href="/issues" style={{ fontSize: 11, color: "var(--blue)", fontWeight: 500, textDecoration: "none" }}>View all</Link>
            </div>
            {openIssues.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>No open issues</div>
            ) : (
              openIssues.slice(0, 5).map((issue) => (
                <div key={issue.id} style={{ borderBottom: "1px solid var(--hair-soft)", paddingBottom: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{issue.residentName}</span>
                    <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>Rm {issue.room}{issue.bed}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>
                    {issue.angelName} · {issue.department}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.4 }}>
                    {issue.questionText}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Census widget */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "14px 16px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Census</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--ink)" }}>{activeResidents}</span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>/ 55 beds</span>
            </div>
            <div style={{ height: 8, borderRadius: 8, background: "var(--hair-strong)", overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${Math.round((activeResidents / 55) * 100)}%`, background: activeResidents / 55 >= 0.9 ? "var(--green)" : activeResidents / 55 >= 0.8 ? "var(--amber-mid)" : "var(--red-mid)", borderRadius: 8, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink)", fontWeight: 600 }}>{Math.round((activeResidents / 55) * 100)}%</span> occupancy · {55 - activeResidents} beds available
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
