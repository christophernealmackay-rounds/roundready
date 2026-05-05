"use client";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Download, Filter } from "lucide-react";

const reportData = [
  { qapi: "Fall Prevention",    compliance: 92, issues: 3, rounds: 48 },
  { qapi: "Pressure Injury",    compliance: 88, issues: 7, rounds: 48 },
  { qapi: "Hydration/Nutrition",compliance: 79, issues: 12, rounds: 48 },
  { qapi: "Skin Integrity",     compliance: 91, issues: 4, rounds: 48 },
  { qapi: "Catheter Care",      compliance: 84, issues: 6, rounds: 48 },
];

const drilldown = [
  { question: "Is the call light within reach?",           yes: 46, no: 2, issues: 2 },
  { question: "Are bed rails in proper position?",          yes: 48, no: 0, issues: 0 },
  { question: "Is the floor free of fall hazards?",         yes: 45, no: 3, issues: 1 },
  { question: "Are non-slip footwear accessible?",          yes: 44, no: 4, issues: 4 },
  { question: "Is fall risk assessment current?",           yes: 47, no: 1, issues: 1 },
];

export default function ReportsPage() {
  const [selectedQapi, setSelectedQapi] = useState("All QAPIs");

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>Reports</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Aggregated rounding and compliance data</p>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "var(--surface)", border: "1px solid var(--hair)",
          borderRadius: 8, padding: "8px 14px", fontSize: 12,
          color: "var(--ink-soft)", boxShadow: "var(--shadow-sm)", cursor: "pointer",
        }}>
          <Download size={13} color="var(--muted)" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-xs)" }}>
        <Filter size={13} color="var(--muted)" />
        {[
          { label: "Date Range", value: "Apr 7 – May 5, 2026" },
          { label: "Resident", value: "All Residents" },
          { label: "QAPI", value: selectedQapi },
          { label: "Angel", value: "All Angels" },
        ].map(f => (
          <div key={f.label} className="flex items-center gap-1.5">
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.04em" }}>{f.label.toUpperCase()}:</span>
            <select
              value={f.value}
              onChange={e => f.label === "QAPI" && setSelectedQapi(e.target.value)}
              style={{
                fontSize: 12, fontWeight: 500, color: "var(--ink-soft)",
                background: "var(--surface-alt)", border: "1px solid var(--hair)",
                borderRadius: 6, padding: "4px 8px", cursor: "pointer", outline: "none",
              }}
            >
              <option>{f.value}</option>
              {f.label === "QAPI" && reportData.map(r => <option key={r.qapi}>{r.qapi}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Rounds Completed", value: "240", sub: "of 240 scheduled" },
          { label: "Overall Compliance", value: "87%", sub: "+4% vs prior period" },
          { label: "Issues Flagged", value: "32", sub: "14 resolved, 18 open" },
          { label: "Avg Completion Rate", value: "91%", sub: "Across all angels" },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
            <p style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</p>
            <p style={{ fontSize: 26, fontWeight: 600, color: "var(--blue)", fontFamily: "var(--font-mono)", margin: "4px 0 2px" }}>{k.value}</p>
            <p style={{ fontSize: 11, color: "var(--faint)" }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart + Table split */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
          <p className="section-label mb-4">Compliance by QAPI</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={reportData} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hair)" horizontal={false} />
              <XAxis type="number" domain={[0,100]} unit="%" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="qapi" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [`${v}%`, "Compliance"]}
              />
              <Bar dataKey="compliance" fill="var(--blue)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-3 rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--hair)" }}>
            <p className="section-label">QAPI Summary</p>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--hair)" }}>
                {["QAPI", "Rounds", "Compliance", "Issues", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 section-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, i) => (
                <tr key={row.qapi} style={{ borderTop: i > 0 ? "1px solid var(--hair-soft)" : undefined }}>
                  <td className="px-5 py-3" style={{ fontWeight: 500, color: "var(--ink)" }}>{row.qapi}</td>
                  <td className="px-5 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-soft)" }}>{row.rounds}</td>
                  <td className="px-5 py-3">
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
                      color: row.compliance >= 90 ? "var(--green)" : row.compliance >= 80 ? "var(--amber)" : "var(--red)",
                    }}>
                      {row.compliance}%
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {row.issues > 0 ? (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--red-tint)", color: "var(--red)" }}>
                        {row.issues} issues
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--faint)" }}>None</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <button style={{ fontSize: 12, fontWeight: 500, color: "var(--blue)", background: "none", border: "none", cursor: "pointer" }}>
                      Detail →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drilldown */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--hair)" }}>
          <p className="section-label">Question Drilldown — Fall Prevention</p>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--hair)" }}>
              {["Question", "Yes", "No", "Compliance", "Issues"].map(h => (
                <th key={h} className="text-left px-5 py-3 section-label">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drilldown.map((row, i) => (
              <tr key={row.question} style={{ borderTop: i > 0 ? "1px solid var(--hair-soft)" : undefined }}>
                <td className="px-5 py-3" style={{ color: "var(--ink-soft)", maxWidth: 320 }}>{row.question}</td>
                <td className="px-5 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--green)" }}>{row.yes}</td>
                <td className="px-5 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: row.no > 0 ? "var(--red)" : "var(--faint)" }}>{row.no}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div style={{ width: 60, height: 6, borderRadius: 999, background: "var(--hair)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.round(row.yes/(row.yes+row.no)*100)}%`, background: "var(--blue)", borderRadius: 999 }} />
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{Math.round(row.yes/(row.yes+row.no)*100)}%</span>
                  </div>
                </td>
                <td className="px-5 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: row.issues > 0 ? "var(--red)" : "var(--faint)" }}>{row.issues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
