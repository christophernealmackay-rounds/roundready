"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Download, ChevronDown, Search, FileText } from "lucide-react";
import { useRoundsStore } from "@/lib/store/useRoundsStore";
import { useIssuesStore } from "@/lib/store/useIssuesStore";
import { useQapiStore } from "@/lib/store/useQapiStore";
import { useResidentsStore } from "@/lib/store/useResidentsStore";
import { useResidentGroupsStore } from "@/lib/store/useResidentGroupsStore";
import GroupPills from "@/components/groups/GroupPills";
import { todayEndOfDay, todayIsoDate, formatDate } from "@/lib/dates";
import { PageHero, SectionLabel, RefinedCard, KpiCard, RefinedTooltip, Pill } from "@/components/ui";
import { qapiItemStats, qapiItemQuestionIds, recurringQuestions } from "@/lib/qapi/itemStats";

type DateRange = "month" | "30" | "7" | "yesterday" | "custom";

const TODAY = todayEndOfDay();

function rangeStart(r: DateRange): Date {
  const d = new Date(TODAY);
  if (r === "month") { d.setDate(1); d.setHours(0,0,0,0); return d; }
  if (r === "30") { d.setDate(d.getDate() - 29); d.setHours(0,0,0,0); return d; }
  if (r === "7") { d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d; }
  if (r === "yesterday") { d.setDate(d.getDate() - 1); d.setHours(0,0,0,0); return d; }
  return new Date(0);
}

function rangeEnd(r: DateRange): Date {
  if (r === "yesterday") { const d = new Date(TODAY); d.setHours(0,0,0,0); return d; }
  return TODAY;
}

const previousReports = [
  { name: "April 2026 — all residents", generated: "May 1", rounds: 1180, rate: "84%", issues: 38 },
  { name: "March 2026 — all residents", generated: "Apr 1", rounds: 1286, rate: "91%", issues: 9 },
  { name: "Jan 19–31, 2026 — surveyor prep", generated: "Feb 1", rounds: 186, rate: "95%", issues: 2 },
  { name: "January 2026 — all residents", generated: "Feb 1", rounds: 1240, rate: "88%", issues: 11 },
];

export default function ReportsPage() {
  const completedRounds = useRoundsStore((s) => s.completedRounds);
  const templates = useRoundsStore((s) => s.templates);
  const questions = useRoundsStore((s) => s.questions);
  const issues = useIssuesStore((s) => s.issues);
  const qapis = useQapiStore((s) => s.qapis);
  const residents = useResidentsStore((s) => s.residents);
  const groups = useResidentGroupsStore((s) => s.groups);

  const searchParams = useSearchParams();
  const qapiIdFromUrl = searchParams.get("qapi");
  const qapiItemIdFromUrl = searchParams.get("qapiItem");

  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [selectedQapi, setSelectedQapi] = useState("All QAPIs");
  const [reportMode, setReportMode] = useState<"aggregate" | "byItem">("aggregate");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  // Custom date inputs — also used to display the resolved range in the
  // generated report masthead when dateRange === 'custom'.
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  // Set true when the custom range was filled from a QAPI selection, so we
  // can surface a small "Range set from selected QAPI" hint to the user.
  const [rangeFromQapi, setRangeFromQapi] = useState(false);

  // When a specific QAPI is selected, switch to a custom range that matches
  // its lifecycle (date_identified through actual_completion, or today if
  // still active). The user can override the dates after.
  function applyQapiRange(title: string) {
    if (title === "All QAPIs") {
      setRangeFromQapi(false);
      return;
    }
    const match = qapis.find((q) => q.title === title);
    if (!match || !match.dateIdentified) {
      setRangeFromQapi(false);
      return;
    }
    setDateRange("custom");
    setCustomStart(match.dateIdentified);
    setCustomEnd(match.actualCompletion ?? todayIsoDate());
    setRangeFromQapi(true);
  }

  function pickQapi(title: string) {
    setSelectedQapi(title);
    applyQapiRange(title);
  }

  // Apply ?qapi=<id> on mount/hydrate so dashboard click-through pre-filters
  // the dropdown AND the date range.
  useEffect(() => {
    if (!qapiIdFromUrl) return;
    const match = qapis.find((q) => q.id === qapiIdFromUrl);
    if (match) {
      setSelectedQapi(match.title);
      applyQapiRange(match.title);
    }
    // applyQapiRange is stable enough for this single-shot effect; intentionally
    // not adding it to deps to avoid retriggering on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qapiIdFromUrl, qapis]);

  // Apply ?qapiItem=<id> — dashboard per-item card click-through. Scope to
  // the item's parent QAPI, switch to the by-item view, and pre-fill range.
  useEffect(() => {
    if (!qapiItemIdFromUrl) return;
    const parent = qapis.find((q) =>
      q.items.some((it) => it.id === qapiItemIdFromUrl),
    );
    if (parent) {
      setSelectedQapi(parent.title);
      applyQapiRange(parent.title);
      setReportMode("byItem");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qapiItemIdFromUrl, qapis]);

  const activeResidents = residents.filter((r) => r.status === "active");

  const [selectedResidents, setSelectedResidents] = useState<Set<string>>(
    () => new Set(activeResidents.map((r) => r.id))
  );
  const [ddOpen, setDdOpen] = useState(false);
  const [ddSearch, setDdSearch] = useState("");
  const [generated, setGenerated] = useState(false);
  const [printRequested, setPrintRequested] = useState(false);

  const filteredRes = activeResidents.filter((r) => r.name.toLowerCase().includes(ddSearch.toLowerCase()));
  const allSelected = selectedResidents.size === activeResidents.length;

  const dateRangePills: { id: DateRange; label: string }[] = [
    { id: "month",     label: "This month" },
    { id: "30",        label: "Last 30 days" },
    { id: "7",         label: "Last 7 days" },
    { id: "yesterday", label: "Yesterday" },
    { id: "custom",    label: "Custom range" },
  ];

  // Resolve the effective date window. For pill ranges, defer to the
  // module-level helpers. For "custom", parse the date input strings as
  // local-time start-of-day / end-of-day so the inclusion check matches
  // what a user expects to see in the inputs.
  function effectiveStart(): Date {
    if (dateRange === "custom" && customStart) {
      return new Date(`${customStart}T00:00:00`);
    }
    return rangeStart(dateRange);
  }
  function effectiveEnd(): Date {
    if (dateRange === "custom" && customEnd) {
      return new Date(`${customEnd}T23:59:59`);
    }
    return rangeEnd(dateRange);
  }

  const report = useMemo(() => {
    const start = effectiveStart();
    const end = effectiveEnd();

    const groupMembers = groupFilter
      ? new Set(groups.find((g) => g.id === groupFilter)?.memberIds ?? [])
      : null;

    function residentInScope(rid: string) {
      const groupOk = groupMembers ? groupMembers.has(rid) : true;
      const explicitOk = selectedResidents.size === 0 || selectedResidents.has(rid);
      return groupOk && explicitOk;
    }

    const inRange = completedRounds.filter((r) => {
      const d = new Date(r.completedAt);
      return d >= start && d <= end && residentInScope(r.residentId);
    });

    const issuesInRange = issues.filter((i) => {
      const d = new Date(i.createdAt);
      return d >= start && d <= end && residentInScope(i.residentId);
    });

    const resolved = issuesInRange.filter((i) => i.status === "resolved").length;
    const allAnswers = inRange.flatMap((r) => r.answers);
    const totalAnswers = allAnswers.length;
    const yesAnswers = allAnswers.filter((a) => a.answer).length;
    const rate = totalAnswers > 0 ? Math.round((yesAnswers / totalAnswers) * 100) : 0;

    // Per QAPI breakdown
    const activeTemplate = templates.find((t) => t.active && t.type === "angel");
    // Include archived QAPIs when explicitly selected — reports about
    // completed PIPs are a primary use case for the new lifecycle flow.
    // For "All QAPIs" keep the existing active-only filter.
    const qapiBars = qapis.filter((q) =>
      selectedQapi === "All QAPIs" ? q.status === "active" : q.title === selectedQapi
    ).map((qapi) => {
      const sections = activeTemplate?.sections.filter((s) => s.qapiId === qapi.id) ?? [];
      const qIds = sections.flatMap((s) => s.questions.map((q) => q.questionId));
      const qapiAnswers = inRange.flatMap((r) => r.answers.filter((a) => qIds.includes(a.questionId)));
      const yes = qapiAnswers.filter((a) => a.answer).length;
      const total = qapiAnswers.length;
      const qapiIssues = issuesInRange.filter((i) => sections.some((s) => s.questions.some((q) => q.text === i.questionText))).length;
      return { qapi: qapi.title.length > 18 ? qapi.title.slice(0, 18) + "…" : qapi.title, compliance: total > 0 ? Math.round((yes / total) * 100) : 0, issues: qapiIssues, rounds: inRange.length };
    });

    // Drilldown: per question
    const drilldown = questions.slice(0, 8).map((q) => {
      const answers = inRange.flatMap((r) => r.answers.filter((a) => a.questionId === q.id));
      const yes = answers.filter((a) => a.answer).length;
      const no = answers.length - yes;
      const iss = answers.filter((a) => a.issueFlagged).length;
      return { question: q.text.length > 42 ? q.text.slice(0, 42) + "…" : q.text, yes, no, issues: iss };
    }).filter((d) => d.yes + d.no > 0);

    // Per-QAPI-item report — clean rate, per-question breakdown, recurring.
    const targetQapis = qapis.filter((q) =>
      selectedQapi === "All QAPIs" ? q.status === "active" : q.title === selectedQapi
    );
    const itemReport = targetQapis.flatMap((qapi) =>
      [...qapi.items]
        .sort((a, b) => a.order - b.order)
        .filter((item) => qapiItemQuestionIds(item, activeTemplate).size > 0)
        .map((item) => {
          const stats = qapiItemStats(item, activeTemplate, inRange, start, end);
          const qIds = qapiItemQuestionIds(item, activeTemplate);
          const roundsTouched = inRange.filter((r) =>
            r.answers.some((a) => qIds.has(a.questionId)),
          ).length;
          return {
            qapiTitle: qapi.title,
            itemId: item.id,
            itemTitle: item.title,
            ...stats,
            roundsTouched,
            recurring: recurringQuestions(stats.byQuestion),
          };
        }),
    );

    return { rounds: inRange.length, rate: `${rate}%`, issues: issuesInRange.length, resolved, missed: 0, qapiBars, drilldown, itemReport };
  }, [completedRounds, issues, qapis, templates, questions, dateRange, customStart, customEnd, selectedQapi, selectedResidents, groupFilter, groups]);

  // The generated document is shown once "Generate" was pressed or there's
  // data in range. Both the JSX gate and the print effect key off this.
  const reportVisible =
    (generated || report.rounds > 0) &&
    (reportMode === "aggregate"
      ? report.qapiBars.length > 0
      : report.itemReport.length > 0);

  // Browser print-to-PDF. The @media print stylesheet isolates the
  // .report-print-target card; everything else is hidden. We wait until the
  // document is actually in the DOM before invoking the print dialog.
  useEffect(() => {
    if (printRequested && reportVisible) {
      const id = window.setTimeout(() => {
        window.print();
        setPrintRequested(false);
      }, 60);
      return () => window.clearTimeout(id);
    }
  }, [printRequested, reportVisible]);

  function handleGenerate() {
    setGenerated(true);
    requestAnimationFrame(() =>
      document
        .querySelector(".report-print-target")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function handleExportPdf() {
    setGenerated(true);
    setPrintRequested(true);
  }

  function handleExportCsv() {
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rangeLabel =
      dateRange === "custom" && customStart && customEnd
        ? `${customStart}_to_${customEnd}`
        : dateRange;
    const lines: string[] = [];
    lines.push(`Compliance report,${selectedQapi},${rangeLabel}`);
    lines.push(
      `Rounds completed,${report.rounds},Completion rate,${report.rate},Issues raised,${report.issues},Issues resolved,${report.resolved}`,
    );
    lines.push("");
    if (reportMode === "aggregate") {
      lines.push("Question,Yes,No,Issues");
      for (const d of report.drilldown) {
        lines.push([esc(d.question), d.yes, d.no, d.issues].join(","));
      }
    } else {
      lines.push("QAPI Item,Clean rate %,Answered,Flagged,Question,Yes,No,Issues");
      for (const it of report.itemReport) {
        for (const q of it.byQuestion) {
          lines.push(
            [
              esc(it.itemTitle),
              it.cleanRate ?? "",
              it.answered,
              it.flagged,
              esc(q.text),
              q.yes,
              q.no,
              q.issues,
            ].join(","),
          );
        }
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roundready-report-${rangeLabel}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-[1200px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      <PageHero
        eyebrow="Reports · Compliance Documentation"
        title="Compose,"
        accent="export, archive."
        caption="Build a compliance report from any combination of date range, QAPI, and resident group."
      />

      {/* Report builder — styled as a printer's worksheet on the same warm
          surface, with the masthead-style label up top setting expectation
          that what's being assembled below is a publishable document. */}
      <RefinedCard padding="22px 26px" revealIndex={0}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--hair-soft)" }}>
          <div>
            <div
              style={{
                fontSize: 10,
                color: "var(--plum)",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Worksheet
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: 22,
                fontWeight: 400,
                color: "var(--blue-ink)",
                letterSpacing: "-0.014em",
              }}
            >
              Generate a compliance report
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--muted)",
              fontFamily: "var(--font-mono)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Run on {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>

        {/* Group filter */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel accent="muted" style={{ marginBottom: 7 }}>Resident group</SectionLabel>
          <GroupPills selectedId={groupFilter} onChange={setGroupFilter} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 22, marginBottom: 18, alignItems: "flex-start" }}>
          {/* Date range */}
          <div>
            <SectionLabel accent="muted" style={{ marginBottom: 7 }}>Date range</SectionLabel>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {dateRangePills.map((p) => (
                <Pill
                  key={p.id}
                  active={dateRange === p.id}
                  onClick={() => {
                    setDateRange(p.id);
                    // Picking any other pill drops the "from QAPI" badge —
                    // the user is taking manual control of the window.
                    if (p.id !== "custom") setRangeFromQapi(false);
                  }}
                >
                  {p.label}
                </Pill>
              ))}
            </div>
            {dateRange === "custom" && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => { setCustomStart(e.target.value); setRangeFromQapi(false); }}
                    style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid var(--hair-strong)", background: "var(--surface)", fontSize: 12, color: "var(--ink)", outline: "none", fontFamily: "var(--font-mono)", boxShadow: "var(--shadow-card)" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic", fontFamily: "var(--font-display)" }}>through</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => { setCustomEnd(e.target.value); setRangeFromQapi(false); }}
                    style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid var(--hair-strong)", background: "var(--surface)", fontSize: 12, color: "var(--ink)", outline: "none", fontFamily: "var(--font-mono)", boxShadow: "var(--shadow-card)" }}
                  />
                </div>
                {rangeFromQapi && (
                  <span style={{ fontSize: 10.5, color: "var(--plum)", fontStyle: "italic", fontFamily: "var(--font-display)" }}>
                    Range set from selected QAPI
                  </span>
                )}
              </div>
            )}
          </div>

          {/* QAPI */}
          <div>
            <SectionLabel accent="muted" style={{ marginBottom: 7 }}>QAPI</SectionLabel>
            <select
              value={selectedQapi}
              onChange={(e) => pickQapi(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--hair-strong)",
                background: "var(--surface)",
                fontSize: 12,
                color: "var(--ink)",
                outline: "none",
                cursor: "pointer",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <option>All QAPIs</option>
              {qapis.map((q) => <option key={q.id}>{q.title}</option>)}
            </select>
          </div>

          {/* Report type */}
          <div>
            <SectionLabel accent="muted" style={{ marginBottom: 7 }}>Report type</SectionLabel>
            <div style={{ display: "flex", gap: 5 }}>
              <Pill active={reportMode === "aggregate"} onClick={() => setReportMode("aggregate")}>
                Aggregate
              </Pill>
              <Pill active={reportMode === "byItem"} onClick={() => setReportMode("byItem")}>
                By QAPI item
              </Pill>
            </div>
          </div>

          {/* Residents */}
          <div style={{ position: "relative" }}>
            <SectionLabel accent="muted" style={{ marginBottom: 7 }}>Residents</SectionLabel>
            <button
              onClick={() => setDdOpen((v) => !v)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--hair-strong)",
                background: "var(--surface)",
                fontSize: 12,
                color: "var(--ink)",
                outline: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 170,
                boxShadow: "var(--shadow-card)",
              }}
            >
              {allSelected ? "All residents" : `${selectedResidents.size} selected`}
              <ChevronDown size={12} style={{ marginLeft: "auto" }} />
            </button>
            {ddOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "var(--surface)", border: "1px solid var(--hair-strong)", borderRadius: 10, padding: 10, width: 220, boxShadow: "var(--shadow-lg)", marginTop: 4 }}>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Search size={11} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <input value={ddSearch} onChange={(e) => setDdSearch(e.target.value)} style={{ width: "100%", padding: "6px 8px 6px 24px", borderRadius: 7, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 12, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} placeholder="Search…" />
                </div>
                <div style={{ fontSize: 11, color: "var(--blue)", cursor: "pointer", marginBottom: 6, fontWeight: 500 }} onClick={() => setSelectedResidents(allSelected ? new Set() : new Set(activeResidents.map((r) => r.id)))}>
                  {allSelected ? "Deselect all" : "Select all"}
                </div>
                <div style={{ maxHeight: 180, overflowY: "auto" }}>
                  {filteredRes.map((r) => (
                    <div key={r.id} onClick={() => setSelectedResidents((prev) => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", cursor: "pointer", borderRadius: 5, fontSize: 12, color: "var(--ink-soft)" }}>
                      <input type="checkbox" checked={selectedResidents.has(r.id)} onChange={() => {}} style={{ cursor: "pointer" }} />
                      {r.name}
                    </div>
                  ))}
                </div>
                <button onClick={() => setDdOpen(false)} style={{ width: "100%", marginTop: 8, padding: "6px 0", borderRadius: 7, border: "none", background: "var(--blue)", color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Done</button>
              </div>
            )}
          </div>
        </div>

        {/* Preview KPIs — in-card mini scorecard. The values use the same
            mono treatment as the dashboard but at smaller scale so the
            worksheet stays compact. */}
        <SectionLabel accent="blue" style={{ marginBottom: 8 }}>Preview</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 18 }}>
          {[
            { label: "Completed", value: String(report.rounds), accent: "ink" as const },
            { label: "Rate",      value: report.rate,           accent: "blue-deep" as const },
            { label: "Issues",    value: String(report.issues), accent: "red" as const },
            { label: "Resolved",  value: String(report.resolved), accent: "green" as const },
            { label: "Missed",    value: String(report.missed), accent: "amber" as const },
          ].map((k) => (
            <KpiCard
              key={k.label}
              label={k.label}
              value={k.value}
              accent={k.accent}
              size="sm"
              style={{ background: "var(--surface-alt)" }}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, paddingTop: 14, borderTop: "1px solid var(--hair-soft)" }}>
          <button
            onClick={handleGenerate}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "none",
              background: "var(--blue)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 7,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 1px 2px rgba(7,43,82,.18)",
            }}
          >
            <FileText size={13} /> Generate report
          </button>
          <button onClick={handleExportPdf} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface)", color: "var(--ink-soft)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, boxShadow: "var(--shadow-card)" }}>
            <Download size={12} /> Export PDF
          </button>
          <button onClick={handleExportCsv} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface)", color: "var(--ink-soft)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, boxShadow: "var(--shadow-card)" }}>
            <Download size={12} /> Export CSV
          </button>
        </div>
      </RefinedCard>

      {/* Generated Report — styled as a real document mockup. The masthead
          uses Fraunces italic and a thin plum accent rule under the title;
          metadata sits in mono on the right; the scorecard grid + drilldown
          stack below as if they were typeset on the same page. The whole
          block sits on a slightly warmer surface to evoke paper. */}
      {reportVisible && (
        <RefinedCard
          revealIndex={1}
          padding="32px 40px 28px"
          className="report-print-target"
          style={{
            background: "linear-gradient(180deg, var(--surface), var(--surface-alt))",
          }}
        >
          {/* Masthead */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 32, paddingBottom: 16, borderBottom: "2px solid var(--blue-ink)", marginBottom: 24, position: "relative" }}>
            <span aria-hidden style={{ position: "absolute", left: 0, bottom: -2, width: 80, height: 2, background: "var(--plum)" }} />
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--plum)",
                  textTransform: "uppercase",
                  letterSpacing: "0.22em",
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Sunrise Gardens SNF · Compliance Report
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 30,
                  fontWeight: 400,
                  color: "var(--ink)",
                  letterSpacing: "-0.018em",
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                {selectedQapi === "All QAPIs" ? "All active QAPIs," : selectedQapi + ","}<br />
                <em style={{ color: "var(--blue-ink)", fontStyle: "italic", fontWeight: 400 }}>
                  {dateRange === "custom" && customStart && customEnd
                    ? `${formatDate(customStart)} – ${formatDate(customEnd)}`
                    : dateRangePills.find((p) => p.id === dateRange)?.label?.toLowerCase()}.
                </em>
              </h2>
            </div>
            <div
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--muted)",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.7,
              }}
            >
              <div>Issued {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
              <div>Document #{Math.floor(Math.random() * 9000 + 1000)}</div>
              <div style={{ color: "var(--blue)", marginTop: 4, fontWeight: 600, letterSpacing: "0.04em" }}>
                {selectedResidents.size === 0 || allSelected ? `${activeResidents.length} residents` : `${selectedResidents.size} residents`}
              </div>
            </div>
          </div>

          {/* Scorecard summary — printed-document style row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 0, marginBottom: 24, borderTop: "1px solid var(--hair)", borderBottom: "1px solid var(--hair)" }}>
            {[
              { label: "Rounds completed", value: String(report.rounds), accent: "ink" },
              { label: "Completion rate",  value: report.rate,           accent: "blue-deep" },
              { label: "Issues raised",    value: String(report.issues), accent: "red" },
              { label: "Issues resolved",  value: String(report.resolved), accent: "green" },
              { label: "Rounds missed",    value: String(report.missed), accent: "amber" },
            ].map((k, i, arr) => (
              <div
                key={k.label}
                style={{
                  padding: "16px 18px",
                  borderRight: i < arr.length - 1 ? "1px solid var(--hair-soft)" : undefined,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: k.accent === "ink" ? "var(--ink)" : k.accent === "blue-deep" ? "var(--blue-deep)" : k.accent === "red" ? "var(--red)" : k.accent === "green" ? "var(--green)" : "var(--amber-mid)",
                    fontFamily: "var(--font-mono)",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.01em",
                    lineHeight: 1,
                  }}
                >
                  {k.value}
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    color: "var(--muted)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.13em",
                    marginTop: 6,
                  }}
                >
                  {k.label}
                </div>
              </div>
            ))}
          </div>

          {/* Aggregate: two columns — QAPI breakdown + question drilldown.
              By item: one section per QAPI item with scorecard, recurring
              callout, and a per-question table. */}
          {reportMode === "aggregate" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {/* QAPI compliance bar chart */}
            <div>
              <SectionLabel accent="blue" style={{ marginBottom: 14 }}>QAPI compliance rate</SectionLabel>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={report.qapiBars} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--hair-soft)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted)", fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="qapi" tick={{ fontSize: 10, fill: "var(--ink-soft)", fontFamily: "var(--font-display)", fontStyle: "italic" }} tickLine={false} axisLine={false} width={100} />
                  <Tooltip content={<RefinedTooltip unit="%" />} cursor={{ fill: "var(--blue-wash)" }} />
                  <Bar dataKey="compliance" name="Compliance" fill="var(--blue-mid)" radius={[0,3,3,0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Drilldown table — typeset like a results table in a published study */}
            <div>
              <SectionLabel accent="amber" style={{ marginBottom: 14 }}>Question drilldown</SectionLabel>
              {report.drilldown.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", paddingTop: 24, fontStyle: "italic", fontFamily: "var(--font-display)" }}>
                  No data for selected filters
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--blue-ink)" }}>
                      {["Question", "Yes", "No", "Issues"].map((h) => (
                        <th key={h} style={{ textAlign: h === "Question" ? "left" : "right", padding: "6px 8px 10px", color: "var(--ink-soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.13em", fontSize: 9.5 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.drilldown.map((d, i) => (
                      <tr key={i} style={{ borderBottom: i < report.drilldown.length - 1 ? "1px solid var(--hair-soft)" : undefined }}>
                        <td style={{ padding: "9px 8px", color: "var(--ink-soft)", lineHeight: 1.4 }}>{d.question}</td>
                        <td style={{ padding: "9px 8px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--green)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{d.yes}</td>
                        <td style={{ padding: "9px 8px", textAlign: "right", fontFamily: "var(--font-mono)", color: d.no > 0 ? "var(--red)" : "var(--muted)", fontWeight: d.no > 0 ? 600 : 400, fontVariantNumeric: "tabular-nums" }}>{d.no}</td>
                        <td style={{ padding: "9px 8px", textAlign: "right", fontFamily: "var(--font-mono)", color: d.issues > 0 ? "var(--amber-mid)" : "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{d.issues}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
            {report.itemReport.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: "32px 0", fontStyle: "italic", fontFamily: "var(--font-display)" }}>
                No QAPI items with linked questions for this selection.
              </div>
            ) : report.itemReport.map((it) => {
              const rate = it.cleanRate;
              const rateColor = rate === null ? "var(--muted)" : rate >= 90 ? "var(--green)" : rate >= 75 ? "var(--amber-mid)" : "var(--red)";
              const cells = [
                { label: "Clean rate", value: rate !== null ? `${rate}%` : "—", color: rateColor },
                { label: "Answered", value: String(it.answered), color: "var(--ink)" },
                { label: "Flagged", value: String(it.flagged), color: it.flagged > 0 ? "var(--amber-mid)" : "var(--muted)" },
                { label: "Rounds", value: String(it.roundsTouched), color: "var(--ink)" },
              ];
              return (
                <div key={it.itemId}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--plum)", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 5 }}>
                      {it.qapiTitle}
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 400, color: "var(--blue-ink)", letterSpacing: "-0.014em" }}>
                      {it.itemTitle}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, marginBottom: 18, borderTop: "1px solid var(--hair)", borderBottom: "1px solid var(--hair)" }}>
                    {cells.map((c, i, arr) => (
                      <div key={c.label} style={{ padding: "14px 16px", borderRight: i < arr.length - 1 ? "1px solid var(--hair-soft)" : undefined }}>
                        <div style={{ fontSize: 26, fontWeight: 600, color: c.color, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", lineHeight: 1 }}>
                          {c.value}
                        </div>
                        <div style={{ fontSize: 9.5, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.13em", marginTop: 6 }}>
                          {c.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {it.recurring.length > 0 && (
                    <div style={{ background: "var(--amber-tint)", border: "1px solid var(--amber-edge)", borderRadius: 9, padding: "12px 14px", marginBottom: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--amber)", textTransform: "uppercase", letterSpacing: "0.13em", marginBottom: 8 }}>
                        ⚠ Recurring questions (≥3 issues)
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {it.recurring.map((q) => (
                          <div key={q.questionId} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, color: "var(--ink-soft)" }}>
                            <span style={{ lineHeight: 1.35 }}>{q.text}</span>
                            <span style={{ fontFamily: "var(--font-mono)", color: "var(--amber-mid)", fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                              {q.issues} issues
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <SectionLabel accent="amber" style={{ marginBottom: 12 }}>Per-question breakdown</SectionLabel>
                  {it.byQuestion.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", fontFamily: "var(--font-display)", padding: "8px 0" }}>
                      No answers recorded in this window.
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--blue-ink)" }}>
                          {["Question", "Yes", "No", "Issues"].map((h) => (
                            <th key={h} style={{ textAlign: h === "Question" ? "left" : "right", padding: "6px 8px 10px", color: "var(--ink-soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.13em", fontSize: 9.5 }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {it.byQuestion.map((d, i) => (
                          <tr key={d.questionId} style={{ borderBottom: i < it.byQuestion.length - 1 ? "1px solid var(--hair-soft)" : undefined }}>
                            <td style={{ padding: "9px 8px", color: "var(--ink-soft)", lineHeight: 1.4 }}>{d.text}</td>
                            <td style={{ padding: "9px 8px", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--green)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{d.yes}</td>
                            <td style={{ padding: "9px 8px", textAlign: "right", fontFamily: "var(--font-mono)", color: d.no > 0 ? "var(--red)" : "var(--muted)", fontWeight: d.no > 0 ? 600 : 400, fontVariantNumeric: "tabular-nums" }}>{d.no}</td>
                            <td style={{ padding: "9px 8px", textAlign: "right", fontFamily: "var(--font-mono)", color: d.issues > 0 ? "var(--amber-mid)" : "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{d.issues}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
          )}

          {/* Footer signature line */}
          <div style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid var(--hair)", display: "flex", justifyContent: "space-between", gap: 20 }}>
            <div style={{ fontSize: 10, color: "var(--muted)", fontStyle: "italic", fontFamily: "var(--font-display)" }}>
              Reviewed by the QAA Committee. Source: angel rounds and round-answer logs across the selected window.
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "var(--muted)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
              }}
            >
              Page 1 of 1
            </div>
          </div>
        </RefinedCard>
      )}

      {/* Previously generated reports — also given the editorial treatment */}
      <RefinedCard padding="18px 20px">
        <SectionLabel accent="muted" style={{ marginBottom: 12 }}>
          Previously generated reports
        </SectionLabel>
        {previousReports.map((r, i) => (
          <div
            key={r.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 0",
              borderBottom: i < previousReports.length - 1 ? "1px solid var(--hair-soft)" : undefined,
            }}
          >
            <FileText size={15} style={{ color: "var(--blue-mid)", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  color: "var(--blue-ink)",
                  letterSpacing: "-0.005em",
                }}
              >
                {r.name}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
                Generated {r.generated}
                <span style={{ color: "var(--hair-strong)", margin: "0 5px" }}>·</span>
                {r.rounds.toLocaleString()} rounds
                <span style={{ color: "var(--hair-strong)", margin: "0 5px" }}>·</span>
                {r.rate} rate
                <span style={{ color: "var(--hair-strong)", margin: "0 5px" }}>·</span>
                {r.issues} issues
              </div>
            </div>
            <button
              disabled
              title="Archived report storage is not available in this demo"
              style={{
                fontSize: 11,
                padding: "5px 12px",
                borderRadius: 7,
                border: "1px solid var(--hair-strong)",
                background: "var(--surface)",
                color: "var(--ink-soft)",
                cursor: "not-allowed",
                opacity: 0.5,
                display: "flex",
                alignItems: "center",
                gap: 5,
                boxShadow: "var(--shadow-card)",
              }}
            >
              <Download size={11} /> PDF
            </button>
          </div>
        ))}
      </RefinedCard>
    </div>
  );
}
