"use client";
import { useState } from "react";
import { Plus, GripVertical, Zap, Archive, BookOpen, X, ChevronDown, ChevronRight, Play, Square } from "lucide-react";
import { useRoundsStore } from "@/lib/store/useRoundsStore";
import { useQapiStore } from "@/lib/store/useQapiStore";
import { useAngelsStore } from "@/lib/store/useAngelsStore";
import { useResidentsStore } from "@/lib/store/useResidentsStore";
import { useUsersStore } from "@/lib/store/useUsersStore";
import type { RoundTemplate, TemplateQuestion } from "@/lib/types";

type RoundsTab = "Angel Rounds" | "Repository" | "RapidRound" | "Archived";

function fmt(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function RoundsPage() {
  const templates = useRoundsStore((s) => s.templates);
  const questions = useRoundsStore((s) => s.questions);
  const { archiveTemplate, addTemplate, addSection, removeSection, addQuestion, removeQuestion, completeRound } = useRoundsStore();
  const qapis = useQapiStore((s) => s.qapis);
  const angels = useAngelsStore((s) => s.angels);
  const residents = useResidentsStore((s) => s.residents);
  const departments = useUsersStore((s) => s.departments);

  const [tab, setTab] = useState<RoundsTab>("Angel Rounds");
  const [expandedSecs, setExpandedSecs] = useState<Set<string>>(new Set());
  const [rapidForm, setRapidForm] = useState({ name: "", startDate: "", endDate: "" });
  const [rapidOpen, setRapidOpen] = useState(false);

  // Round simulator state
  const [simOpen, setSimOpen] = useState(false);
  const [simAngel, setSimAngel] = useState("");
  const [simResident, setSimResident] = useState("");
  const [simAnswers, setSimAnswers] = useState<Record<string, boolean>>({});
  const [simSuccess, setSimSuccess] = useState(false);

  const activeAngelTemplate = templates.find((t) => t.active && t.type === "angel");
  const activeRapidTemplate = templates.find((t) => t.active && t.type === "rapid");
  const archivedTemplates = templates.filter((t) => t.archivedAt);

  const activeAngels = angels.filter((a) => !a.absent);
  const activeResidents = residents.filter((r) => r.status === "active");

  function toggleSec(id: string) {
    setExpandedSecs((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function initSimulator() {
    if (!activeAngelTemplate) return;
    const answers: Record<string, boolean> = {};
    for (const sec of activeAngelTemplate.sections) {
      for (const q of sec.questions) { answers[q.questionId] = true; }
    }
    setSimAnswers(answers);
    setSimAngel(activeAngels[0]?.id ?? "");
    const angel = activeAngels[0];
    const angelResidents = angel ? activeResidents.filter((r) => r.angelId === angel.id) : [];
    setSimResident(angelResidents[0]?.id ?? "");
    setSimOpen(true);
  }

  function submitRound() {
    if (!activeAngelTemplate || !simAngel || !simResident) return;
    const answers = Object.entries(simAnswers).map(([questionId, answer]) => {
      const flagged = !answer;
      return { questionId, answer, issueFlagged: flagged };
    });
    completeRound({
      templateId: activeAngelTemplate.id,
      angelId: simAngel,
      residentId: simResident,
      completedAt: new Date().toISOString(),
      answers,
    });
    setSimOpen(false);
    setSimSuccess(true);
    setTimeout(() => setSimSuccess(false), 4000);
  }

  function createRapid() {
    if (!rapidForm.name.trim()) return;
    addTemplate({ name: rapidForm.name, type: "rapid", startDate: rapidForm.startDate || new Date().toISOString().split("T")[0], endDate: rapidForm.endDate || undefined });
    setRapidOpen(false);
    setRapidForm({ name: "", startDate: "", endDate: "" });
  }

  const TABS: RoundsTab[] = ["Angel Rounds", "Repository", "RapidRound", "Archived"];

  return (
    <div className="max-w-[1200px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>Rounds</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Templates, question repository, and rapid response</p>
        </div>
        {tab === "Angel Rounds" && (
          <button
            onClick={initSimulator}
            disabled={!activeAngelTemplate}
            title={!activeAngelTemplate ? "No active template — create one first" : "Open round simulator"}
            style={{ display: "flex", alignItems: "center", gap: 6, background: activeAngelTemplate ? "var(--green)" : "var(--hair-strong)", color: activeAngelTemplate ? "#fff" : "var(--muted)", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: activeAngelTemplate ? "pointer" : "not-allowed" }}>
            <Play size={14} /> Simulate Round
          </button>
        )}
        {tab === "RapidRound" && (
          <button onClick={() => setRapidOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--blue)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            <Zap size={14} /> New RapidRound
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--hair)" }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", background: "none", border: "none", color: tab === t ? "var(--blue)" : "var(--muted)", borderBottom: tab === t ? "2px solid var(--blue)" : "2px solid transparent", transition: "all 0.2s", marginBottom: -1, display: "flex", alignItems: "center", gap: 6 }}>
            {t === "RapidRound" && <Zap size={12} />}
            {t === "Repository" && <BookOpen size={12} />}
            {t === "Archived" && <Archive size={12} />}
            {t}
          </button>
        ))}
      </div>

      {/* Angel Rounds */}
      {tab === "Angel Rounds" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {simSuccess && (
            <div style={{ background: "var(--green-tint)", border: "1px solid var(--green-edge)", borderRadius: 10, padding: "10px 16px", fontSize: 12, color: "var(--green)", fontWeight: 500 }}>
              ✓ Round submitted successfully. Dashboard and Issues have been updated.
            </div>
          )}
          {activeAngelTemplate ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{activeAngelTemplate.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--green-tint)", color: "var(--green)" }}>Active</span>
                </div>
                <button onClick={() => archiveTemplate(activeAngelTemplate.id)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <Archive size={11} /> Archive template
                </button>
              </div>

              {activeAngelTemplate.sections.map((sec) => {
                const linkedQapi = qapis.find((q) => q.id === sec.qapiId);
                const isExp = expandedSecs.has(sec.id);
                return (
                  <div key={sec.id} style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
                    <div onClick={() => toggleSec(sec.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}>
                      <span style={{ color: "var(--muted)" }}>{isExp ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{sec.title}</span>
                          {linkedQapi && <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 999, background: "var(--blue-tint)", color: "var(--blue)" }}>QAPI: {linkedQapi.title}</span>}
                        </div>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{sec.questions.length} question{sec.questions.length !== 1 ? "s" : ""}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeSection(activeAngelTemplate.id, sec.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}><X size={13} /></button>
                    </div>
                    {isExp && (
                      <div style={{ borderTop: "1px solid var(--hair-soft)", padding: "8px 16px 12px" }}>
                        {sec.questions.map((q, qi) => (
                          <div key={q.questionId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: qi < sec.questions.length - 1 ? "1px solid var(--hair-soft)" : undefined }}>
                            <GripVertical size={13} style={{ color: "var(--hair-strong)", cursor: "grab" }} />
                            <span style={{ flex: 1, fontSize: 12, color: "var(--ink-soft)" }}>{q.text}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: "var(--red-tint)", color: "var(--red)" }}>Issue if {q.issueOn}</span>
                            <span style={{ fontSize: 10, color: "var(--muted)" }}>→ {departments.find((d) => d.id === q.notifyDepartmentId)?.name}</span>
                            <button onClick={() => removeQuestion(activeAngelTemplate.id, sec.id, q.questionId)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }}><X size={11} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13, boxShadow: "var(--shadow-sm)" }}>
              No active angel rounds template. Create one from the Archived tab or start fresh.
            </div>
          )}
        </div>
      )}

      {/* Repository */}
      {tab === "Repository" && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--hair)", background: "var(--surface-alt)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Question Repository ({questions.length})</span>
          </div>
          {questions.map((q, i) => (
            <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: i < questions.length - 1 ? "1px solid var(--hair-soft)" : undefined }}>
              <GripVertical size={13} style={{ color: "var(--hair-strong)", flexShrink: 0, cursor: "grab" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{q.text}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{q.section}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: "var(--red-tint)", color: "var(--red)", flexShrink: 0 }}>Issue if {q.issueOn}</span>
              <span style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0 }}>→ {departments.find((d) => d.id === q.notifyDepartmentId)?.name}</span>
              <button onClick={() => useRoundsStore.getState().removeRepositoryQuestion(q.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2, flexShrink: 0 }}><X size={11} /></button>
            </div>
          ))}
        </div>
      )}

      {/* RapidRound */}
      {tab === "RapidRound" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activeRapidTemplate ? (
            <div style={{ background: "var(--surface)", border: "1px solid var(--blue-pale)", borderRadius: 12, padding: "16px 20px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Zap size={14} style={{ color: "var(--blue)" }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{activeRapidTemplate.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--green-tint)", color: "var(--green)" }}>Active</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>Started {fmt(activeRapidTemplate.startDate)}{activeRapidTemplate.endDate ? ` · ends ${fmt(activeRapidTemplate.endDate)}` : ""}</span>
                </div>
                <button onClick={() => archiveTemplate(activeRapidTemplate.id)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid var(--red-edge)", background: "var(--red-tint)", color: "var(--red)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <Square size={11} /> Stop
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: "var(--surface)", border: "1px dashed var(--hair-strong)", borderRadius: 12, padding: 40, textAlign: "center", boxShadow: "var(--shadow-sm)" }}>
              <Zap size={24} style={{ color: "var(--blue-mid)", marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>No active RapidRound</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>Create a rapid response template to immediately gather data from all rounding angels</div>
              <button onClick={() => setRapidOpen(true)} style={{ fontSize: 13, fontWeight: 500, padding: "9px 20px", borderRadius: 8, border: "none", background: "var(--blue)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} /> Create RapidRound
              </button>
            </div>
          )}
        </div>
      )}

      {/* Archived */}
      {tab === "Archived" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {archivedTemplates.length === 0 ? (
            <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13, boxShadow: "var(--shadow-sm)" }}>No archived templates</div>
          ) : archivedTemplates.map((t) => (
            <div key={t.id} style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "14px 18px", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{t.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 999, background: "var(--surface-alt)", color: "var(--muted)" }}>{t.type === "rapid" ? "RapidRound" : "Angel Rounds"}</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Started {fmt(t.startDate)} · Archived {t.archivedAt ? fmt(t.archivedAt) : "—"}</span>
              </div>
              <button style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", cursor: "pointer" }}>
                Use as template
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Round Simulator Modal */}
      {simOpen && activeAngelTemplate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) setSimOpen(false); }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: "24px 28px", width: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>Simulate Round</h2>
              <button onClick={() => setSimOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={16} /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Angel</label>
                <select value={simAngel} onChange={(e) => { setSimAngel(e.target.value); const res = activeResidents.filter((r) => r.angelId === e.target.value); setSimResident(res[0]?.id ?? ""); }} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", cursor: "pointer" }}>
                  {activeAngels.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Resident</label>
                <select value={simResident} onChange={(e) => setSimResident(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", cursor: "pointer" }}>
                  {activeResidents.filter((r) => r.angelId === simAngel).map((r) => <option key={r.id} value={r.id}>{r.name} (Rm {r.room}{r.bed})</option>)}
                </select>
              </div>
            </div>

            {activeAngelTemplate.sections.map((sec) => (
              <div key={sec.id} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{sec.title}</div>
                {sec.questions.map((q) => (
                  <div key={q.questionId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--hair-soft)" }}>
                    <span style={{ fontSize: 12, color: "var(--ink-soft)", flex: 1 }}>{q.text}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setSimAnswers((a) => ({ ...a, [q.questionId]: true }))} style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6, border: `1px solid ${simAnswers[q.questionId] === true ? "var(--green)" : "var(--hair-strong)"}`, background: simAnswers[q.questionId] === true ? "var(--green-tint)" : "var(--surface-alt)", color: simAnswers[q.questionId] === true ? "var(--green)" : "var(--muted)", cursor: "pointer" }}>Yes</button>
                      <button onClick={() => setSimAnswers((a) => ({ ...a, [q.questionId]: false }))} style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6, border: `1px solid ${simAnswers[q.questionId] === false ? "var(--red)" : "var(--hair-strong)"}`, background: simAnswers[q.questionId] === false ? "var(--red-tint)" : "var(--surface-alt)", color: simAnswers[q.questionId] === false ? "var(--red)" : "var(--muted)", cursor: "pointer" }}>No</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={() => setSimOpen(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={submitRound} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--green)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Submit round</button>
            </div>
          </div>
        </div>
      )}

      {/* New RapidRound Modal */}
      {rapidOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) setRapidOpen(false); }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: "24px 28px", width: 440, boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>New RapidRound</h2>
              <button onClick={() => setRapidOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={16} /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Name</label>
              <input value={rapidForm.name} onChange={(e) => setRapidForm((f) => ({ ...f, name: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} placeholder="e.g. Meal service concern check" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Start date</label>
                <input type="date" value={rapidForm.startDate} onChange={(e) => setRapidForm((f) => ({ ...f, startDate: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 12, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>End date (optional)</label>
                <input type="date" value={rapidForm.endDate} onChange={(e) => setRapidForm((f) => ({ ...f, endDate: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 12, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setRapidOpen(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={createRapid} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--blue)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Launch RapidRound</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
