"use client";
import { useState } from "react";
import { Plus, ChevronDown, ChevronRight, Archive, X } from "lucide-react";

type QapiItem = {
  id: number;
  rootCause: string;
  systemicChange: string;
  monitoringType: "rounds" | "completion" | "cadence";
  monitoringDetail: string;
  responsible: string;
  startDate: string;
  expectedCompletion: string;
};

type Qapi = {
  id: number;
  title: string;
  issuesIdentified: string;
  dateIdentified: string;
  status: "active" | "archived";
  items: QapiItem[];
};

const initialQapis: Qapi[] = [
  {
    id: 1, title: "Fall Prevention Program", status: "active",
    issuesIdentified: "Increasing fall rate in Wing B — 4 falls reported in Q4 2025, up from 1 in Q3.",
    dateIdentified: "2025-11-15",
    items: [
      {
        id: 1,
        rootCause: "Environmental hazards not consistently identified during nursing rounds.",
        systemicChange: "Revised angel rounding checklist to include 4 mandatory environmental safety checkpoints. All Nursing angels trained on updated protocol.",
        monitoringType: "rounds", monitoringDetail: "Nursing Angel — per round completion",
        responsible: "Maria Rodriguez", startDate: "2025-12-01", expectedCompletion: "2026-06-30",
      },
      {
        id: 2,
        rootCause: "High-risk residents not consistently flagged or reassessed after incidents.",
        systemicChange: "Implemented mandatory fall risk reassessment within 24 hours of any fall event. MDS coordinator to review care plans monthly.",
        monitoringType: "cadence", monitoringDetail: "MDS Coordinator — monthly audit",
        responsible: "Patricia Nguyen", startDate: "2025-12-15", expectedCompletion: "2026-03-31",
      },
    ],
  },
  {
    id: 2, title: "Pressure Injury Prevention", status: "active",
    issuesIdentified: "Two Stage II pressure injuries identified in January 2026 during routine skin assessment.",
    dateIdentified: "2026-01-10",
    items: [
      {
        id: 3,
        rootCause: "Repositioning intervals not consistently followed during night shift.",
        systemicChange: "Added skin integrity checkpoints to night shift angel rounds. Repositioning documentation required every 2 hours.",
        monitoringType: "rounds", monitoringDetail: "Nursing Angel — per round completion",
        responsible: "Maria Rodriguez", startDate: "2026-01-20", expectedCompletion: "2026-07-31",
      },
    ],
  },
  {
    id: 3, title: "Hydration & Nutrition Monitoring", status: "active",
    issuesIdentified: "MDS data shows 3 residents with unintended weight loss >5% over 30 days in Feb 2026.",
    dateIdentified: "2026-02-20",
    items: [
      {
        id: 4,
        rootCause: "Meal and fluid intake documentation incomplete — estimated at 60% completion rate.",
        systemicChange: "Dietary angel to document fluid intake and meal completion percentage at each meal. Charge nurse notified if resident misses >2 consecutive meals.",
        monitoringType: "rounds", monitoringDetail: "Dietary Angel — per meal round",
        responsible: "James Thompson", startDate: "2026-03-01", expectedCompletion: "2026-08-31",
      },
      {
        id: 5,
        rootCause: "Weight trends not reviewed with interdisciplinary team until quarterly MDS.",
        systemicChange: "Implement monthly weight review in IDT meeting with Dietary, Nursing, and Medical Records.",
        monitoringType: "cadence", monitoringDetail: "IDT — monthly review",
        responsible: "Patricia Nguyen", startDate: "2026-03-01", expectedCompletion: "2026-09-01",
      },
    ],
  },
];

const monitoringBadge: Record<string, { label: string; bg: string; color: string }> = {
  rounds:     { label: "Via Rounds",  bg: "var(--blue-tint)",  color: "var(--blue)"  },
  completion: { label: "Completion",  bg: "var(--green-tint)", color: "var(--green)" },
  cadence:    { label: "Scheduled",   bg: "var(--plum-tint)",  color: "var(--plum)"  },
};

const fieldStyle = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--hair)", background: "var(--surface-alt)",
  fontSize: 13, color: "var(--ink)", outline: "none",
} as React.CSSProperties;

const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
  textTransform: "uppercase" as const, color: "var(--muted)", marginBottom: 4,
};

const colHeaders = [
  { label: "Root Cause",                                    width: "20%" },
  { label: "Systemic Change to Correct Identified Issue",   width: "28%" },
  { label: "How Will This Be Monitored?",                   width: "20%" },
  { label: "Person(s) Responsible",                        width: "16%" },
  { label: "Expected Date of Completion",                   width: "16%" },
];

const tabs = ["QAPIs", "QAA Notes"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function QapiPage() {
  const [activeTab, setActiveTab]   = useState("QAPIs");
  const [expanded, setExpanded]     = useState<number[]>([1, 2, 3]);
  const [addQapiOpen, setAddQapiOpen] = useState(false);
  const [addItemFor, setAddItemFor] = useState<number | null>(null);
  const [notes, setNotes] = useState(
    `QAA Committee Meeting — May 5, 2026\nAttendees: C. Mackay (DON), P. Nguyen (Charge RN), M. Rodriguez (Nursing Angel)\n\nAgenda:\n1. Review Q1 QAPI outcomes\n2. Fall prevention program update\n3. New rapid round protocol discussion\n\nNotes:\n— Fall rates decreased 12% vs Q4 2025 following new repositioning protocol.\n— Hydration monitoring compliance needs improvement (79%). Action: James Thompson to conduct additional dietary rounds.\n— Next meeting: June 2, 2026`
  );

  const toggle = (id: number) =>
    setExpanded(e => e.includes(id) ? e.filter(x => x !== id) : [...e, id]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>QAPI</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Quality Assurance &amp; Performance Improvement</p>
        </div>
        {activeTab === "QAPIs" && (
          <button onClick={() => setAddQapiOpen(true)} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "var(--blue)", color: "#fff", border: "none",
            borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}>
            <Plus size={14} /> New QAPI
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--hair)" }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "10px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer",
            background: "none", border: "none",
            color: activeTab === tab ? "var(--blue)" : "var(--muted)",
            borderBottom: activeTab === tab ? "2px solid var(--blue)" : "2px solid transparent",
            transition: "all 0.2s", marginBottom: -1,
          }}>{tab}</button>
        ))}
      </div>

      {/* QAPI list */}
      {activeTab === "QAPIs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {initialQapis.map(qapi => {
            const isOpen = expanded.includes(qapi.id);
            return (
              <div key={qapi.id} style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>

                {/* QAPI section header */}
                <div
                  onClick={() => toggle(qapi.id)}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 20px", cursor: "pointer", background: "var(--surface)", borderBottom: isOpen ? "1px solid var(--hair)" : "none" }}
                >
                  <div style={{ paddingTop: 2, flexShrink: 0 }}>
                    {isOpen
                      ? <ChevronDown size={15} color="var(--blue)" />
                      : <ChevronRight size={15} color="var(--muted)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>{qapi.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "var(--green-tint)", color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Active</span>
                      <span style={{ fontSize: 11.5, color: "var(--faint)" }}>·</span>
                      <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{qapi.items.length} item{qapi.items.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ display: "flex", gap: 20, marginTop: 5, flexWrap: "wrap" }}>
                      <p style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em" }}>Issue identified: </span>
                        {qapi.issuesIdentified}
                      </p>
                    </div>
                    <p style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>
                      Date identified: {fmtDate(qapi.dateIdentified)}
                    </p>
                  </div>
                  <button
                    onClick={e => e.stopPropagation()}
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                  >
                    <Archive size={12} /> Archive
                  </button>
                </div>

                {/* Items table */}
                {isOpen && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                      <colgroup>
                        {colHeaders.map(c => <col key={c.label} style={{ width: c.width }} />)}
                      </colgroup>
                      <thead>
                        <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--hair)" }}>
                          {colHeaders.map(c => (
                            <th key={c.label} style={{
                              textAlign: "left", padding: "9px 14px",
                              fontSize: 10, fontWeight: 700, color: "var(--muted)",
                              textTransform: "uppercase", letterSpacing: "0.07em",
                              lineHeight: 1.35,
                            }}>{c.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {qapi.items.map((item, idx) => {
                          const mb = monitoringBadge[item.monitoringType];
                          return (
                            <tr
                              key={item.id}
                              style={{
                                borderTop: idx > 0 ? "1px solid var(--hair-soft)" : undefined,
                                background: idx % 2 === 1 ? "var(--surface-alt)" : "var(--surface)",
                              }}
                            >
                              {/* Root Cause */}
                              <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                                <p style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.55 }}>{item.rootCause}</p>
                              </td>
                              {/* Systemic Change */}
                              <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                                <p style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.55 }}>{item.systemicChange}</p>
                              </td>
                              {/* Monitoring */}
                              <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                                <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: mb.bg, color: mb.color, marginBottom: 5 }}>
                                  {mb.label}
                                </span>
                                <p style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>{item.monitoringDetail}</p>
                              </td>
                              {/* Responsible */}
                              <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>{item.responsible}</span>
                              </td>
                              {/* Expected Completion */}
                              <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                                <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--ink-soft)" }}>
                                  {fmtDate(item.expectedCompletion)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Add item row */}
                    <div style={{ padding: "10px 14px", borderTop: "1px solid var(--hair-soft)", background: "var(--surface-alt)" }}>
                      <button
                        onClick={() => setAddItemFor(qapi.id)}
                        style={{ fontSize: 12, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
                      >
                        + Add QAPI Item
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* QAA Notes */}
      {activeTab === "QAA Notes" && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--hair)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p className="section-label">QAA Committee Meeting Notes</p>
            <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Auto-saved</span>
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{
            width: "100%", minHeight: 400, padding: "16px 20px",
            border: "none", outline: "none", resize: "vertical",
            fontFamily: "var(--font-mono)", fontSize: 12.5,
            lineHeight: 1.7, color: "var(--ink-soft)", background: "var(--surface)",
            boxSizing: "border-box",
          }} />
        </div>
      )}

      {/* New QAPI Modal */}
      {addQapiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(7,43,82,0.35)" }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 520, margin: "0 16px", boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid var(--hair)" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500 }}>New QAPI</h2>
              <button onClick={() => setAddQapiOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color="var(--muted)" /></button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>QAPI Name</label>
                <input placeholder="e.g., Catheter-Associated Infection Prevention" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Issue(s) Identified</label>
                <textarea placeholder="Describe the quality issue or concern that prompted this QAPI…" rows={3}
                  style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }} />
              </div>
              <div>
                <label style={labelStyle}>Date Identified</label>
                <input type="date" defaultValue={new Date().toISOString().split("T")[0]} style={fieldStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "0 24px 20px" }}>
              <button onClick={() => setAddQapiOpen(false)} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => setAddQapiOpen(false)} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none", background: "var(--blue)", color: "#fff", cursor: "pointer" }}>Create QAPI</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {addItemFor !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(7,43,82,0.35)" }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 520, margin: "0 16px", maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid var(--hair)" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500 }}>Add QAPI Item</h2>
              <button onClick={() => setAddItemFor(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color="var(--muted)" /></button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Root Cause",       placeholder: "What underlying issue caused this problem?",         textarea: true  },
                { label: "Systemic Change",  placeholder: "What change will be made to correct the issue?",    textarea: true  },
                { label: "How Monitored",    placeholder: "e.g., Nursing Angel — per round completion",        textarea: false },
                { label: "Person(s) Responsible", placeholder: "e.g., Maria Rodriguez",                       textarea: false },
              ].map(f => (
                <div key={f.label}>
                  <label style={labelStyle}>{f.label}</label>
                  {f.textarea
                    ? <textarea placeholder={f.placeholder} rows={2} style={{ ...fieldStyle, resize: "vertical" }} />
                    : <input placeholder={f.placeholder} style={fieldStyle} />}
                </div>
              ))}
              <div>
                <label style={labelStyle}>Monitoring Type</label>
                <select style={fieldStyle}>
                  <option value="rounds">Via Angel Rounds</option>
                  <option value="cadence">Scheduled Cadence</option>
                  <option value="completion">One-time Completion</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input type="date" style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Expected Completion</label>
                  <input type="date" style={fieldStyle} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "0 24px 20px" }}>
              <button onClick={() => setAddItemFor(null)} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => setAddItemFor(null)} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none", background: "var(--blue)", color: "#fff", cursor: "pointer" }}>Add Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
