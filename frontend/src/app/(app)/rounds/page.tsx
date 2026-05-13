"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  GripVertical,
  Pencil,
  Play,
  Plus,
  Send,
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
import { PageHero, SectionLabel } from "@/components/ui";
import type { Question, TemplateSection } from "@/lib/types";

type RoundsTab = "Angel Rounds" | "Rapid Round";

const DRAG_MIME = "application/x-rr-question-id";

const UNCATEGORIZED_KEY = "__uncategorized__";

/**
 * Pill that describes when a question flags an issue. For yes/no questions
 * it shows the existing "Issue if no/yes/either" label; for scale questions
 * it summarises the range and threshold ("Scale 1–10 · flag ≥ 7").
 */
function FlagPill({
  question,
}: {
  question: { type?: 'yesno' | 'scale'; issueOn: 'yes' | 'no' | 'either'; scaleMin?: number | null; scaleMax?: number | null; scaleThreshold?: number | null; scaleThresholdDirection?: 'gte' | 'lte' | null };
}) {
  if (question.type === 'scale' && question.scaleMin != null && question.scaleMax != null && question.scaleThreshold != null) {
    const op = question.scaleThresholdDirection === 'lte' ? '≤' : '≥';
    return (
      <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: "var(--plum-tint)", color: "var(--plum)", flexShrink: 0 }}>
        Scale {question.scaleMin}–{question.scaleMax} · flag {op} {question.scaleThreshold}
      </span>
    );
  }
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: "var(--red-tint)", color: "var(--red)", flexShrink: 0 }}>
      Issue if {question.issueOn}
    </span>
  );
}

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
    deployTemplate,
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

  // Question form modal:
  //   undefined → closed
  //   null      → create mode (blank form)
  //   Question  → edit mode (form pre-filled with that question)
  const [editingQuestion, setEditingQuestion] = useState<Question | null | undefined>(undefined);

  // Drag state
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);

  // Auto-scroll while dragging. The Repository panel sits below the QAPI
  // groups, so without this the user can't reach the top sections when the
  // viewport is scrolled down — the page sits still as they drag upward.
  const autoScrollRafRef = useRef<number | null>(null);
  const autoScrollVyRef = useRef<number>(0);

  useEffect(() => {
    function tick() {
      const vy = autoScrollVyRef.current;
      if (vy !== 0) {
        window.scrollBy({ top: vy, behavior: "auto" });
      }
      autoScrollRafRef.current = requestAnimationFrame(tick);
    }
    function onDragOver(e: DragEvent) {
      const y = e.clientY;
      const h = window.innerHeight;
      const edge = 90; // px from edge where scroll kicks in
      if (y < edge) {
        // closer to the edge ⇒ faster, capped at ~12px/frame
        autoScrollVyRef.current = -Math.min(12, Math.ceil((edge - y) / 6));
      } else if (y > h - edge) {
        autoScrollVyRef.current = Math.min(12, Math.ceil((y - (h - edge)) / 6));
      } else {
        autoScrollVyRef.current = 0;
      }
    }
    function stop() {
      autoScrollVyRef.current = 0;
      if (autoScrollRafRef.current !== null) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragend", stop);
      window.removeEventListener("drop", stop);
    }
    function onDragStart(e: DragEvent) {
      // Only engage when *our* drag (the question MIME) is in flight, not
      // for arbitrary text/HTML drags that bubble up.
      const types = e.dataTransfer?.types;
      if (!types || !Array.from(types).includes(DRAG_MIME)) return;
      window.addEventListener("dragover", onDragOver);
      window.addEventListener("dragend", stop);
      window.addEventListener("drop", stop);
      if (autoScrollRafRef.current === null) {
        autoScrollRafRef.current = requestAnimationFrame(tick);
      }
    }
    window.addEventListener("dragstart", onDragStart);
    return () => {
      window.removeEventListener("dragstart", onDragStart);
      stop();
    };
  }, []);

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
                                  <FlagPill question={q} />
                                  <span style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0 }}>
                                    {q.notifyDepartmentId
                                      ? `→ ${departments.find((d) => d.id === q.notifyDepartmentId)?.name ?? "—"}`
                                      : "no notification"}
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
                onCreate={() => setEditingQuestion(null)}
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Zap size={14} style={{ color: "var(--blue)" }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{activeRapidTemplate.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--green-tint)", color: "var(--green)" }}>Active</span>
                    {activeRapidTemplate.deployedAt && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--plum-tint)", color: "var(--plum)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Send size={9} /> Deployed
                        {activeRapidTemplate.rapidCompletionCount > 0
                          ? ` · ${activeRapidTemplate.rapidCompletionCount} round${activeRapidTemplate.rapidCompletionCount === 1 ? "" : "s"} in`
                          : ""}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    Started {fmt(activeRapidTemplate.startDate)}
                    {activeRapidTemplate.endDate ? ` · ends ${fmt(activeRapidTemplate.endDate)}` : ""}
                    {activeRapidTemplate.deployedAt ? ` · pushed to angels ${fmt(activeRapidTemplate.deployedAt)}` : ""}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {!activeRapidTemplate.deployedAt && (
                    <button
                      onClick={() => {
                        const totalQ = activeRapidTemplate.sections.reduce((n, s) => n + s.questions.length, 0);
                        if (totalQ === 0) {
                          alert("Add at least one question before deploying.");
                          return;
                        }
                        if (window.confirm("Deploy this RapidRound to all angels? They will see it on their next round.")) {
                          void deployTemplate(activeRapidTemplate.id);
                        }
                      }}
                      style={{ fontSize: 11, padding: "6px 12px", borderRadius: 6, border: "none", background: "var(--blue)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontWeight: 500, boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 1px 2px rgba(7,43,82,.18)" }}
                      title="Push this RapidRound to angels — they'll see its questions on their next round"
                    >
                      <Send size={11} /> Deploy to Angels
                    </button>
                  )}
                  <button
                    onClick={() => archiveTemplate(activeRapidTemplate.id)}
                    style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid var(--red-edge)", background: "var(--red-tint)", color: "var(--red)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <Square size={11} /> Stop
                  </button>
                </div>
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
            onCreate={() => setEditingQuestion(null)}
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

      {/* Question form modal (create + edit) */}
      {editingQuestion !== undefined && (
        <QuestionFormModal
          question={editingQuestion}
          departments={departments}
          onClose={() => setEditingQuestion(undefined)}
          onSave={async (patch, opts) => {
            // If the user typed a brand-new department, create it first and
            // use the resulting id. We do this *before* the question call so
            // a question failure doesn't leave the form pointing at a stale
            // departmentId that doesn't exist yet.
            let resolvedDepartmentId = patch.departmentId ?? "";
            if (opts?.newDepartmentName) {
              const dept = await useUsersStore.getState().addDepartment(opts.newDepartmentName);
              resolvedDepartmentId = dept.id;
            }
            const finalPatch = { ...patch, departmentId: resolvedDepartmentId };
            if (editingQuestion === null) {
              await useRoundsStore.getState().addRepositoryQuestion({
                text: finalPatch.text ?? "",
                section: finalPatch.section ?? "",
                issueOn: finalPatch.issueOn ?? "either",
                notifyDepartmentId: finalPatch.notifyDepartmentId ?? "",
                departmentId: resolvedDepartmentId,
                type: finalPatch.type ?? "yesno",
                scaleMin: finalPatch.scaleMin ?? null,
                scaleMax: finalPatch.scaleMax ?? null,
                scaleThreshold: finalPatch.scaleThreshold ?? null,
                scaleThresholdDirection: finalPatch.scaleThresholdDirection ?? null,
                inRepository: true,
              });
            } else {
              await useRoundsStore.getState().updateRepositoryQuestion(editingQuestion.id, finalPatch);
            }
            setEditingQuestion(undefined);
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
                // Deployed rapid rounds get appended to the angel's queue
                // so a fresh round picks them up automatically.
                rapidTemplates={templates.filter(
                  (t) => t.active && t.type === "rapid" && !!t.deployedAt
                )}
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
  onCreate,
}: {
  questions: Question[];
  onDragStart: (e: React.DragEvent, questionId: string) => void;
  departments: { id: string; name: string }[];
  onEdit: (q: Question) => void;
  onCreate: () => void;
}) {
  const [filter, setFilter] = useState<string>("all");

  // Group by departmentId. Empty string lands in the "Uncategorized" bucket
  // (sorted last so the main departments stay above the fold).
  const grouped = useMemo(() => {
    const byDept = new Map<string, Question[]>();
    for (const q of questions) {
      const key = q.departmentId || UNCATEGORIZED_KEY;
      const list = byDept.get(key) ?? [];
      list.push(q);
      byDept.set(key, list);
    }
    const entries = [...byDept.entries()].map(([deptKey, qs]) => ({
      deptKey,
      deptName: deptKey === UNCATEGORIZED_KEY
        ? "Uncategorized"
        : departments.find((d) => d.id === deptKey)?.name ?? "Unknown",
      questions: qs.slice().sort((a, b) => a.text.localeCompare(b.text)),
    }));
    entries.sort((a, b) => {
      if (a.deptKey === UNCATEGORIZED_KEY) return 1;
      if (b.deptKey === UNCATEGORIZED_KEY) return -1;
      return a.deptName.localeCompare(b.deptName);
    });
    return filter === "all" ? entries : entries.filter((g) => g.deptKey === filter);
  }, [questions, departments, filter]);

  const totalShown = grouped.reduce((n, g) => n + g.questions.length, 0);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 14, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", background: "var(--surface-alt)", borderBottom: "1px solid var(--hair)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Question Repository · drag onto a section above
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--hair-strong)", background: "var(--surface)", color: "var(--ink-soft)", cursor: "pointer" }}
            title="Filter by department"
          >
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
            <option value={UNCATEGORIZED_KEY}>Uncategorized</option>
          </select>
          <button
            type="button"
            onClick={onCreate}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "none", background: "var(--blue)", color: "#fff", fontSize: 11, fontWeight: 500, cursor: "pointer", boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 1px 2px rgba(7,43,82,.18)" }}
            title="Add a new question to the repository"
          >
            <Plus size={11} /> New question
          </button>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{totalShown} questions</span>
        </div>
      </div>
      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        {grouped.length === 0 && (
          <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
            No questions in this department yet.
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.deptKey}>
            <div style={{ padding: "10px 16px 6px", background: "var(--surface-alt)", borderTop: "1px solid var(--hair-soft)", position: "sticky", top: 0, zIndex: 1 }}>
              <SectionLabel
                accent={group.deptKey === UNCATEGORIZED_KEY ? "muted" : "blue"}
                trailing={
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>
                    {group.questions.length} q
                  </span>
                }
              >
                {group.deptName}
              </SectionLabel>
            </div>
            {group.questions.map((q, i) => (
              <div
                key={q.id}
                draggable
                onDragStart={(e) => onDragStart(e, q.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: i < group.questions.length - 1 ? "1px solid var(--hair-soft)" : undefined, cursor: "grab", fontSize: 12 }}
              >
                <GripVertical size={12} style={{ color: "var(--hair-strong)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: "var(--ink-soft)" }}>{q.text}</div>
                  {q.section && (
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>{q.section}</div>
                  )}
                </div>
                <FlagPill question={q} />
                <span style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0 }}>
                  {q.notifyDepartmentId
                    ? `→ ${departments.find((d) => d.id === q.notifyDepartmentId)?.name ?? "—"}`
                    : "no notification"}
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

/**
 * Returns the first department whose name matches `candidate` (trimmed,
 * case-insensitive). Exported so the duplicate-name guard can be unit-tested
 * without spinning up the full modal.
 */
export function findDuplicateDepartment(
  candidate: string,
  departments: { id: string; name: string }[],
): { id: string; name: string } | null {
  const normalized = candidate.trim().toLowerCase();
  if (!normalized) return null;
  return departments.find((d) => d.name.trim().toLowerCase() === normalized) ?? null;
}

const NEW_DEPT_SENTINEL = "__new__";

function QuestionFormModal({
  question,
  departments,
  onClose,
  onSave,
}: {
  // null = create mode; Question = edit mode.
  question: Question | null;
  departments: { id: string; name: string }[];
  onClose: () => void;
  onSave: (
    patch: Partial<Omit<Question, "id">>,
    opts?: { newDepartmentName?: string },
  ) => Promise<void>;
}) {
  const isCreate = question === null;
  const [text, setText] = useState(question?.text ?? "");
  const [section, setSection] = useState(question?.section ?? "");
  const [departmentId, setDepartmentId] = useState(question?.departmentId ?? "");
  const [creatingDept, setCreatingDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [type, setType] = useState<Question["type"]>(question?.type ?? "yesno");
  const [issueOn, setIssueOn] = useState<Question["issueOn"]>(question?.issueOn ?? "no");
  const [scaleMin, setScaleMin] = useState<number>(question?.scaleMin ?? 1);
  const [scaleMax, setScaleMax] = useState<number>(question?.scaleMax ?? 10);
  const [scaleThreshold, setScaleThreshold] = useState<number>(question?.scaleThreshold ?? 7);
  const [scaleDir, setScaleDir] = useState<NonNullable<Question["scaleThresholdDirection"]>>(
    question?.scaleThresholdDirection ?? "gte"
  );
  const [notifyOn, setNotifyOn] = useState<boolean>(!!question?.notifyDepartmentId);
  const [notifyDepartmentId, setNotifyDepartmentId] = useState(question?.notifyDepartmentId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!text.trim()) return "Question text is required.";
    if (creatingDept) {
      const trimmed = newDeptName.trim();
      if (!trimmed) return "New department name is required, or cancel and pick an existing one.";
      if (findDuplicateDepartment(trimmed, departments)) {
        return `A department named "${trimmed}" already exists — pick it from the list instead.`;
      }
    }
    if (type === "scale") {
      if (!Number.isFinite(scaleMin) || !Number.isFinite(scaleMax) || !Number.isFinite(scaleThreshold)) {
        return "Scale min, max, and threshold must be numbers.";
      }
      if (scaleMin >= scaleMax) return "Scale min must be less than max.";
      if (scaleThreshold < scaleMin || scaleThreshold > scaleMax) {
        return "Threshold must fall within the min–max range.";
      }
    }
    if (notifyOn && !notifyDepartmentId) return "Pick a department to notify, or set Notify to No.";
    return null;
  }

  async function save() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const patch: Partial<Omit<Question, "id">> = {
        text: text.trim(),
        section,
        // departmentId here is the *current* selection. If creatingDept is on,
        // the parent will overwrite it with the freshly-created dept's id.
        departmentId,
        type,
        issueOn,
        notifyDepartmentId: notifyOn ? notifyDepartmentId : "",
        // Scale fields always sent: populated when type=scale, nulled otherwise.
        scaleMin: type === "scale" ? scaleMin : null,
        scaleMax: type === "scale" ? scaleMax : null,
        scaleThreshold: type === "scale" ? scaleThreshold : null,
        scaleThresholdDirection: type === "scale" ? scaleDir : null,
      };
      await onSave(
        patch,
        creatingDept ? { newDepartmentName: newDeptName.trim() } : undefined,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={isCreate ? "New question" : "Edit question"} onClose={onClose} width={560}>
      <div style={{ marginBottom: 12 }}>
        <label style={inputLabelStyle}>Question text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={isCreate ? "e.g. Resident reports pain level <=4?" : undefined}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={inputLabelStyle}>Section label</label>
          <input
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="e.g. Skin Inspection"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={inputLabelStyle}>Department (repository group)</label>
          {creatingDept ? (
            <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
              <input
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Rapid Round"
                autoFocus
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => { setCreatingDept(false); setNewDeptName(""); }}
                style={{ ...cancelBtnStyle, padding: "8px 10px", fontSize: 11 }}
                title="Cancel creating a new department"
              >
                Cancel
              </button>
            </div>
          ) : (
            <select
              value={departmentId}
              onChange={(e) => {
                if (e.target.value === NEW_DEPT_SENTINEL) {
                  setCreatingDept(true);
                } else {
                  setDepartmentId(e.target.value);
                }
              }}
              style={inputStyle}
            >
              <option value="">Uncategorized</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
              <option value={NEW_DEPT_SENTINEL}>+ Create new department…</option>
            </select>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={inputLabelStyle}>Question type</label>
        <div style={{ display: "flex", gap: 8 }}>
          <TypePill active={type === "yesno"} onClick={() => setType("yesno")}>Yes / No</TypePill>
          <TypePill active={type === "scale"} onClick={() => setType("scale")}>Scale (numeric)</TypePill>
        </div>
      </div>

      {type === "yesno" ? (
        <div style={{ marginBottom: 12 }}>
          <label style={inputLabelStyle}>Flag an issue when answer is</label>
          <select
            value={issueOn}
            onChange={(e) => setIssueOn(e.target.value as Question["issueOn"])}
            style={inputStyle}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
            <option value="either">Either (no auto-flag)</option>
          </select>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={inputLabelStyle}>Min</label>
              <input
                type="number"
                value={scaleMin}
                onChange={(e) => setScaleMin(parseInt(e.target.value || "0", 10))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={inputLabelStyle}>Max</label>
              <input
                type="number"
                value={scaleMax}
                onChange={(e) => setScaleMax(parseInt(e.target.value || "0", 10))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={inputLabelStyle}>Threshold</label>
              <input
                type="number"
                value={scaleThreshold}
                onChange={(e) => setScaleThreshold(parseInt(e.target.value || "0", 10))}
                style={inputStyle}
              />
            </div>
          </div>
          <label style={inputLabelStyle}>Flag when answer is</label>
          <div style={{ display: "flex", gap: 8 }}>
            <TypePill active={scaleDir === "gte"} onClick={() => setScaleDir("gte")}>≥ threshold</TypePill>
            <TypePill active={scaleDir === "lte"} onClick={() => setScaleDir("lte")}>≤ threshold</TypePill>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 18, paddingTop: 12, borderTop: "1px solid var(--hair-soft)" }}>
        <label style={inputLabelStyle}>Notify department on flag?</label>
        <div style={{ display: "flex", gap: 8, marginBottom: notifyOn ? 10 : 0 }}>
          <TypePill active={notifyOn} onClick={() => setNotifyOn(true)}>Yes</TypePill>
          <TypePill active={!notifyOn} onClick={() => { setNotifyOn(false); setNotifyDepartmentId(""); }}>No</TypePill>
        </div>
        {notifyOn && (
          <select
            value={notifyDepartmentId}
            onChange={(e) => setNotifyDepartmentId(e.target.value)}
            style={inputStyle}
          >
            <option value="">— Pick a department —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: "var(--red-tint)", color: "var(--red)", fontSize: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
        <button onClick={save} disabled={!text.trim() || busy} style={primaryBtnStyle(!!text.trim() && !busy)}>
          {busy ? "Saving…" : isCreate ? "Create question" : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}

function TypePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--blue)" : "var(--hair-strong)"}`,
        background: active ? "var(--blue-tint)" : "var(--surface)",
        color: active ? "var(--blue-deep)" : "var(--ink-soft)",
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
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

