"use client";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight } from "lucide-react";
import { useAngelsStore } from "@/lib/store/useAngelsStore";
import { useResidentsStore } from "@/lib/store/useResidentsStore";
import { useRoundsStore } from "@/lib/store/useRoundsStore";
import type { RoundTemplate, TemplateQuestion } from "@/lib/types";

type Step = "pick-resident" | "questions" | "submitting" | "done";

interface Props {
  template: RoundTemplate;
  onClose: () => void;
}

/**
 * Angel-side rounding experience rendered inside <MobileFrame/>.
 * Flow: pick a resident → answer each question yes/no → submit.
 */
export default function AngelRoundFlow({ template, onClose }: Props) {
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

  // Flatten across sections, but dedup by questionId so the angel only
  // answers each question once even when the same question is linked into
  // multiple QAPI sections (a Skin question might be tied to both the
  // "Skin Inspection" and "Repositioning" QAPI items, for example).
  const allQuestions: TemplateQuestion[] = useMemo(() => {
    const seen = new Set<string>();
    const out: TemplateQuestion[] = [];
    for (const s of template.sections) {
      for (const q of s.questions) {
        if (seen.has(q.questionId)) continue;
        seen.add(q.questionId);
        out.push(q);
      }
    }
    return out;
  }, [template]);

  const [step, setStep] = useState<Step>("pick-resident");
  const [residentId, setResidentId] = useState<string>("");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const currentResident = residents.find((r) => r.id === residentId);
  const currentQuestion = allQuestions[qIndex];
  const totalQ = allQuestions.length;

  function answer(value: boolean) {
    if (!currentQuestion) return;
    setAnswers((a) => ({ ...a, [currentQuestion.questionId]: value }));
    if (qIndex < totalQ - 1) setQIndex((i) => i + 1);
  }

  async function submit() {
    if (!angel || !residentId) return;
    setStep("submitting");
    const submission = allQuestions.map((q) => {
      const value = answers[q.questionId];
      const flagged =
        value === undefined
          ? false
          : q.issueOn === "either"
            ? false
            : (value && q.issueOn === "yes") || (!value && q.issueOn === "no");
      return {
        questionId: q.questionId,
        answer: value ?? null,
        issueFlagged: flagged,
      };
    });
    try {
      await completeRound({
        templateId: template.id,
        angelId: angel.id,
        residentId,
        completedAt: new Date().toISOString(),
        answers: submission,
      });
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
          <div style={{ fontSize: 16, lineHeight: 1.4, fontWeight: 500, color: "var(--ink)", marginBottom: 6 }}>
            {currentQuestion.text}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            {currentQuestion.issueOn === "either"
              ? "Informational — no automatic flag"
              : `Flagging if ${currentQuestion.issueOn}`}
          </div>
        </div>

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

        <div style={{ padding: "0 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => qIndex > 0 && setQIndex((i) => i - 1)}
            disabled={qIndex === 0}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: qIndex === 0 ? "var(--hair-strong)" : "var(--blue)", fontSize: 12, fontWeight: 500, cursor: qIndex === 0 ? "default" : "pointer" }}
          >
            <ArrowLeft size={12} /> Back
          </button>
          {isLast ? (
            <button
              onClick={submit}
              disabled={value === undefined}
              style={{ display: "flex", alignItems: "center", gap: 4, background: value === undefined ? "var(--hair-strong)" : "var(--blue)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: value === undefined ? "not-allowed" : "pointer" }}
            >
              Submit <Check size={12} />
            </button>
          ) : (
            <button
              onClick={() => setQIndex((i) => Math.min(totalQ - 1, i + 1))}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--blue)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
            >
              Skip <ArrowRight size={12} />
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
