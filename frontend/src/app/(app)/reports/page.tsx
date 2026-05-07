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

type DateRange = "month" | "30" | "7" | "yesterday" | "custom";

const TODAY = new Date("2026-05-06T23:59:59");

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

  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [selectedQapi, setSelectedQapi] = useState("All QAPIs");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);

  // Apply ?qapi=<id> on mount/hydrate so dashboard click-through pre-filters.
  useEffect(() => {
    if (!qapiIdFromUrl) return;
    const match = qapis.find((q) => q.id === qapiIdFromUrl);
    if (match) setSelectedQapi(match.title);
  }, [qapiIdFromUrl, qapis]);

  const activeResidents = residents.filter((r) => r.status === "active");

  const [selectedResidents, setSelectedResidents] = useState<Set<string>>(
    () => new Set(activeResidents.map((r) => r.id))
  );
  const [ddOpen, setDdOpen] = useState(false);
  const [ddSearch, setDdSearch] = useState("");
  const [generated, setGenerated] = useState(false);

  const filteredRes = activeResidents.filter((r) => r.name.toLowerCase().includes(ddSearch.toLowerCase()));
  const allSelected = selectedResidents.size === activeResidents.length;

  const dateRangePills: { id: DateRange; label: string }[] = [
    { id: "month",     label: "This month" },
    { id: "30",        label: "Last 30 days" },
    { id: "7",         label: "Last 7 days" },
    { id: "yesterday", label: "Yesterday" },
    { id: "custom",    label: "Custom range" },
  ];

  const report = useMemo(() => {
    const start = rangeStart(dateRange);
    const end = rangeEnd(dateRange);

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
    const qapiBars = qapis.filter((q) => q.status === "active" && (selectedQapi === "All QAPIs" || q.title === selectedQapi)).map((qapi) => {
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

    return { rounds: inRange.length, rate: `${rate}%`, issues: issuesInRange.length, resolved, missed: 0, qapiBars, drilldown };
  }, [completedRounds, issues, qapis, templates, questions, dateRange, selectedQapi, selectedResidents, groupFilter, groups]);

  return (
    <div className="max-w-[1200px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>Reports</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Generate and export compliance reports</p>
        </div>
      </div>

      {/* Report builder */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "18px 20px", boxShadow: "var(--shadow-sm)" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 16 }}>Generate compliance report</div>

        {/* Group filter (wings + custom carts) */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Resident group</div>
          <GroupPills selectedId={groupFilter} onChange={setGroupFilter} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16, alignItems: "flex-start" }}>
          {/* Date range */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Date range</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {dateRangePills.map((p) => (
                <button key={p.id} onClick={() => setDateRange(p.id)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: `1px solid ${dateRange === p.id ? "var(--blue)" : "var(--hair-strong)"}`, background: dateRange === p.id ? "var(--blue-tint)" : "var(--surface)", color: dateRange === p.id ? "var(--blue)" : "var(--muted)", cursor: "pointer", fontWeight: 500, transition: "all 0.15s" }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* QAPI */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>QAPI</div>
            <select value={selectedQapi} onChange={(e) => setSelectedQapi(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 12, color: "var(--ink)", outline: "none", cursor: "pointer" }}>
              <option>All QAPIs</option>
              {qapis.filter((q) => q.status === "active").map((q) => <option key={q.id}>{q.title}</option>)}
            </select>
          </div>

          {/* Residents */}
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Residents</div>
            <button onClick={() => setDdOpen((v) => !v)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 12, color: "var(--ink)", outline: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, minWidth: 160 }}>
              {allSelected ? "All residents" : `${selectedResidents.size} selected`}
              <ChevronDown size={12} style={{ marginLeft: "auto" }} />
            </button>
            {ddOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 10, padding: 10, width: 220, boxShadow: "var(--shadow-md)", marginTop: 4 }}>
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

        {/* Preview KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Completed", value: String(report.rounds), color: "var(--ink)" },
            { label: "Rate",      value: report.rate,           color: "var(--blue)" },
            { label: "Issues",    value: String(report.issues), color: "var(--red)" },
            { label: "Resolved",  value: String(report.resolved), color: "var(--green)" },
            { label: "Missed",    value: String(report.missed), color: "var(--amber)" },
          ].map((k) => (
            <div key={k.label} style={{ background: "var(--surface-alt)", border: "1px solid var(--hair)", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: k.color, lineHeight: 1, fontFamily: "var(--font-mono)" }}>{k.value}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setGenerated(true)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--blue)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <FileText size={13} /> Generate report
          </button>
          <button style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <Download size={12} /> Export PDF
          </button>
          <button style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* Generated Report */}
      {(generated || report.rounds > 0) && report.qapiBars.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* QAPI compliance bar chart */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "16px 20px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>QAPI Compliance Rate</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={report.qapiBars} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hair)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="qapi" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={90} />
                <Tooltip formatter={(v) => [`${v}%`, "Compliance"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--hair)" }} />
                <Bar dataKey="compliance" fill="var(--blue-mid)" radius={[0,3,3,0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Drilldown table */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "16px 20px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Question Drilldown</div>
            {report.drilldown.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", paddingTop: 24 }}>No data for selected filters</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--hair)" }}>
                    {["Question","Yes","No","Issues"].map((h) => <th key={h} style={{ textAlign: "left", padding: "4px 6px 8px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 9 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {report.drilldown.map((d, i) => (
                    <tr key={i} style={{ borderBottom: i < report.drilldown.length - 1 ? "1px solid var(--hair-soft)" : undefined }}>
                      <td style={{ padding: "8px 6px", color: "var(--ink-soft)", lineHeight: 1.3 }}>{d.question}</td>
                      <td style={{ padding: "8px 6px", fontFamily: "var(--font-mono)", color: "var(--green)", fontWeight: 600 }}>{d.yes}</td>
                      <td style={{ padding: "8px 6px", fontFamily: "var(--font-mono)", color: d.no > 0 ? "var(--red)" : "var(--muted)", fontWeight: d.no > 0 ? 600 : 400 }}>{d.no}</td>
                      <td style={{ padding: "8px 6px", fontFamily: "var(--font-mono)", color: d.issues > 0 ? "var(--amber)" : "var(--muted)" }}>{d.issues}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Previously generated reports */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "16px 20px", boxShadow: "var(--shadow-sm)" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Previously Generated Reports</div>
        {previousReports.map((r, i) => (
          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < previousReports.length - 1 ? "1px solid var(--hair-soft)" : undefined }}>
            <FileText size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>{r.name}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>Generated {r.generated} · {r.rounds.toLocaleString()} rounds · {r.rate} rate · {r.issues} issues</div>
            </div>
            <button style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Download size={11} /> PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
