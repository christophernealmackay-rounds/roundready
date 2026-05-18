"use client";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Zap } from "lucide-react";
import { useAngelsStore } from "@/lib/store/useAngelsStore";
import { useResidentsStore } from "@/lib/store/useResidentsStore";
import { useRoundsStore } from "@/lib/store/useRoundsStore";
import type { RoundTemplate, TemplateQuestion } from "@/lib/types";

type Step = "pick-resident" | "questions" | "submitting" | "done";

/** Authoritative client-side flag (mirrors backend submit_round). Exported
 *  for unit testing and reused for the inline-textarea trigger + submit. */
export function computeFlag(
  q: Pick<TemplateQuestion, "type" | "issueOn" | "scaleThreshold" | "scaleThresholdDirection">,
  value: boolean | number | undefined,
): boolean {
  if (q.type === "scale" && typeof value === "number") {
    const t = q.scaleThreshold;
    if (t == null) return false;
    return q.scaleThresholdDirection === "lte" ? value <= t : value >= t;
  }
  if (typeof value === "boolean") {
    if (q.issueOn === "yes") return value;
    if (q.issueOn === "no") return !value;
  }
  return false;
}

// Question + its sourcing context. We dedup by questionId for the visible
// flow (the angel sees each question once) but keep track of every template
// that referenced it so submit can fan out to one round per template.
type FlowQuestion = TemplateQuestion & {
  primaryTemplateId: string;
  primaryTemplateName: string;
  // 'rapid' when the question's primary source is a deployed rapid round.
  source: "angel" | "rapid";
  templateIds: string[];
};

interface Props {
  template: RoundTemplate;
  /** Deployed rapid rounds whose questions are appended to the angel's queue
   *  with a "Rapid Round · {name}" badge. Empty by default. */
  rapidTemplates?: RoundTemplate[];
  onClose: () => void;
}

/**
 * Angel-side rounding experience rendered inside <MobileFrame/>.
 * Flow: pick a resident → answer each question yes/no → submit.
 */
export default function AngelRoundFlow({ template, rapidTemplates = [], onClose }: Props) {
  const angels = useAngelsStore((s) => s.angels);
  const residents = useResidentsStore((s) => s.residents);
  const completeRound = useRoundsStore((s) => s.completeRound);

  // Demo: hardcoded to the first available angel (mimics a logged-in angel).
  const angel = useMemo(() => angels.find((a) => !a.absent) ?? null, [angels]);
  const myResidents = useMemo(
    () =>
      residents.filter(
        (r) => r.status === "active" && angel && r.angelId === angel.id
      ),
    [residents, angel]
  );

  // Flatten across sections — angel template first, then each deployed rapid
  // template in order. Dedup by questionId so the angel only answers a given
  // question once even if it's linked into multiple sections/templates, but
  // remember every template the question came from so submit can write a
  // round for each. Rapid questions land at the bottom with a badge.
  const allQuestions: FlowQuestion[] = useMemo(() => {
    const seen = new Map<string, FlowQuestion>();
    const order: string[] = [];
    function ingest(t: RoundTemplate, source: "angel" | "rapid") {
      for (const s of t.sections) {
        for (const q of s.questions) {
          const existing = seen.get(q.questionId);
          if (existing) {
            if (!existing.templateIds.includes(t.id)) existing.templateIds.push(t.id);
            continue;
          }
          seen.set(q.questionId, {
            ...q,
            primaryTemplateId: t.id,
            primaryTemplateName: t.name,
            source,
            templateIds: [t.id],
          });
          order.push(q.questionId);
        }
      }
    }
    ingest(template, "angel");
    for (const rt of rapidTemplates) ingest(rt, "rapid");
    return order.map((id) => seen.get(id)!);
  }, [template, rapidTemplates]);

  const [step, setStep] = useState<Step>("pick-resident");
  const [residentId, setResidentId] = useState<string>("");
  const [qIndex, setQIndex] = useState(0);
  // Holds either a boolean (yes/no questions) or a number (scale questions),
  // keyed by question id. Allows the angel to navigate back and forward
  // without losing prior answers.
  const [answers, setAnswers] = useState<Record<string, boolean | number>>({});
  // Angel's free-text description, keyed by question id. Required before
  // submit whenever that question's answer flags an issue.
  const [flagNotes, setFlagNotes] = useState<Record<string, string>>({});

  const currentResident = residents.find((r) => r.id === residentId);
  const currentQuestion = allQuestions[qIndex];
  const totalQ = allQuestions.length;

  function answer(value: boolean | number) {
    if (!currentQuestion) return;
    setAnswers((a) => ({ ...a, [currentQuestion.questionId]: value }));
    // If the answer flags, stay on this question so the angel can fill in
    // the required description before advancing. Otherwise auto-advance.
    if (!computeFlag(currentQuestion, value) && qIndex < totalQ - 1) {
      setQIndex((i) => i + 1);
    }
  }

  // Any answered question that flags but has no (non-whitespace) note blocks
  // submission — the resolver must always get the angel's context.
  const flaggedNoteMissing = allQuestions.some((q) => {
    const v = answers[q.questionId];
    return computeFlag(q, v) && !(flagNotes[q.questionId] ?? "").trim();
  });

  async function submit() {
    if (!angel || !residentId) return;
    setStep("submitting");
    // Build one submission per distinct template that referenced any of the
    // questions the angel just answered. A question linked into both the
    // angel template and a deployed rapid round gets recorded in both rounds.
    const byTemplate = new Map<string, { templateId: string; answers: typeof submissionEntry[] }>();
    type SubmissionEntry = {
      questionId: string;
      answer: boolean | null;
      answerNumber: number | null;
      issueFlagged: boolean;
      flagNotes: string | null;
    };
    // Type-only placeholder to give Map's value shape a name.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const submissionEntry: SubmissionEntry = { questionId: "", answer: null, answerNumber: null, issueFlagged: false, flagNotes: null };
    for (const q of allQuestions) {
      const value = answers[q.questionId];
      let answerBool: boolean | null = null;
      let answerNumber: number | null = null;
      if (q.type === "scale" && typeof value === "number") {
        answerNumber = value;
      } else if (typeof value === "boolean") {
        answerBool = value;
      }
      const flagged = computeFlag(q, value);
      const entry: SubmissionEntry = {
        questionId: q.questionId,
        answer: answerBool,
        answerNumber,
        issueFlagged: flagged,
        flagNotes: flagged ? (flagNotes[q.questionId] ?? "").trim() || null : null,
      };
      for (const tid of q.templateIds) {
        const bucket = byTemplate.get(tid) ?? { templateId: tid, answers: [] };
        bucket.answers.push(entry);
        byTemplate.set(tid, bucket);
      }
    }
    try {
      // Fan out: one round per template. Submit angel template first so the
      // dashboard ordering stays sensible.
      const completedAt = new Date().toISOString();
      const buckets = [...byTemplate.values()].sort((a) =>
        a.templateId === template.id ? -1 : 1,
      );
      for (const bucket of buckets) {
        await completeRound({
          templateId: bucket.templateId,
          angelId: angel.id,
          residentId,
          completedAt,
          answers: bucket.answers,
        });
      }
      setStep("done");
    } catch {
      setStep("questions");
    }
  }

  // ── Step: pick resident ────────────────────────────────────────────────
  if (step === "pick-resident") {
    return (
      <Screen>
        <Header title="Today's Rounds" subtitle={angel?.name ?? "Angel"} />
        <div style={{ padding: "12px 16px 4px", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {myResidents.length} resident{myResidents.length === 1 ? "" : "s"}
        </div>
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {myResidents.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
              No residents assigned
            </div>
          ) : (
            myResidents.map((r) => (
              <button
                key={r.id}
                onClick={() => { setResidentId(r.id); setStep("questions"); setQIndex(0); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--hair)", background: "var(--surface)", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--blue-tint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--blue-deep)", flexShrink: 0 }}>
                  {r.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Room {r.room}{r.bed}</div>
                </div>
                <ChevronRight size={14} style={{ color: "var(--muted)" }} />
              </button>
            ))
          )}
        </div>
      </Screen>
    );
  }

  // ── Step: answer questions ──────────────────────────────────────────────
  if (step === "questions" && currentQuestion && currentResident) {
    const value = answers[currentQuestion.questionId];
    const isLast = qIndex === totalQ - 1;
    const flaggedNow = computeFlag(currentQuestion, value);
    const currentNote = (flagNotes[currentQuestion.questionId] ?? "").trim();
    const currentBlocked = flaggedNow && !currentNote;
    return (
      <Screen>
        <Header
          title={currentResident.name}
          subtitle={`Room ${currentResident.room}${currentResident.bed}`}
        />

        {/* Progress dots */}
        <div style={{ padding: "8px 16px 4px", display: "flex", gap: 4, alignItems: "center" }}>
          {allQuestions.map((q, i) => {
            const answered = answers[q.questionId] !== undefined;
            const here = i === qIndex;
            return (
              <span
                key={q.questionId}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 4,
                  background: here ? "var(--blue)" : answered ? "var(--green)" : "var(--hair-strong)",
                  transition: "background 0.2s",
                }}
              />
            );
          })}
        </div>
        <div style={{ padding: "0 16px", fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
          Question {qIndex + 1} of {totalQ}
        </div>

        <div style={{ flex: 1, padding: "20px 18px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {currentQuestion.source === "rapid" && (
            <div style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 600,
              padding: "3px 9px",
              borderRadius: 999,
              background: "var(--plum-tint)",
              color: "var(--plum)",
              marginBottom: 10,
              letterSpacing: "0.02em",
            }}>
              <Zap size={10} /> Rapid Round · {currentQuestion.primaryTemplateName}
            </div>
          )}
          <div style={{ fontSize: 16, lineHeight: 1.4, fontWeight: 500, color: "var(--ink)", marginBottom: 6 }}>
            {currentQuestion.text}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            {currentQuestion.type === "scale" && currentQuestion.scaleThreshold != null
              ? `Flag if ${currentQuestion.scaleThresholdDirection === "lte" ? "≤" : "≥"} ${currentQuestion.scaleThreshold}`
              : currentQuestion.issueOn === "either"
                ? "Informational — no automatic flag"
                : `Flagging if ${currentQuestion.issueOn}`}
          </div>
        </div>

        {currentQuestion.type === "scale" ? (
          <ScalePicker
            min={currentQuestion.scaleMin ?? 1}
            max={currentQuestion.scaleMax ?? 10}
            value={typeof value === "number" ? value : undefined}
            onPick={(n) => answer(n)}
          />
        ) : (
          <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => answer(true)}
              style={tapBtn(value === true ? "var(--green)" : "var(--surface)", value === true ? "#fff" : "var(--ink)")}
            >
              Yes
            </button>
            <button
              onClick={() => answer(false)}
              style={tapBtn(value === false ? "var(--red)" : "var(--surface)", value === false ? "#fff" : "var(--ink)")}
            >
              No
            </button>
          </div>
        )}

        {flaggedNow && (
          <div style={{ padding: "0 16px 12px" }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--red)", marginBottom: 5 }}>
              Describe what you observed <span aria-hidden>*</span>
            </label>
            <textarea
              value={flagNotes[currentQuestion.questionId] ?? ""}
              onChange={(e) =>
                setFlagNotes((n) => ({ ...n, [currentQuestion.questionId]: e.target.value }))
              }
              rows={3}
              placeholder="What's happening that caused this to flag? The person resolving the issue will rely on this."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "9px 11px",
                borderRadius: 10,
                border: `1px solid ${currentBlocked ? "var(--red)" : "var(--hair-strong)"}`,
                background: "var(--surface)",
                color: "var(--ink)",
                fontSize: 13,
                lineHeight: 1.45,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            {currentBlocked && (
              <div style={{ fontSize: 10.5, color: "var(--red)", marginTop: 4 }}>
                A description is required for flagged items before you can continue.
              </div>
            )}
          </div>
        )}

        <div style={{ padding: "0 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => qIndex > 0 && setQIndex((i) => i - 1)}
            disabled={qIndex === 0}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: qIndex === 0 ? "var(--hair-strong)" : "var(--blue)", fontSize: 12, fontWeight: 500, cursor: qIndex === 0 ? "default" : "pointer" }}
          >
            <ArrowLeft size={12} /> Back
          </button>
          {isLast ? (
            (() => {
              const blocked = value === undefined || flaggedNoteMissing;
              return (
                <button
                  onClick={submit}
                  disabled={blocked}
                  title={flaggedNoteMissing ? "Describe every flagged item before submitting" : undefined}
                  style={{ display: "flex", alignItems: "center", gap: 4, background: blocked ? "var(--hair-strong)" : "var(--blue)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: blocked ? "not-allowed" : "pointer" }}
                >
                  Submit <Check size={12} />
                </button>
              );
            })()
          ) : (
            <button
              onClick={() => !currentBlocked && setQIndex((i) => Math.min(totalQ - 1, i + 1))}
              disabled={currentBlocked}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: currentBlocked ? "var(--hair-strong)" : "var(--blue)", fontSize: 12, fontWeight: 500, cursor: currentBlocked ? "not-allowed" : "pointer" }}
            >
              {value === undefined ? "Skip" : "Next"} <ArrowRight size={12} />
            </button>
          )}
        </div>
      </Screen>
    );
  }

  if (step === "submitting") {
    return (
      <Screen>
        <Header title="Submitting…" />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12 }}>
          Saving round to chart
        </div>
      </Screen>
    );
  }

  // step === "done"
  return (
    <Screen>
      <Header title="Round complete" subtitle={currentResident?.name ?? ""} />
      <div style={{ flex: 1, padding: "30px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--green-tint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Check size={32} style={{ color: "var(--green)" }} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Submitted</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          Any flagged answers were sent to the right department head and the DON.
        </div>
      </div>
      <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {myResidents.length > 1 && (
          <button
            onClick={() => {
              setStep("pick-resident");
              setResidentId("");
              setAnswers({});
              setQIndex(0);
            }}
            style={tapBtn("var(--blue)", "#fff")}
          >
            Next resident
          </button>
        )}
        <button
          onClick={onClose}
          style={tapBtn("var(--surface)", "var(--ink)")}
        >
          Done
        </button>
      </div>
    </Screen>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div
      style={{
        background: "var(--topbar-gradient)",
        color: "#fff",
        padding: "12px 16px 14px",
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
      }}
    >
      <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500 }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 1 }}>{subtitle}</div>
      )}
    </div>
  );
}

function tapBtn(bg: string, color: string): React.CSSProperties {
  return {
    width: "100%",
    padding: "13px 16px",
    border: "1px solid var(--hair)",
    borderRadius: 12,
    background: bg,
    color,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "var(--shadow-sm)",
  };
}

function ScalePicker({
  min,
  max,
  value,
  onPick,
}: {
  min: number;
  max: number;
  value: number | undefined;
  onPick: (n: number) => void;
}) {
  // Range can be wider than 1-10 (configurable), so flow-wrap with consistent
  // square buttons. Selected value highlights in blue; the rest stay neutral.
  const numbers: number[] = [];
  for (let n = min; n <= max; n++) numbers.push(n);
  return (
    <div style={{ padding: "0 16px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>
        <span>Low ({min})</span>
        <span>High ({max})</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {numbers.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              onClick={() => onPick(n)}
              style={{
                flex: "1 0 auto",
                minWidth: 36,
                height: 44,
                borderRadius: 10,
                border: `1px solid ${active ? "var(--blue)" : "var(--hair)"}`,
                background: active ? "var(--blue)" : "var(--surface)",
                color: active ? "#fff" : "var(--ink)",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: active ? "0 1px 2px rgba(7,43,82,.18)" : undefined,
                transition: "all 0.1s",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
