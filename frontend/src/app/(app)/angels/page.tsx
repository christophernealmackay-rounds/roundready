"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useAngelsStore } from "@/lib/store/useAngelsStore";
import { useResidentsStore } from "@/lib/store/useResidentsStore";
import { useUsersStore } from "@/lib/store/useUsersStore";
import { useRoundsStore } from "@/lib/store/useRoundsStore";
import type { Angel } from "@/lib/types";
import { todayIsoDate } from "@/lib/dates";
import { PageHero, KpiCard } from "@/components/ui";

type Filter = "all" | "active" | "absent";

function ini(n: string) { return n.split(" ").map((p) => p[0]).join("").slice(0, 2); }

const TODAY = todayIsoDate();

export default function AngelsPage() {
  const angels = useAngelsStore((s) => s.angels);
  const { markAbsent, returnToDuty, redistribute, addAngel } = useAngelsStore();
  const residents = useResidentsStore((s) => s.residents);
  const departments = useUsersStore((s) => s.departments);
  const users = useUsersStore((s) => s.users);
  const completedRounds = useRoundsStore((s) => s.completedRounds);

  const [filter, setFilter] = useState<Filter>("all");
  const [absentModal, setAbsentModal] = useState<Angel | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ userId: "", departmentId: "" });

  const absentAngels = angels.filter((a) => a.absent);
  const activeAngels = angels.filter((a) => !a.absent);
  const depts = new Set(angels.map((a) => a.departmentId)).size;

  // Banner state is derived from residents so it survives tab navigation
  // and is correct after a hard refresh. A resident belongs to an absent
  // angel when their originalAngelId points at one. If any such resident
  // is still unassigned, the banner stays amber. Otherwise (and at least
  // one is covered), it's green.
  const absentAngelIds = new Set(absentAngels.map((a) => a.id));
  const absentOwnedResidents = residents.filter(
    (r) => r.originalAngelId && absentAngelIds.has(r.originalAngelId)
  );
  const pendingRedistribution = absentOwnedResidents.some((r) => r.angelId === null);
  const fullyCovered = !pendingRedistribution && absentOwnedResidents.length > 0;

  const displayed = filter === "active" ? activeAngels : filter === "absent" ? absentAngels : angels;

  function todayRounds(angelId: string) {
    return completedRounds.filter((r) => r.angelId === angelId && r.completedAt.startsWith(TODAY)).length;
  }
  function residentCount(angelId: string) {
    return residents.filter((r) => r.angelId === angelId && r.status === "active").length;
  }

  function saveAdd() {
    if (!form.userId || !form.departmentId) return;
    addAngel({ userId: form.userId, departmentId: form.departmentId });
    setAddOpen(false);
    setForm({ userId: "", departmentId: "" });
  }

  const kpiCards: { id: Filter; label: string; value: number; color: string }[] = [
    { id: "all",    label: "Total Angels",  value: angels.length,       color: "var(--ink)" },
    { id: "active", label: "On Duty Today", value: activeAngels.length, color: "var(--green)" },
    { id: "absent", label: "Absent Today",  value: absentAngels.length, color: "var(--red)" },
    { id: "all",    label: "Departments",   value: depts,               color: "var(--blue)" },
  ];

  return (
    <div className="max-w-[1100px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      <PageHero
        eyebrow="Angels · Department Heads"
        title="The people"
        accent="who round."
        caption="Department leads who carry the rounding load. Mark absences, redistribute, restore."
        trailing={
          <button
            onClick={() => setAddOpen(true)}
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
            <Plus size={14} /> Add Angel
          </button>
        }
      />

      {/* KPI filter cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {kpiCards.map((k, i) => {
          const filterId: Filter = i === 1 ? "active" : i === 2 ? "absent" : "all";
          const isActive =
            (i === 0 && filter === "all") ||
            (i === 1 && filter === "active") ||
            (i === 2 && filter === "absent");
          const accent = i === 1 ? "green" : i === 2 ? "red" : i === 3 ? "blue" : "ink";
          return (
            <KpiCard
              key={k.label + i}
              revealIndex={i}
              label={k.label}
              value={String(k.value)}
              accent={accent as "green" | "red" | "blue" | "ink"}
              active={isActive}
              onClick={i < 3 ? () => setFilter(filterId) : undefined}
            />
          );
        })}
      </div>

      {/* Absent bar — colour and call-to-action derive entirely from the
          residents store, so it survives navigation and refresh. */}
      {absentAngels.length > 0 && (pendingRedistribution || fullyCovered) && (
        <div
          className="luxe-reveal-stagger"
          style={{
            ["--i" as string]: 4,
            background: fullyCovered
              ? "linear-gradient(180deg, var(--green-tint), var(--green-pale))"
              : "linear-gradient(180deg, var(--amber-tint), var(--amber-pale))",
            border: `1px solid ${fullyCovered ? "var(--green-edge)" : "var(--amber-edge)"}`,
            borderRadius: 10,
            padding: "11px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            transition: "all 0.3s",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.5)",
          }}
        >
          <div style={{ fontSize: 12, color: fullyCovered ? "var(--green)" : "var(--amber)" }}>
            {fullyCovered ? (
              <><strong>Rounds redistributed.</strong> Absent angels&apos; residents have been reassigned to available angels. Go to <strong>Residents</strong> to review assignments.</>
            ) : (
              <><strong>{absentAngels.map((a) => a.name).join(", ")}</strong> {absentAngels.length === 1 ? "is" : "are"} marked absent today. Their residents are unassigned.</>
            )}
          </div>
          {pendingRedistribution && (
            <button
              // The /redistribute endpoint redistributes every unassigned
              // resident regardless of which absent angel id is passed, so
              // one call covers all absent angels at once.
              onClick={() => redistribute(absentAngels[0].id)}
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: "7px 14px",
                borderRadius: 7,
                border: "1px solid var(--amber-edge)",
                background: "var(--surface)",
                color: "var(--amber)",
                cursor: "pointer",
                flexShrink: 0,
                boxShadow: "var(--shadow-card)",
              }}
            >
              Auto-redistribute rounds
            </button>
          )}
        </div>
      )}

      {/* Filter banner */}
      {filter !== "all" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--blue-tint)", border: "1px solid var(--blue-pale)", borderRadius: 8, padding: "8px 12px" }}>
          <span style={{ fontSize: 12, color: "var(--blue)" }}>Showing <strong>{filter === "active" ? "on duty" : "absent"}</strong> angels only</span>
          <button onClick={() => setFilter("all")} style={{ fontSize: 11, color: "var(--blue-mid)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}><X size={13} /></button>
        </div>
      )}

      {/* Angel list */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
        {displayed.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No angels to display</div>
        ) : displayed.map((angel, i) => {
          const resCount = residentCount(angel.id);
          const done = todayRounds(angel.id);
          return (
            <div key={angel.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: i < displayed.length - 1 ? "1px solid var(--hair-soft)" : undefined }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: angel.absent ? "var(--hair-strong)" : "var(--blue-tint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: angel.absent ? "var(--muted)" : "var(--blue-deep)", flexShrink: 0 }}>
                {ini(angel.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{angel.name}</span>
                  {angel.absent && <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 999, background: "var(--amber-tint)", color: "var(--amber-mid)" }}>Absent</span>}
                </div>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>{angel.department} · {resCount} resident{resCount !== 1 ? "s" : ""}</span>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--ink)", fontWeight: 600 }}>{done}/{resCount}</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>rounds today</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {angel.absent ? (
                  <button onClick={() => returnToDuty(angel.id)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 7, border: "1px solid var(--green-edge)", background: "var(--green-tint)", color: "var(--green)", cursor: "pointer", fontWeight: 500 }}>
                    Return to duty
                  </button>
                ) : (
                  <button onClick={() => setAbsentModal(angel)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 7, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", cursor: "pointer" }}>
                    Mark absent
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mark Absent Confirmation Modal */}
      {absentModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) setAbsentModal(null); }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: "24px 28px", width: 400, boxShadow: "var(--shadow-xl)" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)", marginBottom: 8 }}>Mark {absentModal.name} absent?</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: 20 }}>
              Their {residentCount(absentModal.id)} resident{residentCount(absentModal.id) !== 1 ? "s" : ""} will be marked unassigned. You can redistribute rounds to available angels.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setAbsentModal(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { markAbsent(absentModal.id); setAbsentModal(null); }} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--amber-mid)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Mark absent</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Angel Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) setAddOpen(false); }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: "24px 28px", width: 420, boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>Add Angel</h2>
              <button onClick={() => setAddOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={16} /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>User</label>
              <select value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", cursor: "pointer" }}>
                <option value="">Select a user…</option>
                {users.filter((u) => u.role === "angel").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Department</label>
              <select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", cursor: "pointer" }}>
                <option value="">Select a department…</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setAddOpen(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveAdd} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--blue)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Add Angel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
