"use client";
import { useState } from "react";
import { Plus, ChevronDown, ChevronRight, Archive, X, ClipboardList } from "lucide-react";

type QapiItem = {
  id: number;
  title: string;
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
        id: 1, title: "Enhanced Environmental Safety Protocol",
        rootCause: "Environmental hazards not consistently identified during nursing rounds.",
        systemicChange: "Revised angel rounding checklist to include 4 mandatory environmental safety checkpoints. All Nursing angels trained on updated protocol.",
        monitoringType: "rounds", monitoringDetail: "Nursing Angel — per round completion",
        responsible: "Maria Rodriguez", startDate: "2025-12-01", expectedCompletion: "2026-06-30",
      },
      {
        id: 2, title: "High-Risk Resident Identification & Care Planning",
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
        id: 3, title: "Skin Integrity Rounding Protocol",
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
        id: 4, title: "Daily Fluid & Meal Monitoring",
        rootCause: "Meal and fluid intake documentation incomplete — estimated at 60% completion rate.",
        systemicChange: "Dietary angel to document fluid intake and meal completion percentage at each meal. Charge nurse notified if resident misses >2 consecutive meals.",
        monitoringType: "rounds", monitoringDetail: "Dietary Angel — per meal round",
        responsible: "James Thompson", startDate: "2026-03-01", expectedCompletion: "2026-08-31",
      },
      {
        id: 5, title: "Monthly Weight Monitoring Review",
        rootCause: "Weight trends not reviewed with interdisciplinary team until quarterly MDS.",
        systemicChange: "Implement monthly weight review in IDT meeting with Dietary, Nursing, and Medical Records.",
        monitoringType: "cadence", monitoringDetail: "IDT — monthly review",
        responsible: "Patricia Nguyen", startDate: "2026-03-01", expectedCompletion: "2026-09-01",
      },
    ],
  },
];

const monitoringBadge: Record<string, { label: string; bg: string; color: string }> = {
  rounds:     { label: "Via Rounds",    bg: "var(--blue-tint)",  color: "var(--blue)"  },
  completion: { label: "Completion",    bg: "var(--green-tint)", color: "var(--green)" },
  cadence:    { label: "Scheduled",     bg: "var(--plum-tint)",  color: "var(--plum)"  },
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

const tabs = ["QAPIs", "QAA Notes"];

export default function QapiPage() {
  const [activeTab, setActiveTab] = useState("QAPIs");
  const [expanded, setExpanded] = useState<number[]>([1]);
  const [addQapiOpen, setAddQapiOpen] = useState(false);
  const [addItemFor, setAddItemFor] = useState<number | null>(null);
  const [notes, setNotes] = useState(`QAA Committee Meeting — May 5, 2026\nAttendees: C. Mackay (DON), P. Nguyen (Charge RN), M. Rodriguez (Nursing Angel)\n\nAgenda:\n1. Review Q1 QAPI outcomes\n2. Fall prevention program update\n3. New rapid round protocol discussion\n\nNotes:\n— Fall rates decreased 12% vs Q4 2025 following new repositioning protocol.\n— Hydration monitoring compliance needs improvement (79%). Action: James Thompson to conduct additional dietary rounds.\n— Next meeting: June 2, 2026`);

  const toggle = (id: number) => setExpanded(e => e.includes(id) ? e.filter(x => x !== id) : [...e, id]);

  return (
    <div className="max-w-[1100px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
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
      <div className="flex border-b" style={{ borderColor: "var(--hair)" }}>
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

      {activeTab === "QAPIs" && (
        <div className="space-y-4">
          {initialQapis.map(qapi => (
            <div key={qapi.id} className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
              {/* QAPI Header */}
              <div className="flex items-start gap-3 px-5 py-4 cursor-pointer" onClick={() => toggle(qapi.id)}>
                <div className="mt-0.5">
                  {expanded.includes(qapi.id)
                    ? <ChevronDown size={15} color="var(--blue)" />
                    : <ChevronRight size={15} color="var(--muted)" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ fontWeight: 600, color: "var(--ink)" }}>{qapi.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--green-tint)", color: "var(--green)" }}>Active</span>
                    <span style={{ fontSize: 11.5, color: "var(--faint)" }}>·</span>
                    <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{qapi.items.length} item{qapi.items.length !== 1 ? "s" : ""}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                    <span style={{ fontWeight: 600 }}>Issue identified:</span> {qapi.issuesIdentified}
                  </p>
                  <p style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>
                    Date identified: {new Date(qapi.dateIdentified).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <button onClick={e => { e.stopPropagation(); }} style={{
                  display: "flex", alignItems: "center", gap: 4, fontSize: 11.5,
                  color: "var(--muted)", background: "none", border: "none", cursor: "pointer", flexShrink: 0,
                }}>
                  <Archive size={12} /> Archive
                </button>
              </div>

              {/* QAPI Items */}
              {expanded.includes(qapi.id) && (
                <div className="border-t" style={{ borderColor: "var(--hair)" }}>
                  {qapi.items.map((item, idx) => {
                    const mb = monitoringBadge[item.monitoringType];
                    return (
                      <div key={item.id} style={{ borderTop: idx > 0 ? "1px solid var(--hair-soft)" : undefined, background: "var(--surface-alt)" }}>
                        {/* Item header */}
                        <div className="flex items-center gap-2 px-6 pt-4 pb-2">
                          <ClipboardList size={13} color="var(--blue-mid)" />
                          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink-soft)" }}>{item.title}</span>
                          <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: mb.bg, color: mb.color, marginLeft: 4 }}>
                            {mb.label}
                          </span>
                          <button style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>Edit</button>
                        </div>

                        {/* Item detail grid */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 px-6 pb-4" style={{ fontSize: 12 }}>
                          <div>
                            <p style={labelStyle}>Root Cause</p>
                            <p style={{ color: "var(--ink-soft)", lineHeight: 1.5 }}>{item.rootCause}</p>
                          </div>
                          <div>
                            <p style={labelStyle}>Systemic Change</p>
                            <p style={{ color: "var(--ink-soft)", lineHeight: 1.5 }}>{item.systemicChange}</p>
                          </div>
                          <div>
                            <p style={labelStyle}>Monitoring</p>
                            <p style={{ color: "var(--ink-soft)" }}>{item.monitoringDetail}</p>
                          </div>
                          <div>
                            <p style={labelStyle}>Responsible</p>
                            <p style={{ color: "var(--ink-soft)" }}>{item.responsible}</p>
                          </div>
                          <div>
                            <p style={labelStyle}>Start Date</p>
                            <p style={{ color: "var(--ink-soft)", fontFamily: "var(--font-mono)" }}>
                              {new Date(item.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                          <div>
                            <p style={labelStyle}>Expected Completion</p>
                            <p style={{ color: "var(--ink-soft)", fontFamily: "var(--font-mono)" }}>
                              {new Date(item.expectedCompletion).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="px-6 py-3 border-t" style={{ borderColor: "var(--hair-soft)", background: "var(--surface-alt)" }}>
                    <button onClick={() => setAddItemFor(qapi.id)} style={{ fontSize: 12, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                      + Add QAPI Item
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === "QAA Notes" && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--hair)" }}>
            <p className="section-label">QAA Committee Meeting Notes</p>
            <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Auto-saved</span>
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{
            width: "100%", minHeight: 400, padding: "16px 20px",
            border: "none", outline: "none", resize: "vertical",
            fontFamily: "var(--font-mono)", fontSize: 12.5,
            lineHeight: 1.7, color: "var(--ink-soft)", background: "var(--surface)",
          }} />
        </div>
      )}

      {/* New QAPI Modal */}
      {addQapiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(7,43,82,0.35)" }}>
          <div className="rounded-2xl w-full max-w-lg mx-4" style={{ background: "var(--surface)", boxShadow: "var(--shadow-xl)" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "var(--hair)" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500 }}>New QAPI</h2>
              <button onClick={() => setAddQapiOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color="var(--muted)" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
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
            <div className="flex gap-2 px-6 py-4 border-t" style={{ borderColor: "var(--hair)" }}>
              <button onClick={() => setAddQapiOpen(false)} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => setAddQapiOpen(false)} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none", background: "var(--blue)", color: "#fff", cursor: "pointer" }}>Create QAPI</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {addItemFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(7,43,82,0.35)" }}>
          <div className="rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" style={{ background: "var(--surface)", boxShadow: "var(--shadow-xl)" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "var(--hair)" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500 }}>Add QAPI Item</h2>
              <button onClick={() => setAddItemFor(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color="var(--muted)" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: "Item Title", placeholder: "e.g., Implement Enhanced Environmental Safety Protocol" },
                { label: "Root Cause", placeholder: "What underlying issue caused this problem?", textarea: true },
                { label: "Systemic Change", placeholder: "What change will be made to correct the issue?", textarea: true },
                { label: "Monitoring Detail", placeholder: "e.g., Nursing Angel — per round completion" },
                { label: "Responsible Person", placeholder: "e.g., Maria Rodriguez" },
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
              <div className="grid grid-cols-2 gap-3">
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
            <div className="flex gap-2 px-6 py-4 border-t" style={{ borderColor: "var(--hair)" }}>
              <button onClick={() => setAddItemFor(null)} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => setAddItemFor(null)} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none", background: "var(--blue)", color: "#fff", cursor: "pointer" }}>Add Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
