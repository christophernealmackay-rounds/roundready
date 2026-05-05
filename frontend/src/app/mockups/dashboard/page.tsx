"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, Calendar, ChevronDown, ClipboardList } from "lucide-react";

/* QAPI items visible in the selected date window */
const qapiItems = [
  {
    id: 1, qapiTitle: "Fall Prevention", itemTitle: "Enhanced Environmental Safety Protocol",
    monitoring: "rounds", compliance: 92, trend: "up", delta: "+3%",
    responsible: "Maria Rodriguez", expectedCompletion: "Jun 30, 2026", color: "green",
  },
  {
    id: 2, qapiTitle: "Fall Prevention", itemTitle: "High-Risk Resident ID & Care Planning",
    monitoring: "cadence", compliance: 100, trend: "flat", delta: "0%",
    responsible: "Patricia Nguyen", expectedCompletion: "Mar 31, 2026", color: "green",
  },
  {
    id: 3, qapiTitle: "Pressure Injury", itemTitle: "Skin Integrity Rounding Protocol",
    monitoring: "rounds", compliance: 88, trend: "down", delta: "-2%",
    responsible: "Maria Rodriguez", expectedCompletion: "Jul 31, 2026", color: "amber",
  },
  {
    id: 4, qapiTitle: "Hydration & Nutrition", itemTitle: "Daily Fluid & Meal Monitoring",
    monitoring: "rounds", compliance: 79, trend: "down", delta: "-5%",
    responsible: "James Thompson", expectedCompletion: "Aug 31, 2026", color: "red",
  },
  {
    id: 5, qapiTitle: "Hydration & Nutrition", itemTitle: "Monthly Weight Monitoring Review",
    monitoring: "cadence", compliance: 100, trend: "up", delta: "+0%",
    responsible: "Patricia Nguyen", expectedCompletion: "Sep 1, 2026", color: "green",
  },
];

const angelData = [
  { name: "Maria R.", completed: 96 },
  { name: "James T.", completed: 88 },
  { name: "Sandra K.", completed: 73 },
  { name: "David M.", completed: 91 },
  { name: "Linda P.", completed: 100 },
];

const trendData = [
  { week: "Apr 7",  rate: 84 },
  { week: "Apr 14", rate: 87 },
  { week: "Apr 21", rate: 83 },
  { week: "Apr 28", rate: 89 },
  { week: "May 5",  rate: 91 },
];

const statusColor: Record<string, { bg: string; text: string; border: string }> = {
  green: { bg: "var(--green-tint)", text: "var(--green)", border: "var(--green-edge)" },
  amber: { bg: "var(--amber-tint)", text: "var(--amber)", border: "var(--amber-edge)" },
  red:   { bg: "var(--red-tint)",   text: "var(--red)",   border: "var(--red-edge)"   },
};

const monitoringLabel: Record<string, string> = {
  rounds:     "Via Rounds",
  cadence:    "Scheduled",
  completion: "Completion",
};

export default function DashboardPage() {
  return (
    <div className="max-w-[1280px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Performance overview · Sunrise Gardens SNF</p>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "var(--surface)", border: "1px solid var(--hair)",
          borderRadius: 8, padding: "8px 14px", fontSize: 12,
          color: "var(--ink-soft)", boxShadow: "var(--shadow-sm)", cursor: "pointer",
        }}>
          <Calendar size={13} color="var(--muted)" />
          Apr 7 – May 5, 2026
          <ChevronDown size={13} color="var(--muted)" />
        </button>
      </div>

      {/* QAPI Item Cards */}
      <section>
        <p className="section-label mb-3">QAPI Items — Active in Period</p>
        <div className="grid grid-cols-3 gap-4">
          {qapiItems.map(item => {
            const c = statusColor[item.color];
            return (
              <div
                key={item.id}
                className="rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-px"
                style={{ background: "var(--surface)", border: `1px solid ${c.border}`, boxShadow: "var(--shadow-sm)" }}
              >
                {/* QAPI parent label */}
                <div className="flex items-start justify-between mb-1">
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {item.qapiTitle}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: c.bg, color: c.text }}>
                    {monitoringLabel[item.monitoring]}
                  </span>
                </div>

                {/* Item name */}
                <div className="flex items-start gap-1.5 mb-3">
                  <ClipboardList size={12} color="var(--blue-mid)" style={{ marginTop: 1, flexShrink: 0 }} />
                  <p style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)", lineHeight: 1.4 }}>{item.itemTitle}</p>
                </div>

                {/* Metric */}
                {item.monitoring === "rounds" && (
                  <div className="flex items-end gap-2 mb-3">
                    <span style={{ fontSize: 28, fontWeight: 600, color: c.text, fontFamily: "var(--font-mono)" }}>
                      {item.compliance}%
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: c.text, marginBottom: 4 }}>
                      {item.trend === "up" ? <TrendingUp size={12} /> : item.trend === "down" ? <TrendingDown size={12} /> : null}
                      {item.delta} vs last period
                    </span>
                  </div>
                )}
                {item.monitoring === "cadence" && (
                  <div className="mb-3">
                    <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>On Schedule</span>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--hair-soft)" }}>
                  <span style={{ fontSize: 11, color: "var(--faint)" }}>{item.responsible}</span>
                  <span style={{ fontSize: 11, color: "var(--faint)", fontFamily: "var(--font-mono)" }}>Due {item.expectedCompletion}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Charts row */}
      <div className="grid grid-cols-5 gap-4">
        <section className="col-span-3 rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
          <p className="section-label mb-4">Angel Completion Rate</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={angelData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hair)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [`${v}%`, "Completion"]}
              />
              <Bar dataKey="completed" fill="var(--blue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="col-span-2 rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
          <p className="section-label mb-1">Facility Trend</p>
          <div style={{ fontSize: 28, fontWeight: 600, color: "var(--blue)", fontFamily: "var(--font-mono)", margin: "6px 0 12px" }}>
            91%
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--green)", marginLeft: 8 }}>↑ +7% this month</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={trendData} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hair)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[70, 100]} unit="%" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [`${v}%`, "Rate"]}
              />
              <Bar dataKey="rate" fill="var(--blue-pale)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* Angel detail table */}
      <section className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--hair)" }}>
          <p className="section-label">Angel Detail</p>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--surface-alt)" }}>
              {["Angel", "Department", "Residents", "Rounds Completed", "Completion Rate", "Status"].map(h => (
                <th key={h} className="text-left px-5 py-3 section-label">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { name: "Maria Rodriguez", dept: "Nursing",      residents: 8, completed: 24, rate: 96 },
              { name: "James Thompson",  dept: "Dietary",      residents: 7, completed: 21, rate: 88 },
              { name: "Sandra Kim",      dept: "Activities",   residents: 9, completed: 22, rate: 73 },
              { name: "David Martinez",  dept: "Therapy",      residents: 8, completed: 25, rate: 91 },
              { name: "Linda Patterson", dept: "Housekeeping", residents: 6, completed: 18, rate: 100 },
            ].map((angel, i) => (
              <tr key={angel.name} style={{ borderTop: i > 0 ? "1px solid var(--hair-soft)" : undefined }}>
                <td className="px-5 py-3" style={{ fontWeight: 500, color: "var(--ink)" }}>{angel.name}</td>
                <td className="px-5 py-3" style={{ color: "var(--muted)" }}>{angel.dept}</td>
                <td className="px-5 py-3" style={{ fontFamily: "var(--font-mono)", color: "var(--ink-soft)" }}>{angel.residents}</td>
                <td className="px-5 py-3" style={{ fontFamily: "var(--font-mono)", color: "var(--ink-soft)" }}>{angel.completed}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--hair)", maxWidth: 80 }}>
                      <div className="h-full rounded-full" style={{
                        width: `${angel.rate}%`,
                        background: angel.rate >= 90 ? "var(--green-mid)" : angel.rate >= 80 ? "var(--amber-mid)" : "var(--red-mid)",
                      }} />
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-soft)" }}>{angel.rate}%</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--green-tint)", color: "var(--green)" }}>Active</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
