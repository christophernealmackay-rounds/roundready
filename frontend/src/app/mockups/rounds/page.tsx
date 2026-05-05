"use client";
import { useState } from "react";
import { Plus, GripVertical, Link2, Zap, Archive, BookOpen } from "lucide-react";

const tabs = ["Angel Rounds", "Repository", "RapidRound", "Archived"];

const angelRoundTemplate = {
  name: "May 2026 Angel Rounds",
  qapiSections: [
    {
      qapiTitle: "Fall Prevention Program",
      items: [
        {
          title: "Environmental Safety Assessment",
          questions: [
            { text: "Is the call light within reach?", issueOn: "no", notifyDept: "Nursing" },
            { text: "Are bed rails in proper position per care plan?", issueOn: "no", notifyDept: "Nursing" },
            { text: "Is the floor free of fall hazards?", issueOn: "no", notifyDept: "Housekeeping" },
            { text: "Are non-slip footwear and mobility aids accessible?", issueOn: "no", notifyDept: "Nursing" },
          ],
        },
        {
          title: "High-Risk Resident Identification",
          questions: [
            { text: "Is fall risk assessment completed and current?", issueOn: "no", notifyDept: "MDS" },
            { text: "Are fall precaution interventions in place?", issueOn: "no", notifyDept: "Nursing" },
          ],
        },
      ],
    },
    {
      qapiTitle: "Pressure Injury Prevention",
      items: [
        {
          title: "Skin Integrity Rounds",
          questions: [
            { text: "Has skin assessment been completed this shift?", issueOn: "no", notifyDept: "Nursing" },
            { text: "Are repositioning intervals being followed?", issueOn: "no", notifyDept: "Nursing" },
            { text: "Is pressure-relieving equipment in place?", issueOn: "no", notifyDept: "Therapy" },
          ],
        },
      ],
    },
  ],
};

const repositoryQuestions = [
  { id: 1, text: "Is the resident's room temperature comfortable?", section: "Environment" },
  { id: 2, text: "Has the resident received scheduled medications?", section: "Clinical" },
  { id: 3, text: "Is the resident free from signs of pain or distress?", section: "Clinical" },
  { id: 4, text: "Has the resident been offered activities today?", section: "Engagement" },
  { id: 5, text: "Is meal assistance being provided per care plan?", section: "Nutrition" },
  { id: 6, text: "Is the resident's dignity being maintained during care?", section: "Quality of Life" },
];

export default function RoundsPage() {
  const [activeTab, setActiveTab] = useState("Angel Rounds");

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>Rounds</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Templates, question repository, and rapid response</p>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "var(--blue)", color: "#fff", border: "none",
          borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer",
        }}>
          <Plus size={14} /> New Template
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b" style={{ borderColor: "var(--hair)" }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "10px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer",
            background: "none", border: "none",
            color: activeTab === tab ? "var(--blue)" : "var(--muted)",
            borderBottom: activeTab === tab ? "2px solid var(--blue)" : "2px solid transparent",
            transition: "all 0.2s", marginBottom: -1,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {tab === "RapidRound" && <Zap size={12} />}
            {tab === "Repository" && <BookOpen size={12} />}
            {tab === "Archived" && <Archive size={12} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Angel Rounds */}
      {activeTab === "Angel Rounds" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>{angelRoundTemplate.name}</span>
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--green-tint)", color: "var(--green)" }}>Active</span>
            </div>
          </div>
          {angelRoundTemplate.qapiSections.map(section => (
            <div key={section.qapiTitle} className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--hair)", background: "var(--blue-wash)" }}>
                <Link2 size={13} color="var(--blue-mid)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)" }}>{section.qapiTitle}</span>
              </div>
              {section.items.map((item, ii) => (
                <div key={item.title} style={{ borderTop: ii > 0 ? "1px solid var(--hair)" : undefined }}>
                  <div className="px-5 py-3" style={{ background: "var(--surface-alt)" }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)" }}>{item.title}</p>
                  </div>
                  {item.questions.map((q, qi) => (
                    <div key={qi} className="flex items-center gap-3 px-5 py-3" style={{ borderTop: "1px solid var(--hair-soft)" }}>
                      <GripVertical size={14} color="var(--faint)" style={{ cursor: "grab" }} />
                      <span style={{ flex: 1, fontSize: 13, color: "var(--ink-soft)" }}>{q.text}</span>
                      <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 999, background: "var(--red-tint)", color: "var(--red)" }}>Issue if No</span>
                      <span style={{ fontSize: 11, color: "var(--faint)" }}>→ {q.notifyDept}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Repository */}
      {activeTab === "Repository" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="section-label mb-3">Question Repository</p>
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--hair)" }}>
                <input placeholder="Search questions…" style={{ width: "100%", border: "none", outline: "none", fontSize: 13, color: "var(--ink)", background: "transparent" }} />
              </div>
              <div className="divide-y" style={{ "--tw-divide-color": "var(--hair-soft)" } as React.CSSProperties}>
                {repositoryQuestions.map(q => (
                  <div key={q.id} className="flex items-center gap-3 px-4 py-3 cursor-grab active:cursor-grabbing">
                    <GripVertical size={14} color="var(--faint)" />
                    <div className="flex-1">
                      <p style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{q.text}</p>
                      <p style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{q.section}</p>
                    </div>
                    <button style={{ fontSize: 11.5, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>Add →</button>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t" style={{ borderColor: "var(--hair)" }}>
                <button style={{ fontSize: 12, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>+ Add Question to Repository</button>
              </div>
            </div>
          </div>
          <div>
            <p className="section-label mb-3">Drop Zone — Angel Rounds Template</p>
            <div
              className="rounded-xl min-h-[300px] flex flex-col items-center justify-center"
              style={{ border: "2px dashed var(--blue-pale)", background: "var(--blue-wash)", color: "var(--blue-mid)" }}
            >
              <p style={{ fontSize: 13, fontWeight: 500 }}>Drag questions here</p>
              <p style={{ fontSize: 12, color: "var(--faint)", marginTop: 4 }}>to add to the active template</p>
            </div>
          </div>
        </div>
      )}

      {/* RapidRound */}
      {activeTab === "RapidRound" && (
        <div className="max-w-lg space-y-4">
          <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--amber-edge)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center gap-2">
              <Zap size={16} color="var(--amber-mid)" />
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>Create RapidRound</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Deploy an immediate rounding survey to all angels. Use for rapid response to emerging facility concerns.</p>
            {[
              { label: "Template Name", placeholder: "e.g., Norovirus Symptom Check" },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5, letterSpacing: "0.02em" }}>{f.label}</label>
                <input placeholder={f.placeholder} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none" }} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5, letterSpacing: "0.02em" }}>Start Date</label>
                <input type="date" defaultValue="2026-05-05" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5, letterSpacing: "0.02em" }}>End Date (optional)</label>
                <input type="date" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none" }} />
              </div>
            </div>
            <button style={{
              width: "100%", padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              border: "none", background: "var(--amber)", color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <Zap size={14} /> Deploy RapidRound
            </button>
          </div>
        </div>
      )}

      {/* Archived */}
      {activeTab === "Archived" && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
          {[
            { name: "April 2026 Angel Rounds", archived: "May 1, 2026", questions: 24 },
            { name: "March 2026 Angel Rounds", archived: "Apr 1, 2026", questions: 22 },
            { name: "Flu Season RapidRound",   archived: "Mar 15, 2026", questions: 8 },
          ].map((t, i) => (
            <div key={t.name} className="flex items-center gap-4 px-5 py-4" style={{ borderTop: i > 0 ? "1px solid var(--hair-soft)" : undefined }}>
              <Archive size={15} color="var(--faint)" />
              <div className="flex-1">
                <span style={{ fontWeight: 500, color: "var(--ink-soft)" }}>{t.name}</span>
                <span style={{ marginLeft: 8, fontSize: 11.5, color: "var(--faint)" }}>Archived {t.archived} · {t.questions} questions</span>
              </div>
              <button style={{ fontSize: 12, fontWeight: 500, color: "var(--blue)", background: "none", border: "none", cursor: "pointer" }}>Use as Template</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
