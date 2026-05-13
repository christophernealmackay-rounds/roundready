"use client";
import { useEffect, useState } from "react";
import { Plus, ChevronDown, ChevronRight, Archive, X, RotateCcw, Pencil, Printer, Trash2 } from "lucide-react";
import { useQapiStore } from "@/lib/store/useQapiStore";
import { useRoundsStore } from "@/lib/store/useRoundsStore";
import { PageHero } from "@/components/ui";
import { formatDate, todayIsoDate } from "@/lib/dates";
import type { Qapi, QapiItem } from "@/lib/types";

type SubTab = "QAPIs" | "Template" | "QAA Notes";

function fmt(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", yyyy: "numeric" } as Intl.DateTimeFormatOptions);
}

const monTypes: Record<string, string> = {
  rounds: "Per Round", completion: "Completion Rate", cadence: "Scheduled Cadence",
};

export default function QapiPage() {
  const {
    qapis, meetingNotes,
    archiveQapi, restoreQapi, addQapi, addItem, updateItem, removeItem,
    addMeetingNote, updateMeetingNote, removeMeetingNote,
  } = useQapiStore();
  const templates = useRoundsStore((s) => s.templates);
  const activeTemplate = templates.find((t) => t.active && t.type === "angel");

  const [subTab, setSubTab] = useState<SubTab>("QAPIs");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["qapi-1"]));
  const [showArchived, setShowArchived] = useState(false);
  const [addQapiOpen, setAddQapiOpen] = useState(false);
  // Item modal: null = closed; {qapiId, itemId?} = open. itemId=undefined → create; itemId set → edit.
  const [itemModal, setItemModal] = useState<{ qapiId: string; itemId?: string } | null>(null);
  const [addQapiForm, setAddQapiForm] = useState({ title: "", issuesIdentified: "", dateIdentified: "" });
  const [itemForm, setItemForm] = useState({
    title: "", rootCause: "", systemicChange: "", monitoringType: "rounds" as QapiItem["monitoringType"],
    monitoringDetail: "", responsible: "", startDate: "", expectedCompletion: "",
  });
  const isEditingItem = !!itemModal?.itemId;

  // QAA notes state — selected meeting entry id; null until a row is picked.
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const selectedMeeting = meetingNotes.find((n) => n.id === selectedMeetingId) ?? null;
  // Print target: 'one' prints the selected entry; 'all' prints every entry.
  const [printScope, setPrintScope] = useState<"one" | "all" | null>(null);
  // Archive flow: capture actual completion date before sending to backend.
  // The button only opens the modal — confirm in modal triggers the PATCH.
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; title: string } | null>(null);
  const [archiveDate, setArchiveDate] = useState("");

  const activeQapis   = qapis.filter((q) => q.status === "active");
  const archivedQapis = qapis.filter((q) => q.status === "archived");

  function toggle(id: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function saveAddQapi() {
    if (!addQapiForm.title.trim()) return;
    addQapi({
      title: addQapiForm.title,
      issuesIdentified: addQapiForm.issuesIdentified,
      dateIdentified: addQapiForm.dateIdentified || todayIsoDate(),
      status: "active",
      // New QAPIs are always active and have no completion date.
      actualCompletion: null,
    });
    setAddQapiOpen(false);
    setAddQapiForm({ title: "", issuesIdentified: "", dateIdentified: "" });
  }

  function openArchive(q: Qapi) {
    setArchiveDate(todayIsoDate());
    setArchiveTarget({ id: q.id, title: q.title });
  }

  function confirmArchive() {
    if (!archiveTarget || !archiveDate) return;
    archiveQapi(archiveTarget.id, archiveDate);
    setArchiveTarget(null);
  }

  function openAddItem(qapiId: string) {
    setItemForm({ title: "", rootCause: "", systemicChange: "", monitoringType: "rounds", monitoringDetail: "", responsible: "", startDate: "", expectedCompletion: "" });
    setItemModal({ qapiId });
  }

  function openEditItem(qapi: Qapi, item: QapiItem) {
    setItemForm({
      title: item.title,
      rootCause: item.rootCause,
      systemicChange: item.systemicChange,
      monitoringType: item.monitoringType,
      monitoringDetail: item.monitoringDetail,
      responsible: item.responsible,
      startDate: item.startDate,
      expectedCompletion: item.expectedCompletion,
    });
    setItemModal({ qapiId: qapi.id, itemId: item.id });
  }

  async function saveItem() {
    if (!itemModal || !itemForm.title.trim()) return;
    if (itemModal.itemId) {
      // Edit mode — keep the existing order and qapiId; only update editable fields.
      const target = qapis.find((q) => q.id === itemModal.qapiId)?.items.find((i) => i.id === itemModal.itemId);
      if (!target) return;
      await updateItem({ ...target, ...itemForm });
    } else {
      await addItem(itemModal.qapiId, itemForm);
    }
    setItemModal(null);
  }

  const displayList = [...activeQapis, ...(showArchived ? archivedQapis : [])];

  return (
    <div className="max-w-[1100px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      <PageHero
        eyebrow="QAPI · Quality Assurance & Performance Improvement"
        title="Improvement"
        accent="initiatives & notes."
        caption="Active and archived QAPIs, the rounding template tied to them, and the QAA Committee notes."
        trailing={
          subTab === "QAPIs" ? (
            <button
              onClick={() => setAddQapiOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--blue)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "9px 16px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 1px 2px rgba(7,43,82,.18)",
              }}
            >
              <Plus size={14} /> New QAPI
            </button>
          ) : null
        }
      />

      {/* Sub-tabs — refined to match the topbar tab pattern with a plum dot
          accent above the active sub-tab. */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--hair)" }}>
        {(["QAPIs", "Template", "QAA Notes"] as SubTab[]).map((t) => {
          const active = subTab === t;
          return (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              style={{
                position: "relative",
                padding: "11px 22px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                background: "none",
                border: "none",
                color: active ? "var(--blue-deep)" : "var(--muted)",
                borderBottom: active ? "2px solid var(--blue)" : "2px solid transparent",
                transition: "color 180ms var(--ease-luxe)",
                marginBottom: -1,
              }}
            >
              {active && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 4,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 4,
                    height: 4,
                    borderRadius: 999,
                    background: "var(--plum)",
                  }}
                />
              )}
              {t}
            </button>
          );
        })}
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
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      Identified {fmt(qapi.dateIdentified)}
                      {qapi.status === "archived" && qapi.actualCompletion && (
                        <> · Completed {formatDate(qapi.actualCompletion)}</>
                      )}
                      <> · {qapi.items.length} item{qapi.items.length !== 1 ? "s" : ""}</>
                    </span>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 6 }}>
                    {qapi.status === "active" ? (
                      <button onClick={() => openArchive(qapi)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
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
                          <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--blue-tint)", color: "var(--blue)" }}>{monTypes[item.monitoringType]}</span>
                            <button onClick={() => openEditItem(qapi, item)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }} title="Edit item"><Pencil size={12} /></button>
                            <button onClick={() => removeItem(qapi.id, item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }} title="Delete item"><X size={13} /></button>
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
                      <button onClick={() => openAddItem(qapi.id)} style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, border: "1px dashed var(--hair-strong)", background: "transparent", color: "var(--muted)", cursor: "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s" }}>
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

      {/* Template Tab — only sections tied to a QAPI initiative are shown
          here. Unlinked sections (Safety & General catch-all, etc.) live on
          the Rounds tab where the angel template is managed end-to-end. */}
      {subTab === "Template" && (() => {
        const linkedSections = activeTemplate
          ? activeTemplate.sections.filter((s) => s.qapiId)
          : [];
        return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activeTemplate ? (
            <>
              <div style={{ background: "var(--blue-tint)", border: "1px solid var(--blue-pale)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--blue-deep)" }}>{activeTemplate.name}</div>
                  <div style={{ fontSize: 11, color: "var(--blue)", marginTop: 2 }}>
                    Started {fmt(activeTemplate.startDate)} · {linkedSections.length} QAPI section{linkedSections.length === 1 ? "" : "s"} · {linkedSections.reduce((n, s) => n + s.questions.length, 0)} questions
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--green-tint)", color: "var(--green)" }}>Active</span>
              </div>
              {linkedSections.length === 0 && (
                <div style={{ background: "var(--surface)", border: "1px dashed var(--hair-strong)", borderRadius: 12, padding: 28, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                  No sections are tied to a QAPI yet. Link one from the Rounds tab to see it here.
                </div>
              )}
              {linkedSections.map((sec) => {
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
        );
      })()}

      {/* QAA Notes Tab — per-meeting entries. Left rail is the chronological
          list of meeting minutes; right is the editor for the selected entry.
          Print buttons render a hidden printable block keyed by `printScope`
          and trigger window.print(); CSS in globals.css hides everything
          else under @media print. */}
      {subTab === "QAA Notes" && (
        <QaaNotesPane
          meetingNotes={meetingNotes}
          selectedMeeting={selectedMeeting}
          onSelect={setSelectedMeetingId}
          onAdd={async () => {
            const created = await addMeetingNote({
              meetingDate: todayIsoDate(),
              title: "",
              content: "",
            });
            setSelectedMeetingId(created.id);
          }}
          onUpdate={(id, patch) => updateMeetingNote(id, patch)}
          onDelete={async (id) => {
            await removeMeetingNote(id);
            if (selectedMeetingId === id) setSelectedMeetingId(null);
          }}
          onPrint={(scope) => {
            setPrintScope(scope);
            // Wait one tick so the printable region is in the DOM.
            requestAnimationFrame(() => {
              window.print();
              setPrintScope(null);
            });
          }}
        />
      )}

      {/* Hidden printable region — only visible under @media print. The
          parent @media print rule hides everything *except* this block,
          plus the matching `body.printing-...` flag set by onPrint above. */}
      {printScope === "one" && selectedMeeting && (
        <div className="qaa-print-target" aria-hidden="true">
          <h1 className="qaa-print-title">QAA Committee Meeting Minutes</h1>
          <PrintableMeeting note={selectedMeeting} />
        </div>
      )}
      {printScope === "all" && (
        <div className="qaa-print-target" aria-hidden="true">
          <h1 className="qaa-print-title">QAA Committee Meeting Minutes — All Entries</h1>
          {meetingNotes.map((n) => (
            <PrintableMeeting key={n.id} note={n} />
          ))}
        </div>
      )}

      {/* Archive QAPI Modal — captures the actual completion date, which
          the backend now requires before allowing status='archived'. */}
      {archiveTarget && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setArchiveTarget(null); }}
        >
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: "24px 28px", width: 420, boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>Archive QAPI</h2>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>
                  Mark <em style={{ fontFamily: "var(--font-display)", color: "var(--blue-ink)" }}>{archiveTarget.title}</em> as completed and move it to the archived list.
                </p>
              </div>
              <button onClick={() => setArchiveTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={16} /></button>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Actual completion date
              </label>
              <input
                type="date"
                value={archiveDate}
                onChange={(e) => setArchiveDate(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", fontFamily: "var(--font-mono)", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setArchiveTarget(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface)", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
              <button
                onClick={confirmArchive}
                disabled={!archiveDate}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: archiveDate ? "var(--blue)" : "var(--hair-strong)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: archiveDate ? "pointer" : "not-allowed",
                  boxShadow: archiveDate ? "inset 0 1px 0 rgba(255,255,255,.18), 0 1px 2px rgba(7,43,82,.18)" : undefined,
                }}
              >
                Archive QAPI
              </button>
            </div>
          </div>
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

      {/* QAPI Item Modal — create when itemModal.itemId is undefined,
          edit when it's set. Same form body for both. */}
      {itemModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) setItemModal(null); }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: "24px 28px", width: 600, boxShadow: "var(--shadow-xl)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>{isEditingItem ? "Edit QAPI Item" : "Add QAPI Item"}</h2>
              <button onClick={() => setItemModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={16} /></button>
            </div>
            {(["title","rootCause","systemicChange","monitoringDetail","responsible"] as const).map((field) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>
                  {field === "rootCause" ? "Root cause" : field === "systemicChange" ? "Systemic change" : field === "monitoringDetail" ? "Monitoring detail" : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <textarea value={itemForm[field]} onChange={(e) => setItemForm((f) => ({ ...f, [field]: e.target.value }))} rows={field === "title" ? 1 : 2} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Monitoring type</label>
                <select value={itemForm.monitoringType} onChange={(e) => setItemForm((f) => ({ ...f, monitoringType: e.target.value as QapiItem["monitoringType"] }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 12, color: "var(--ink)", outline: "none", cursor: "pointer" }}>
                  <option value="rounds">Per Round</option>
                  <option value="completion">Completion Rate</option>
                  <option value="cadence">Scheduled Cadence</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Start date</label>
                <input type="date" value={itemForm.startDate} onChange={(e) => setItemForm((f) => ({ ...f, startDate: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 12, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Expected completion</label>
                <input type="date" value={itemForm.expectedCompletion} onChange={(e) => setItemForm((f) => ({ ...f, expectedCompletion: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 12, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setItemModal(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveItem} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--blue)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{isEditingItem ? "Save changes" : "Add Item"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────

import type { QaaMeetingNote } from "@/lib/types";

/**
 * Two-pane editor for QAA meeting minutes. Left rail lists every entry in
 * meeting-date desc order; right pane is the form for the selected entry.
 * Edits are debounced via the dirty flag — saves fire only when the user
 * clicks "Save changes" so a long block of typing is one server round-trip.
 */
function QaaNotesPane({
  meetingNotes,
  selectedMeeting,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
  onPrint,
}: {
  meetingNotes: QaaMeetingNote[];
  selectedMeeting: QaaMeetingNote | null;
  onSelect: (id: string | null) => void;
  onAdd: () => Promise<void> | void;
  onUpdate: (
    id: string,
    patch: Partial<{ meetingDate: string; title: string; content: string }>,
  ) => Promise<QaaMeetingNote>;
  onDelete: (id: string) => Promise<void> | void;
  onPrint: (scope: "one" | "all") => void;
}) {
  // Local draft state for the selected entry — keeps typing snappy without
  // re-rendering the whole tab list on every keystroke.
  const [draft, setDraft] = useState<{ title: string; content: string; meetingDate: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reseed draft whenever the user picks a different entry, or when the
  // store-side entry refreshes after a save.
  useEffect(() => {
    if (selectedMeeting) {
      setDraft({
        title: selectedMeeting.title,
        content: selectedMeeting.content,
        meetingDate: selectedMeeting.meetingDate,
      });
      setDirty(false);
    } else {
      setDraft(null);
    }
  }, [selectedMeeting?.id, selectedMeeting?.updatedAt]);

  async function save() {
    if (!selectedMeeting || !draft) return;
    setSaving(true);
    try {
      await onUpdate(selectedMeeting.id, draft);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, minHeight: 540 }}>
      {/* Left rail */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--hair)", background: "var(--surface-alt)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {meetingNotes.length} meeting{meetingNotes.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={() => onAdd()}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "none", background: "var(--blue)", color: "#fff", fontSize: 11, fontWeight: 500, cursor: "pointer" }}
            title="Create a new meeting entry"
          >
            <Plus size={11} /> New
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {meetingNotes.length === 0 && (
            <div style={{ padding: "24px 14px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
              No entries yet. Click <strong>New</strong> to log a meeting.
            </div>
          )}
          {meetingNotes.map((n) => {
            const isActive = n.id === selectedMeeting?.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => onSelect(n.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--hair-soft)",
                  background: isActive ? "var(--blue-tint)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: isActive ? "var(--blue-deep)" : "var(--muted)" }}>
                  {n.meetingDate}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: isActive ? 600 : 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {n.title.trim() || "Untitled meeting"}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--hair)", background: "var(--surface-alt)" }}>
          <button
            type="button"
            onClick={() => onPrint("all")}
            disabled={meetingNotes.length === 0}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "7px 10px", borderRadius: 6,
              border: "1px solid var(--hair-strong)",
              background: "var(--surface)",
              color: meetingNotes.length === 0 ? "var(--hair-strong)" : "var(--ink-soft)",
              fontSize: 11, fontWeight: 500, cursor: meetingNotes.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            <Printer size={11} /> Print all entries
          </button>
        </div>
      </div>

      {/* Right pane */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, boxShadow: "var(--shadow-sm)", padding: "24px 28px", display: "flex", flexDirection: "column" }}>
        {!selectedMeeting || !draft ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13 }}>
            Select an entry on the left or click <strong style={{ marginLeft: 4, marginRight: 4 }}>New</strong> to start a fresh one.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "var(--plum)", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 600, marginBottom: 6 }}>
                  Committee minutes
                </div>
                <input
                  value={draft.title}
                  onChange={(e) => { setDraft({ ...draft, title: e.target.value }); setDirty(true); }}
                  placeholder="Meeting title (e.g. September 2026 QAA Committee)"
                  style={{
                    width: "100%",
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: 22,
                    fontWeight: 400,
                    color: "var(--blue-ink)",
                    letterSpacing: "-0.012em",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    padding: 0,
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <input
                    type="date"
                    value={draft.meetingDate}
                    onChange={(e) => { setDraft({ ...draft, meetingDate: e.target.value }); setDirty(true); }}
                    style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--hair)", background: "var(--surface-alt)", color: "var(--ink-soft)", outline: "none" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    Last updated {fmt(selectedMeeting.updatedAt)}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => onPrint("one")}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 6, border: "1px solid var(--hair-strong)", background: "var(--surface)", color: "var(--ink-soft)", fontSize: 11.5, fontWeight: 500, cursor: "pointer" }}
                  title="Print just this entry"
                >
                  <Printer size={12} /> Print
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Delete this meeting entry? This cannot be undone.")) {
                      void onDelete(selectedMeeting.id);
                    }
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 6, border: "1px solid var(--red-edge)", background: "var(--red-tint)", color: "var(--red)", fontSize: 11.5, fontWeight: 500, cursor: "pointer" }}
                  title="Delete this meeting entry"
                >
                  <Trash2 size={12} /> Delete
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={!dirty || saving}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 6,
                    border: "none",
                    background: dirty && !saving ? "var(--blue)" : "var(--hair-strong)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: dirty && !saving ? "pointer" : "not-allowed",
                  }}
                >
                  {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
                </button>
              </div>
            </div>
            <textarea
              value={draft.content}
              onChange={(e) => { setDraft({ ...draft, content: e.target.value }); setDirty(true); }}
              style={{
                width: "100%",
                flex: 1,
                minHeight: 420,
                padding: "20px 28px",
                borderRadius: 12,
                border: "1px solid var(--hair)",
                background: "var(--surface-alt)",
                fontSize: 14,
                color: "var(--ink)",
                outline: "none",
                resize: "vertical",
                lineHeight: 1.75,
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                letterSpacing: "-0.005em",
                boxSizing: "border-box",
              }}
              placeholder="Attendees, agenda, action items, decisions…"
            />
          </>
        )}
      </div>
    </div>
  );
}

function PrintableMeeting({ note }: { note: QaaMeetingNote }) {
  return (
    <article className="qaa-print-entry">
      <header>
        <h2>{note.title.trim() || "Untitled meeting"}</h2>
        <p className="qaa-print-meta">Meeting date: {note.meetingDate}</p>
      </header>
      <pre className="qaa-print-content">{note.content || "(no minutes recorded)"}</pre>
    </article>
  );
}
