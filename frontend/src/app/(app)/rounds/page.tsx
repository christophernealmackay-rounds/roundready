"use client";
import { useMemo, useState } from "react";
import {
  Archive,
  GripVertical,
  Pencil,
  Play,
  Plus,
  Square,
  X,
  Zap,
} from "lucide-react";
import { useRoundsStore } from "@/lib/store/useRoundsStore";
import { useQapiStore } from "@/lib/store/useQapiStore";
import { useUsersStore } from "@/lib/store/useUsersStore";
import MobileFrame from "@/components/round/MobileFrame";
import AngelRoundFlow from "@/components/round/AngelRoundFlow";
import { formatDate } from "@/lib/dates";
import { PageHero } from "@/components/ui";
import type { Question, TemplateSection } from "@/lib/types";

type RoundsTab = "Angel Rounds" | "Rapid Round";

const DRAG_MIME = "application/x-rr-question-id";

// Use shared formatDate so YYYY-MM-DD strings parse as local time
// instead of UTC, which was shifting RapidRound dates back one day.
const fmt = formatDate;

export default function RoundsPage() {
  const templates = useRoundsStore((s) => s.templates);
  const questions = useRoundsStore((s) => s.questions);
  const {
    archiveTemplate,
    addTemplate,
    addSection,
    removeSection,
    addQuestion,
    removeQuestion,
  } = useRoundsStore();
  const qapis = useQapiStore((s) => s.qapis);
  const departments = useUsersStore((s) => s.departments);

  const [tab, setTab] = useState<RoundsTab>("Angel Rounds");
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [addSectionOpen, setAddSectionOpen] = useState<{
    templateId: string;
    qapiId?: string;
  } | null>(null);
  const [sectionForm, setSectionForm] = useState({ title: "", qapiId: "", qapiItemId: "" });
  const [rapidForm, setRapidForm] = useState({ name: "", startDate: "", endDate: "" });
  const [rapidOpen, setRapidOpen] = useState(false);

  // Mobile-frame angel UI state — opened by the "Run round" button.
  const [runOpen, setRunOpen] = useState(false);

  // Edit-question modal — null when closed.
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Drag state
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);

  const activeAngelTemplate = templates.find((t) => t.active && t.type === "angel");
  const activeRapidTemplate = templates.find((t) => t.active && t.type === "rapid");
  const archivedTemplates = templates.filter((t) => t.archivedAt);

  // Group sections by their QAPI for the new Angel Rounds layout.
  const groupedSections = useMemo(() => {
    if (!activeAngelTemplate) return [] as Array<{ qapiId: string | null; qapiTitle: string; sections: TemplateSection[] }>;
    const map = new Map<string | null, TemplateSection[]>();
    for (const sec of activeAngelTemplate.sections) {
      const key = sec.qapiId ?? null;
      const list = map.get(key) ?? [];
      list.push(sec);
      map.set(key, list);
    }
    return [...map.entries()].map(([qapiId, sections]) => {
      const q = qapiId ? qapis.find((x) => x.id === qapiId) : null;
      return {
        qapiId,
        qapiTitle: q?.title ?? "Unlinked sections",
        sections,
      };
    });
  }, [activeAngelTemplate, qapis]);

  function createRapid() {
    if (!rapidForm.name.trim()) return;
    addTemplate({
      name: rapidForm.name,
      type: "rapid",
      startDate: rapidForm.startDate || new Date().toISOString().split("T")[0],
      endDate: rapidForm.endDate || undefined,
    });
    setRapidOpen(false);
    setRapidForm({ name: "", startDate: "", endDate: "" });
  }

  async function saveSection() {
    if (!addSectionOpen || !sectionForm.title.trim()) return;
    await addSection(addSectionOpen.templateId, {
      title: sectionForm.title,
      qapiId: sectionForm.qapiId || addSectionOpen.qapiId || undefined,
      qapiItemId: sectionForm.qapiItemId || undefined,
    });
    setAddSectionOpen(null);
    setSectionForm({ title: "", qapiId: "", qapiItemId: "" });
  }

  function handleDragStart(e: React.DragEvent, questionId: string) {
    e.dataTransfer.setData(DRAG_MIME, questionId);
    e.dataTransfer.effectAllowed = "copy";
  }

  async function handleDrop(e: React.DragEvent, templateId: string, sectionId: string) {
    e.preventDefault();
    setDragOverSection(null);
    const questionId = e.dataTransfer.getData(DRAG_MIME);
    if (!questionId) return;
    await addQuestion(templateId, sectionId, questionId);
  }

  return (
    <div className="max-w-[1200px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PageHero
        eyebrow="Rounds · Templates & Live Rounds"
        title="Build, run,"
        accent="and respond."
        caption="Compose rounding templates from QAPI items. Run live or rapid-response rounds with your angels."
        trailing={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setArchivedOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--hair-strong)",
                background: "var(--surface)",
                color: "var(--ink-soft)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <Archive size={13} /> Archived ({archivedTemplates.length})
            </button>
            {tab === "Angel Rounds" && (
              <button
                onClick={() => setRunOpen(true)}
                disabled={!activeAngelTemplate}
                title={!activeAngelTemplate ? "No active template — create one first" : "Open the angel-side rounding view"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: activeAngelTemplate
                    ? "linear-gradient(180deg, var(--green-mid), var(--green))"
                    : "var(--hair-strong)",
                  color: activeAngelTemplate ? "#fff" : "var(--muted)",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: activeAngelTemplate ? "pointer" : "not-allowed",
                  boxShadow: activeAngelTemplate
                    ? "inset 0 1px 0 rgba(255,255,255,.18), 0 1px 2px rgba(59,109,17,.4)"
                    : undefined,
                }}
              >
                <Play size={14} /> Run round
              </button>
            )}
            {tab === "Rapid Round" && (
              <button
                onClick={() => setRapidOpen(true)}
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
                <Zap size={14} /> New RapidRound
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--hair)" }}>
        {(["Angel Rounds", "Rapid Round"] as RoundsTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ padding: "10px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", background: "none", border: "none", color: tab === t ? "var(--blue)" : "var(--muted)", borderBottom: tab === t ? "2px solid var(--blue)" : "2px solid transparent", marginBottom: -1, display: "flex", alignItems: "center", gap: 6 }}
          >
            {t === "Rapid Round" && <Zap size={12} />}
            {t}
          </button>
        ))}
      </div>

      {/* Angel Rounds */}
      {tab === "Angel Rounds" && (
        <>
          {activeAngelTemplate ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{activeAngelTemplate.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--green-tint)", color: "var(--green)" }}>Active</span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    {activeAngelTemplate.sections.reduce((n, s) => n + s.questions.length, 0)} questions across {activeAngelTemplate.sections.length} sections
                  </span>
                </div>
                <button
                  onClick={() => archiveTemplate(activeAngelTemplate.id)}
                  style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Archive size={11} /> Archive template
                </button>
              </div>

              {/* QAPI groups */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {groupedSections.map(({ qapiId, qapiTitle, sections }) => (
                  <div key={qapiId ?? "unlinked"} style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 14, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
                    <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--hair)", background: "var(--blue-wash)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "var(--blue-tint)", color: "var(--blue)", letterSpacing: "0.05em", textTransform: "uppercase" }}>QAPI</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--blue-deep)" }}>{qapiTitle}</span>
                      </div>
                      <button
                        onClick={() => {
                          setSectionForm({ title: "", qapiId: qapiId ?? "", qapiItemId: "" });
                          setAddSectionOpen({ templateId: activeAngelTemplate.id, qapiId: qapiId ?? undefined });
                        }}
                        style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--blue-pale)", background: "var(--surface)", color: "var(--blue)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <Plus size={11} /> Add section
                      </button>
                    </div>
                    <div style={{ padding: "10px 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {sections.map((sec) => {
                        const linkedItem = sec.qapiItemId
                          ? qapis.find((q) => q.id === sec.qapiId)?.items.find((i) => i.id === sec.qapiItemId)
                          : null;
                        const dragActive = dragOverSection === sec.id;
                        return (
                          <div
                            key={sec.id}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDragOverSection(sec.id); }}
                            onDragLeave={() => setDragOverSection(null)}
                            onDrop={(e) => handleDrop(e, activeAngelTemplate.id, sec.id)}
                            style={{ border: `1px ${dragActive ? "dashed var(--blue)" : "solid var(--hair)"}`, borderRadius: 10, background: dragActive ? "var(--blue-wash)" : "var(--surface-alt)", padding: "10px 14px", transition: "all 0.15s" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: sec.questions.length > 0 ? 8 : 0 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{sec.title}</span>
                              {linkedItem && (
                                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 999, background: "var(--plum-tint)", color: "var(--plum)" }}>
                                  Item: {linkedItem.title}
                                </span>
                              )}
                              <span style={{ fontSize: 10, color: "var(--muted)" }}>· {sec.questions.length} q</span>
                              <button
                                onClick={() => removeSection(activeAngelTemplate.id, sec.id)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2, marginLeft: "auto" }}
                                title="Delete section"
                              >
                                <X size={12} />
                              </button>
                            </div>
                            {sec.questions.length === 0 ? (
                              <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic", padding: "6px 0" }}>
                                Drop a question here from the repository below
                              </div>
                            ) : (
                              sec.questions.map((q, qi) => {
                                const repoQ = questions.find((x) => x.id === q.questionId);
                                return (
                                <div
                                  key={q.id ?? q.questionId}
                                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: qi > 0 ? "1px solid var(--hair-soft)" : undefined, fontSize: 12 }}
                                >
                                  <GripVertical size={12} style={{ color: "var(--hair-strong)", flexShrink: 0 }} />
                                  <span style={{ flex: 1, color: "var(--ink-soft)" }}>{q.text}</span>
                                  <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: "var(--red-tint)", color: "var(--red)", flexShrink: 0 }}>
                                    Issue if {q.issueOn}
                                  </span>
                                  <span style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0 }}>
                                    → {departments.find((d) => d.id === q.notifyDepartmentId)?.name ?? "—"}
                                  </span>
                                  <button
                                    onClick={() => repoQ && setEditingQuestion(repoQ)}
                                    disabled={!repoQ}
                                    style={{ background: "none", border: "none", cursor: repoQ ? "pointer" : "not-allowed", color: "var(--muted)", padding: 2 }}
                                    title="Edit question"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button
                                    onClick={() => q.id && removeQuestion(activeAngelTemplate.id, sec.id, q.id)}
                                    disabled={!q.id}
                                    style={{ background: "none", border: "none", cursor: q.id ? "pointer" : "not-allowed", color: "var(--muted)", padding: 2 }}
                                    title="Remove from section"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                                );
                              })
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Repository (drag source) */}
              <RepositoryPanel
                questions={questions}
                onDragStart={handleDragStart}
                departments={departments}
                onEdit={setEditingQuestion}
              />
            </>
          ) : (
            <EmptyState
              title="No active angel rounds template"
              description="Restore one from Archived, or build a fresh template."
            />
          )}
        </>
      )}

      {/* Rapid Round */}
      {tab === "Rapid Round" && (
        <>
          {activeRapidTemplate ? (
            <div style={{ background: "var(--surface)", border: "1px solid var(--blue-pale)", borderRadius: 12, padding: "16px 20px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Zap size={14} style={{ color: "var(--blue)" }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{activeRapidTemplate.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--green-tint)", color: "var(--green)" }}>Active</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    Started {fmt(activeRapidTemplate.startDate)}
                    {activeRapidTemplate.endDate ? ` · ends ${fmt(activeRapidTemplate.endDate)}` : ""}
                  </span>
                </div>
                <button
                  onClick={() => archiveTemplate(activeRapidTemplate.id)}
                  style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid var(--red-edge)", background: "var(--red-tint)", color: "var(--red)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Square size={11} /> Stop
                </button>
              </div>

              {/* Sections in the rapid template (no QAPI grouping needed). */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                {activeRapidTemplate.sections.map((sec) => (
                  <div
                    key={sec.id}
                    onDragOver={(e) => { e.preventDefault(); setDragOverSection(sec.id); }}
                    onDragLeave={() => setDragOverSection(null)}
                    onDrop={(e) => handleDrop(e, activeRapidTemplate.id, sec.id)}
                    style={{ border: `1px ${dragOverSection === sec.id ? "dashed var(--blue)" : "solid var(--hair)"}`, borderRadius: 10, background: "var(--surface-alt)", padding: "10px 14px" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{sec.title}</span>
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>· {sec.questions.length} q</span>
                      <button
                        onClick={() => removeSection(activeRapidTemplate.id, sec.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2, marginLeft: "auto" }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {sec.questions.length === 0 ? (
                      <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>Drop a question here</div>
                    ) : (
                      sec.questions.map((q) => {
                        const repoQ = questions.find((x) => x.id === q.questionId);
                        return (
                        <div key={q.id ?? q.questionId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12 }}>
                          <GripVertical size={12} style={{ color: "var(--hair-strong)" }} />
                          <span style={{ flex: 1, color: "var(--ink-soft)" }}>{q.text}</span>
                          <button
                            onClick={() => repoQ && setEditingQuestion(repoQ)}
                            disabled={!repoQ}
                            style={{ background: "none", border: "none", cursor: repoQ ? "pointer" : "not-allowed", color: "var(--muted)", padding: 2 }}
                            title="Edit question"
                          >
                            <Pencil size={10} />
                          </button>
                          <button
                            onClick={() => q.id && removeQuestion(activeRapidTemplate.id, sec.id, q.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }}
                          >
                            <X size={10} />
                          </button>
                        </div>
                        );
                      })
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    setSectionForm({ title: "", qapiId: "", qapiItemId: "" });
                    setAddSectionOpen({ templateId: activeRapidTemplate.id });
                  }}
                  style={{ fontSize: 11, padding: "6px 12px", borderRadius: 6, border: "1px dashed var(--hair-strong)", background: "var(--surface)", color: "var(--muted)", cursor: "pointer", alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Plus size={11} /> Add section
                </button>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No active RapidRound"
              description="Create a rapid response template to gather data from all angels right now."
              actionLabel="Create RapidRound"
              onAction={() => setRapidOpen(true)}
              icon={<Zap size={24} style={{ color: "var(--blue-mid)" }} />}
            />
          )}

          {/* Repository — same drag source on both tabs */}
          <RepositoryPanel
            questions={questions}
            onDragStart={handleDragStart}
            departments={departments}
            onEdit={setEditingQuestion}
          />
        </>
      )}

      {/* Archived templates modal */}
      {archivedOpen && (
        <Modal title="Archived templates" onClose={() => setArchivedOpen(false)}>
          {archivedTemplates.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              No archived templates yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
              {archivedTemplates.map((t) => (
                <div
                  key={t.id}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", border: "1px solid var(--hair)", borderRadius: 8, background: "var(--surface-alt)" }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      {t.type === "rapid" ? "RapidRound" : "Angel Rounds"} · Archived {t.archivedAt ? fmt(t.archivedAt) : "—"}
                    </div>
                  </div>
                  <button
                    onClick={() => useRoundsStore.getState().deleteTemplate(t.id)}
                    style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid var(--red-edge)", background: "var(--red-tint)", color: "var(--red)", cursor: "pointer" }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Add Section modal */}
      {addSectionOpen && (
        <Modal title="Add section" onClose={() => setAddSectionOpen(null)}>
          <div style={{ marginBottom: 12 }}>
            <label style={inputLabelStyle}>Section title</label>
            <input
              value={sectionForm.title}
              onChange={(e) => setSectionForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Daily skin checks"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={inputLabelStyle}>QAPI</label>
            <select
              value={sectionForm.qapiId}
              onChange={(e) => setSectionForm((f) => ({ ...f, qapiId: e.target.value, qapiItemId: "" }))}
              style={inputStyle}
            >
              <option value="">— None —</option>
              {qapis.filter((q) => q.status === "active").map((q) => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>
          </div>
          {sectionForm.qapiId && (
            <div style={{ marginBottom: 16 }}>
              <label style={inputLabelStyle}>QAPI item (optional)</label>
              <select
                value={sectionForm.qapiItemId}
                onChange={(e) => setSectionForm((f) => ({ ...f, qapiItemId: e.target.value }))}
                style={inputStyle}
              >
                <option value="">— None —</option>
                {(qapis.find((q) => q.id === sectionForm.qapiId)?.items ?? []).map((it) => (
                  <option key={it.id} value={it.id}>{it.title}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setAddSectionOpen(null)} style={cancelBtnStyle}>Cancel</button>
            <button onClick={saveSection} disabled={!sectionForm.title.trim()} style={primaryBtnStyle(!!sectionForm.title.trim())}>
              Add section
            </button>
          </div>
        </Modal>
      )}

      {/* New RapidRound modal */}
      {rapidOpen && (
        <Modal title="New RapidRound" onClose={() => setRapidOpen(false)}>
          <div style={{ marginBottom: 12 }}>
            <label style={inputLabelStyle}>Name</label>
            <input
              value={rapidForm.name}
              onChange={(e) => setRapidForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Meal service concern check"
              style={inputStyle}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
            <div>
              <label style={inputLabelStyle}>Start date</label>
              <input type="date" value={rapidForm.startDate} onChange={(e) => setRapidForm((f) => ({ ...f, startDate: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={inputLabelStyle}>End date (optional)</label>
              <input type="date" value={rapidForm.endDate} onChange={(e) => setRapidForm((f) => ({ ...f, endDate: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setRapidOpen(false)} style={cancelBtnStyle}>Cancel</button>
            <button onClick={createRapid} style={primaryBtnStyle(!!rapidForm.name.trim())} disabled={!rapidForm.name.trim()}>
              Launch RapidRound
            </button>
          </div>
        </Modal>
      )}

      {/* Edit question modal */}
      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          departments={departments}
          onClose={() => setEditingQuestion(null)}
          onSave={async (patch) => {
            await useRoundsStore.getState().updateRepositoryQuestion(editingQuestion.id, patch);
            setEditingQuestion(null);
          }}
        />
      )}

      {/* Angel-side mobile rounding flow — shown to DON in a phone bezel */}
      {runOpen && activeAngelTemplate && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)", padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setRunOpen(false); }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
              Angel-side preview · {activeAngelTemplate.name}
              <button
                onClick={() => setRunOpen(false)}
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
            <MobileFrame>
              <AngelRoundFlow
                template={activeAngelTemplate}
                onClose={() => setRunOpen(false)}
              />
            </MobileFrame>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function RepositoryPanel({
  questions,
  onDragStart,
  departments,
  onEdit,
}: {
  questions: Question[];
  onDragStart: (e: React.DragEvent, questionId: string) => void;
  departments: { id: string; name: string }[];
  onEdit: (q: Question) => void;
}) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 14, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", background: "var(--surface-alt)", borderBottom: "1px solid var(--hair)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Question Repository · drag onto a section above
        </span>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>{questions.length} questions</span>
      </div>
      <div style={{ maxHeight: 340, overflowY: "auto" }}>
        {questions.map((q, i) => (
          <div
            key={q.id}
            draggable
            onDragStart={(e) => onDragStart(e, q.id)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: i < questions.length - 1 ? "1px solid var(--hair-soft)" : undefined, cursor: "grab", fontSize: 12 }}
          >
            <GripVertical size={12} style={{ color: "var(--hair-strong)", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: "var(--ink-soft)" }}>{q.text}</div>
              {q.section && (
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>{q.section}</div>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: "var(--red-tint)", color: "var(--red)", flexShrink: 0 }}>
              Issue if {q.issueOn}
            </span>
            <span style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0 }}>
              → {departments.find((d) => d.id === q.notifyDepartmentId)?.name ?? "—"}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(q); }}
              onMouseDown={(e) => e.stopPropagation()}
              draggable={false}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2, flexShrink: 0 }}
              title="Edit question"
            >
              <Pencil size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div style={{ background: "var(--surface)", border: "1px dashed var(--hair-strong)", borderRadius: 14, padding: 40, textAlign: "center", boxShadow: "var(--shadow-sm)" }}>
      {icon && <div style={{ marginBottom: 12 }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>{description}</div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{ fontSize: 13, fontWeight: 500, padding: "9px 20px", borderRadius: 8, border: "none", background: "var(--blue)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={14} /> {actionLabel}
        </button>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  width = 480,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: "24px 28px", width, maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow-xl)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditQuestionModal({
  question,
  departments,
  onClose,
  onSave,
}: {
  question: Question;
  departments: { id: string; name: string }[];
  onClose: () => void;
  onSave: (patch: Partial<Omit<Question, "id">>) => Promise<void>;
}) {
  const [text, setText] = useState(question.text);
  const [issueOn, setIssueOn] = useState<Question["issueOn"]>(question.issueOn);
  const [notifyDepartmentId, setNotifyDepartmentId] = useState(question.notifyDepartmentId);
  const [section, setSection] = useState(question.section);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onSave({ text: text.trim(), issueOn, notifyDepartmentId, section });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Edit question" onClose={onClose} width={520}>
      <div style={{ marginBottom: 12 }}>
        <label style={inputLabelStyle}>Question text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={inputLabelStyle}>Section</label>
          <input
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="e.g. Skin Inspection"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={inputLabelStyle}>Flag an issue when answer is</label>
          <select
            value={issueOn}
            onChange={(e) => setIssueOn(e.target.value as Question["issueOn"])}
            style={inputStyle}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
            <option value="either">Either</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={inputLabelStyle}>Notify department on flag</label>
        <select
          value={notifyDepartmentId}
          onChange={(e) => setNotifyDepartmentId(e.target.value)}
          style={inputStyle}
        >
          <option value="">— None —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
        <button onClick={save} disabled={!text.trim() || busy} style={primaryBtnStyle(!!text.trim() && !busy)}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Style helpers ──────────────────────────────────────────────────────

const inputLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 600,
  color: "var(--muted)",
  marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--hair)",
  background: "var(--surface-alt)",
  fontSize: 13,
  color: "var(--ink)",
  outline: "none",
  boxSizing: "border-box",
  cursor: "auto",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid var(--hair-strong)",
  background: "var(--surface-alt)",
  color: "var(--ink-soft)",
  fontSize: 13,
  cursor: "pointer",
};

function primaryBtnStyle(enabled: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: enabled ? "var(--blue)" : "var(--hair-strong)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 500,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

