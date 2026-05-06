"use client";
import { useState } from "react";
import { Plus, ChevronDown, ChevronRight, Archive, X, RotateCcw } from "lucide-react";
import { useQapiStore } from "@/lib/store/useQapiStore";
import { useRoundsStore } from "@/lib/store/useRoundsStore";
import type { Qapi, QapiItem } from "@/lib/types";

type SubTab = "QAPIs" | "Template" | "QAA Notes";

function fmt(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", yyyy: "numeric" } as Intl.DateTimeFormatOptions);
}

const monTypes: Record<string, string> = {
  rounds: "Per Round", completion: "Completion Rate", cadence: "Scheduled Cadence",
};

export default function QapiPage() {
  const { qapis, notes, archiveQapi, restoreQapi, addQapi, addItem, removeItem, updateNotes } = useQapiStore();
  const templates = useRoundsStore((s) => s.templates);
  const activeTemplate = templates.find((t) => t.active && t.type === "angel");

  const [subTab, setSubTab] = useState<SubTab>("QAPIs");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["qapi-1"]));
  const [showArchived, setShowArchived] = useState(false);
  const [addQapiOpen, setAddQapiOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState(notes.content);
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [addQapiForm, setAddQapiForm] = useState({ title: "", issuesIdentified: "", dateIdentified: "" });
  const [addItemForm, setAddItemForm] = useState({
    title: "", rootCause: "", systemicChange: "", monitoringType: "rounds" as QapiItem["monitoringType"],
    monitoringDetail: "", responsible: "", startDate: "", expectedCompletion: "",
  });

  const activeQapis   = qapis.filter((q) => q.status === "active");
  const archivedQapis = qapis.filter((q) => q.status === "archived");

  function toggle(id: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function saveAddQapi() {
    if (!addQapiForm.title.trim()) return;
    addQapi({ title: addQapiForm.title, issuesIdentified: addQapiForm.issuesIdentified, dateIdentified: addQapiForm.dateIdentified || new Date().toISOString().split("T")[0], status: "active" });
    setAddQapiOpen(false);
    setAddQapiForm({ title: "", issuesIdentified: "", dateIdentified: "" });
  }

  function saveAddItem() {
    if (!addItemOpen || !addItemForm.title.trim()) return;
    addItem(addItemOpen, addItemForm);
    setAddItemOpen(null);
    setAddItemForm({ title: "", rootCause: "", systemicChange: "", monitoringType: "rounds", monitoringDetail: "", responsible: "", startDate: "", expectedCompletion: "" });
  }

  const displayList = [...activeQapis, ...(showArchived ? archivedQapis : [])];

  return (
    <div className="max-w-[1100px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>QAPI</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Quality Assurance & Performance Improvement</p>
        </div>
        {subTab === "QAPIs" && (
          <button onClick={() => setAddQapiOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--blue)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            <Plus size={14} /> New QAPI
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--hair)" }}>
        {(["QAPIs","Template","QAA Notes"] as SubTab[]).map((t) => (
          <button key={t} onClick={() => setSubTab(t)} style={{ padding: "10px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", background: "none", border: "none", color: subTab === t ? "var(--blue)" : "var(--muted)", borderBottom: subTab === t ? "2px solid var(--blue)" : "2px solid transparent", transition: "all 0.2s", marginBottom: -1 }}>
            {t}
          </button>
        ))}
      </div>

      {/* QAPIs Tab */}
      {subTab === "QAPIs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {displayList.map((qapi) => {
            const isExpanded = expanded.has(qapi.id);
            const linkedCount = activeTemplate ? activeTemplate.sections.filter((s) => s.qapiId === qapi.id).length : 0;
            return (
              <div key={qapi.id} style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
                <div onClick={() => toggle(qapi.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer" }}>
                  <div style={{ color: "var(--muted)" }}>{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{qapi.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 999, background: qapi.status === "active" ? "var(--green-tint)" : "var(--surface-alt)", color: qapi.status === "active" ? "var(--green)" : "var(--muted)" }}>
                        {qapi.status === "active" ? "Active" : "Archived"}
                      </span>
                      {linkedCount > 0 && <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 999, background: "var(--blue-tint)", color: "var(--blue)" }}>{linkedCount} template section{linkedCount !== 1 ? "s" : ""}</span>}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>Identified {fmt(qapi.dateIdentified)} · {qapi.items.length} item{qapi.items.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 6 }}>
                    {qapi.status === "active" ? (
                      <button onClick={() => archiveQapi(qapi.id)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        <Archive size={11} /> Archive
                      </button>
                    ) : (
                      <button onClick={() => restoreQapi(qapi.id)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid var(--green-edge)", background: "var(--green-tint)", color: "var(--green)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        <RotateCcw size={11} /> Restore
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--hair-soft)", padding: "0 18px 16px" }}>
                    <div style={{ background: "var(--surface-alt)", borderRadius: 8, padding: "10px 14px", margin: "12px 0", fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                      {qapi.issuesIdentified}
                    </div>

                    {qapi.items.map((item) => (
                      <div key={item.id} style={{ border: "1px solid var(--hair)", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, gap: 12 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{item.title}</span>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--blue-tint)", color: "var(--blue)" }}>{monTypes[item.monitoringType]}</span>
                            <button onClick={() => removeItem(qapi.id, item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }}><X size={13} /></button>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, color: "var(--ink-soft)" }}>
                          <div><span style={{ fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10 }}>Root Cause</span><div style={{ marginTop: 2, lineHeight: 1.4 }}>{item.rootCause}</div></div>
                          <div><span style={{ fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10 }}>Systemic Change</span><div style={{ marginTop: 2, lineHeight: 1.4 }}>{item.systemicChange}</div></div>
                          <div><span style={{ fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10 }}>Monitoring</span><div style={{ marginTop: 2 }}>{item.monitoringDetail}</div></div>
                          <div><span style={{ fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10 }}>Responsible</span><div style={{ marginTop: 2 }}>{item.responsible}</div></div>
                          <div><span style={{ fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10 }}>Start</span><div style={{ marginTop: 2, fontFamily: "var(--font-mono)" }}>{item.startDate}</div></div>
                          <div><span style={{ fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10 }}>Expected Completion</span><div style={{ marginTop: 2, fontFamily: "var(--font-mono)" }}>{item.expectedCompletion}</div></div>
                        </div>
                      </div>
                    ))}

                    {qapi.status === "active" && (
                      <button onClick={() => setAddItemOpen(qapi.id)} style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, border: "1px dashed var(--hair-strong)", background: "transparent", color: "var(--muted)", cursor: "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s" }}>
                        <Plus size={13} /> Add QAPI item
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {archivedQapis.length > 0 && (
            <button onClick={() => setShowArchived((v) => !v)} style={{ fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: "4px 0", textAlign: "left" }}>
              {showArchived ? "Hide" : "Show"} {archivedQapis.length} archived QAPI{archivedQapis.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

      {/* Template Tab */}
      {subTab === "Template" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activeTemplate ? (
            <>
              <div style={{ background: "var(--blue-tint)", border: "1px solid var(--blue-pale)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--blue-deep)" }}>{activeTemplate.name}</div>
                  <div style={{ fontSize: 11, color: "var(--blue)", marginTop: 2 }}>Started {fmt(activeTemplate.startDate)} · {activeTemplate.sections.length} sections · {activeTemplate.sections.reduce((n, s) => n + s.questions.length, 0)} questions</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--green-tint)", color: "var(--green)" }}>Active</span>
              </div>
              {activeTemplate.sections.map((sec) => {
                const linkedQapi = qapis.find((q) => q.id === sec.qapiId);
                const linkedItem = linkedQapi?.items.find((i) => i.id === sec.qapiItemId);
                return (
                  <div key={sec.id} style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "14px 18px", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{sec.title}</span>
                      {linkedQapi && <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 999, background: "var(--blue-tint)", color: "var(--blue)" }}>QAPI: {linkedQapi.title}</span>}
                    </div>
                    {sec.questions.map((q, qi) => (
                      <div key={q.questionId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: qi < sec.questions.length - 1 ? "1px solid var(--hair-soft)" : undefined }}>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)", width: 16 }}>{qi + 1}</span>
                        <span style={{ fontSize: 12, color: "var(--ink-soft)", flex: 1 }}>{q.text}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: "var(--red-tint)", color: "var(--red)" }}>Issue if {q.issueOn}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          ) : (
            <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13, boxShadow: "var(--shadow-sm)" }}>
              No active round template. Go to Rounds to create one.
            </div>
          )}
        </div>
      )}

      {/* QAA Notes Tab */}
      {subTab === "QAA Notes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              Last updated {fmt(notes.updatedAt)}
            </div>
            {notesSaved && !notesDirty && (
              <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                ✓ Saved
              </span>
            )}
            {notesDirty && (
              <button onClick={() => { updateNotes(notesValue); setNotesDirty(false); setNotesSaved(true); }} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--blue)", color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                Save notes
              </button>
            )}
          </div>
          <textarea
            value={notesValue}
            onChange={(e) => { setNotesValue(e.target.value); setNotesDirty(true); setNotesSaved(false); }}
            style={{ width: "100%", minHeight: 480, padding: "16px 18px", borderRadius: 12, border: "1px solid var(--hair)", background: "var(--surface)", fontSize: 13, color: "var(--ink)", outline: "none", resize: "vertical", lineHeight: 1.7, fontFamily: "var(--font-ui)", boxSizing: "border-box", boxShadow: "var(--shadow-sm)" }}
            placeholder="Record QAA committee meeting minutes, action items, and decisions here…"
          />
        </div>
      )}

      {/* Add QAPI Modal */}
      {addQapiOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) setAddQapiOpen(false); }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: "24px 28px", width: 520, boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>New QAPI</h2>
              <button onClick={() => setAddQapiOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={16} /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>QAPI title</label>
              <input value={addQapiForm.title} onChange={(e) => setAddQapiForm((f) => ({ ...f, title: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} placeholder="e.g. Medication Error Prevention" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Issues identified</label>
              <textarea value={addQapiForm.issuesIdentified} onChange={(e) => setAddQapiForm((f) => ({ ...f, issuesIdentified: e.target.value }))} rows={3} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", resize: "vertical", boxSizing: "border-box" }} placeholder="Describe the problem or trend identified…" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Date identified</label>
              <input type="date" value={addQapiForm.dateIdentified} onChange={(e) => setAddQapiForm((f) => ({ ...f, dateIdentified: e.target.value }))} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setAddQapiOpen(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveAddQapi} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--blue)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Create QAPI</button>
            </div>
          </div>
        </div>
      )}

      {/* Add QAPI Item Modal */}
      {addItemOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) setAddItemOpen(null); }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: "24px 28px", width: 600, boxShadow: "var(--shadow-xl)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>Add QAPI Item</h2>
              <button onClick={() => setAddItemOpen(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={16} /></button>
            </div>
            {(["title","rootCause","systemicChange","monitoringDetail","responsible"] as const).map((field) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>
                  {field === "rootCause" ? "Root cause" : field === "systemicChange" ? "Systemic change" : field === "monitoringDetail" ? "Monitoring detail" : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <textarea value={addItemForm[field]} onChange={(e) => setAddItemForm((f) => ({ ...f, [field]: e.target.value }))} rows={field === "title" ? 1 : 2} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Monitoring type</label>
                <select value={addItemForm.monitoringType} onChange={(e) => setAddItemForm((f) => ({ ...f, monitoringType: e.target.value as QapiItem["monitoringType"] }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 12, color: "var(--ink)", outline: "none", cursor: "pointer" }}>
                  <option value="rounds">Per Round</option>
                  <option value="completion">Completion Rate</option>
                  <option value="cadence">Scheduled Cadence</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Start date</label>
                <input type="date" value={addItemForm.startDate} onChange={(e) => setAddItemForm((f) => ({ ...f, startDate: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 12, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Expected completion</label>
                <input type="date" value={addItemForm.expectedCompletion} onChange={(e) => setAddItemForm((f) => ({ ...f, expectedCompletion: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 12, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setAddItemOpen(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveAddItem} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--blue)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Add Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
