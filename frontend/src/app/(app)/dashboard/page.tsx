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
import { todayIsoDate, formatDate } from "@/lib/dates";
import {
  PageHero,
  SectionLabel,
  RefinedCard,
  KpiCard,
  RefinedTooltip,
  Pill,
} from "@/components/ui";

type Range = "today" | "week" | "month";

function ini(n: string) { return n.split(" ").map((p) => p[0]).join(""); }

const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const TODAY = todayIsoDate();

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

  // Editorial heading. Title is the timeframe; accent is a Fraunces-italic
  // descriptor that varies by range — keeps the hero contextual without
  // being noisy.
  const heroTitle = range === "today" ? "Today," : range === "week" ? "This week," : "This month,";
  const heroAccent =
    range === "today"
      ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      : range === "week"
        ? "rolling seven-day window"
        : new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }).toLowerCase();

  return (
    <div className="max-w-[1240px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      <PageHero
        eyebrow="Dashboard · Compliance Overview"
        title={heroTitle}
        accent={heroAccent}
        caption="Live posture across active QAPI items, rounding completion, and open concerns."
        trailing={
          <>
            <div style={{ display: "flex", gap: 6 }}>
              {(["today", "week", "month"] as Range[]).map((r) => (
                <Pill key={r} active={range === r} onClick={() => setRange(r)}>
                  {r === "today" ? "Today" : r === "week" ? "This week" : "This month"}
                </Pill>
              ))}
            </div>
            <button
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: "7px 16px",
                borderRadius: 8,
                border: "none",
                background: "var(--blue)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 1px 2px rgba(7,43,82,.18)",
                transition: "transform 180ms var(--ease-luxe)",
              }}
            >
              Export compliance report
            </button>
          </>
        }
      />

      {/* Active QAPI template banner — subtler treatment, plum accent rule */}
      {activeTemplate && (
        <div
          className="luxe-reveal-stagger"
          style={{
            ["--i" as string]: 0,
            background: "var(--blue-wash)",
            border: "1px solid var(--blue-pale)",
            borderRadius: 12,
            padding: "12px 16px 12px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            position: "relative",
            overflow: "hidden",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.5)",
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              background: "var(--plum)",
            }}
          />
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--plum)", marginBottom: 3, letterSpacing: "0.13em", textTransform: "uppercase" }}>
              Active QAPI Template
            </p>
            <p style={{ fontSize: 16, fontWeight: 500, color: "var(--blue-ink)", fontFamily: "var(--font-display)", letterSpacing: "-0.014em" }}>
              {activeTemplate.name}
            </p>
            <p style={{ fontSize: 11.5, color: "var(--blue)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
              {activeTemplate.sections.reduce((n, s) => n + s.questions.length, 0)} questions
              <span style={{ color: "var(--blue-mid)", margin: "0 6px" }}>·</span>
              Started {formatDate(activeTemplate.startDate)}
            </p>
          </div>
          <Link
            href="/rounds"
            style={{
              fontSize: 12,
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid var(--hair-strong)",
              background: "var(--surface)",
              color: "var(--ink-soft)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: 500,
              textDecoration: "none",
              boxShadow: "var(--shadow-card)",
            }}
          >
            Manage template
          </Link>
        </div>
      )}

      {/* Operational KPIs — hero card on the left + 4 secondary on the right.
          Hero uses the lg size with delta + the "headline" rate; secondaries
          use sm so the visual hierarchy does the work of explaining priority. */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr", gap: 10 }}>
        <KpiCard
          revealIndex={1}
          size="lg"
          label="Completion rate"
          value={current.rate}
          accent="blue-deep"
        />
        <KpiCard
          revealIndex={2}
          label="Rounds completed"
          value={String(current.completed)}
          accent="ink"
        />
        <KpiCard
          revealIndex={3}
          label="Open issues"
          value={String(current.open)}
          accent="red"
        />
        <KpiCard
          revealIndex={4}
          label="Resolved"
          value={String(current.resolved)}
          accent="green"
        />
        <KpiCard
          revealIndex={5}
          label="Active residents"
          value={String(current.census)}
          accent="plum"
        />
      </div>

      {/* QAPI Compliance — each card features the rate as a Fraunces italic
          headline, a soft gradient strength bar, and a small plum-accent CTA
          that pulls into focus on hover via the luxe-card-hover class. */}
      {qapiKpis.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionLabel accent="plum">
            QAPI Compliance — {range === "today" ? "today" : range === "week" ? "this week" : "this month"}
          </SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(qapiKpis.length, 3)},1fr)`, gap: 10 }}>
            {qapiKpis.map((q, i) => {
              const rateColor = q.rate === null ? "var(--muted)" : q.rate >= 90 ? "var(--green)" : q.rate >= 75 ? "var(--amber-mid)" : "var(--red)";
              const rateBg   = q.rate === null ? "var(--hair-soft)" : q.rate >= 90 ? "var(--green-tint)" : q.rate >= 75 ? "var(--amber-tint)" : "var(--red-tint)";
              const status = q.rate === null ? "—" : q.rate >= 90 ? "✓" : q.rate >= 75 ? "!" : "✗";
              return (
                <Link key={q.id} href={`/reports?qapi=${q.id}`} style={{ textDecoration: "none" }}>
                  <RefinedCard hoverable revealIndex={6 + i} padding="16px 18px">
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", lineHeight: 1.35, flex: 1, fontFamily: "var(--font-display)", letterSpacing: "-0.012em" }}>
                          {q.title}
                        </span>
                        {q.issues > 0 && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: "var(--red-tint)",
                              color: "var(--red)",
                              flexShrink: 0,
                              fontVariantNumeric: "tabular-nums",
                              letterSpacing: "0.02em",
                            }}
                          >
                            {q.issues} open
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
                        <div>
                          <div
                            style={{
                              fontSize: 40,
                              fontFamily: "var(--font-display)",
                              fontStyle: "italic",
                              fontWeight: 400,
                              color: rateColor,
                              lineHeight: 1,
                              letterSpacing: "-0.022em",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {q.rate !== null ? `${q.rate}%` : "—"}
                          </div>
                          <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--muted)", marginTop: 5, textTransform: "uppercase", letterSpacing: "0.13em" }}>
                            Compliance
                          </div>
                        </div>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: rateBg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: `1px solid ${rateColor}33`,
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,.6)",
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700, color: rateColor, lineHeight: 1 }}>{status}</div>
                        </div>
                      </div>
                      {q.rate !== null && (
                        <div
                          style={{
                            height: 5,
                            borderRadius: 999,
                            background: "var(--hair-soft)",
                            overflow: "hidden",
                            boxShadow: "inset 0 1px 1px rgba(20,23,28,.05)",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${q.rate}%`,
                              background: `linear-gradient(90deg, ${rateColor}cc, ${rateColor})`,
                              borderRadius: 999,
                              transition: "width 600ms var(--ease-luxe-out)",
                              boxShadow: `0 0 6px ${rateColor}40`,
                            }}
                          />
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>
                          {q.rounds > 0 ? `${q.rounds} rounds in range` : "No rounds in range"}
                        </span>
                        <span style={{ color: "var(--blue)", fontWeight: 500 }}>View report →</span>
                      </div>
                    </div>
                  </RefinedCard>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 2-column body */}
      <div className="luxe-reveal-body" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>

        {/* LEFT column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Completion rate area chart */}
          <RefinedCard padding="18px 20px 14px">
            <SectionLabel accent="blue" style={{ marginBottom: 14 }}>
              Completion Rate — {range === "today" ? "today by hour" : range === "week" ? "this week" : "this month"}
            </SectionLabel>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1A5FA8" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#1A5FA8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--hair-soft)" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0,100]} tick={{ fontSize: 10, fill: "var(--muted)", fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<RefinedTooltip unit="%" />} cursor={{ stroke: "var(--blue-mid)", strokeWidth: 1, strokeDasharray: "2 3" }} />
                <Area type="monotone" dataKey="rate" name="Rate" stroke="var(--blue)" strokeWidth={2} fill="url(#rateGrad)" dot={false} activeDot={{ r: 4, stroke: "var(--blue-deep)", strokeWidth: 2, fill: "var(--surface)" }} />
              </AreaChart>
            </ResponsiveContainer>
          </RefinedCard>

          {/* Issues raised vs resolved */}
          <RefinedCard padding="18px 20px 14px">
            <SectionLabel accent="red" style={{ marginBottom: 14 }}>
              Issues raised vs resolved
            </SectionLabel>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barGap={3}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--hair-soft)" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)", fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<RefinedTooltip />} cursor={{ fill: "var(--blue-wash)" }} />
                <Bar dataKey="raised" name="Raised" fill="var(--red-edge)" radius={[3,3,0,0]} maxBarSize={16} />
                <Bar dataKey="resolved" name="Resolved" fill="var(--green-edge)" radius={[3,3,0,0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </RefinedCard>

          {/* Angel completion + hourly mini */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <RefinedCard padding="14px 16px">
              <SectionLabel accent="green" style={{ marginBottom: 12 }}>
                Angel completion today
              </SectionLabel>
              {angelStats.map((a) => {
                const pct = a.total > 0 ? Math.round((a.rounds / a.total) * 100) : 0;
                const done = a.rounds === a.total && a.total > 0;
                return (
                  <div key={a.name} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>
                        {a.name.split(" ")[0]} {a.name.split(" ")[1]?.[0]}.
                      </span>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: done ? "var(--green)" : "var(--muted)", fontVariantNumeric: "tabular-nums", fontWeight: done ? 600 : 400 }}>
                        {a.rounds}/{a.total}
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 999, background: "var(--hair-soft)", overflow: "hidden", boxShadow: "inset 0 1px 1px rgba(20,23,28,.05)" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: done
                            ? "linear-gradient(90deg, var(--green-mid), var(--green))"
                            : "linear-gradient(90deg, var(--blue-mid), var(--blue))",
                          borderRadius: 999,
                          transition: "width 600ms var(--ease-luxe-out)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </RefinedCard>

            <RefinedCard padding="14px 16px">
              <SectionLabel accent="blue" style={{ marginBottom: 12 }}>
                Completions by hour <span style={{ textTransform: "lowercase", fontStyle: "italic", fontFamily: "var(--font-display)", letterSpacing: "0", fontWeight: 400 }}>· today</span>
              </SectionLabel>
              <ResponsiveContainer width="100%" height={94}>
                <BarChart data={hourlyData} margin={{ top: 0, right: 0, bottom: 0, left: -28 }}>
                  <XAxis dataKey="h" tick={{ fontSize: 9, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<RefinedTooltip />} cursor={{ fill: "var(--blue-wash)" }} />
                  <Bar dataKey="n" name="Rounds" fill="var(--blue-mid)" radius={[2,2,0,0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </RefinedCard>
          </div>
        </div>

        {/* RIGHT column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Watch List — clinical-editorial reframing of "open issues".
              Each entry treats the resident name as italic Fraunces, the
              question text in French quotes, and groups dept context tightly. */}
          <RefinedCard padding="16px 18px" style={{ flex: 1 }}>
            <SectionLabel accent="red" trailing={
              <Link href="/issues" style={{ fontSize: 11, color: "var(--blue)", fontWeight: 500, textDecoration: "none" }}>
                View all →
              </Link>
            }>
              Watch list
            </SectionLabel>
            <div style={{ marginTop: 14 }}>
              {openIssues.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: "24px 0", fontStyle: "italic", fontFamily: "var(--font-display)" }}>
                  No open concerns
                </div>
              ) : (
                openIssues.slice(0, 5).map((issue, idx, arr) => (
                  <div
                    key={issue.id}
                    style={{
                      borderBottom: idx < arr.length - 1 ? "1px solid var(--hair-soft)" : undefined,
                      padding: idx === 0 ? "0 0 12px" : "12px 0",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontFamily: "var(--font-display)",
                          fontStyle: "italic",
                          fontWeight: 400,
                          color: "var(--blue-ink)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {issue.residentName}
                      </span>
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                        Rm {issue.room}{issue.bed}
                      </span>
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 5, letterSpacing: "0.04em" }}>
                      {issue.angelName}
                      <span style={{ color: "var(--hair-strong)", margin: "0 5px" }}>·</span>
                      {issue.department}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.45, fontStyle: "italic" }}>
                      «&nbsp;{issue.questionText}&nbsp;»
                    </div>
                  </div>
                ))
              )}
            </div>
          </RefinedCard>

          {/* Census widget */}
          <RefinedCard padding="16px 18px">
            <SectionLabel accent="plum" style={{ marginBottom: 14 }}>Census</SectionLabel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 9 }}>
              <span
                style={{
                  fontSize: 44,
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontWeight: 400,
                  color: "var(--ink)",
                  lineHeight: 1,
                  letterSpacing: "-0.022em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {activeResidents}
              </span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>/ 55 beds</span>
            </div>
            {(() => {
              const pct = Math.round((activeResidents / 55) * 100);
              const tone =
                activeResidents / 55 >= 0.9
                  ? { color: "var(--green)", grad: "linear-gradient(90deg, var(--green-mid), var(--green))" }
                  : activeResidents / 55 >= 0.8
                    ? { color: "var(--amber-mid)", grad: "linear-gradient(90deg, #C58F2A, var(--amber-mid))" }
                    : { color: "var(--red-mid)", grad: "linear-gradient(90deg, #D24A4A, var(--red-mid))" };
              return (
                <>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: "var(--hair-soft)",
                      overflow: "hidden",
                      boxShadow: "inset 0 1px 2px rgba(20,23,28,.06)",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: tone.grad,
                        borderRadius: 999,
                        transition: "width 600ms var(--ease-luxe-out)",
                        boxShadow: `0 0 6px ${tone.color}40`,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: tone.color, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {pct}%
                    </span>
                    <span style={{ margin: "0 5px" }}>occupancy</span>
                    <span style={{ color: "var(--hair-strong)" }}>·</span>
                    <span style={{ marginLeft: 5 }}>{55 - activeResidents} beds available</span>
                  </div>
                </>
              );
            })()}
          </RefinedCard>
        </div>
      </div>
    </div>
  );
}
