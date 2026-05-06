"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useAngelsStore } from "@/lib/store/useAngelsStore";
import { useResidentsStore } from "@/lib/store/useResidentsStore";
import { useUsersStore } from "@/lib/store/useUsersStore";
import { useRoundsStore } from "@/lib/store/useRoundsStore";
import type { Angel } from "@/lib/types";

type Filter = "all" | "active" | "absent";

function ini(n: string) { return n.split(" ").map((p) => p[0]).join("").slice(0, 2); }

const TODAY = "2026-05-06";

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
  const [form, setForm] = useState({ name: "", departmentId: "dept-1" });
  const [redistributed, setRedistributed] = useState(false);

  const absentAngels = angels.filter((a) => a.absent);
  const activeAngels = angels.filter((a) => !a.absent);
  const depts = new Set(angels.map((a) => a.departmentId)).size;

  const displayed = filter === "active" ? activeAngels : filter === "absent" ? absentAngels : angels;

  function todayRounds(angelId: string) {
    return completedRounds.filter((r) => r.angelId === angelId && r.completedAt.startsWith(TODAY)).length;
  }
  function residentCount(angelId: string) {
    return residents.filter((r) => r.angelId === angelId && r.status === "active").length;
  }

  function saveAdd() {
    if (!form.name.trim()) return;
    const dept = departments.find((d) => d.id === form.departmentId);
    addAngel({ userId: `user-${Date.now()}`, name: form.name, departmentId: form.departmentId, department: dept?.name ?? "", absent: false });
    setAddOpen(false);
    setForm({ name: "", departmentId: "dept-1" });
  }

  const kpiCards: { id: Filter; label: string; value: number; color: string }[] = [
    { id: "all",    label: "Total Angels",  value: angels.length,       color: "var(--ink)" },
    { id: "active", label: "On Duty Today", value: activeAngels.length, color: "var(--green)" },
    { id: "absent", label: "Absent Today",  value: absentAngels.length, color: "var(--red)" },
    { id: "all",    label: "Departments",   value: depts,               color: "var(--blue)" },
  ];

  return (
    <div className="max-w-[1100px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* KPI filter cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {kpiCards.map((k, i) => {
          const isActive = (i === 0 && filter === "all") || (i === 1 && filter === "active") || (i === 2 && filter === "absent");
          const filterId: Filter = i === 1 ? "active" : i === 2 ? "absent" : "all";
          return (
            <div key={k.label + i} onClick={() => setFilter(filterId)} style={{ background: isActive ? "var(--blue-tint)" : "var(--surface)", border: `1px solid ${isActive ? "var(--blue)" : "var(--hair)"}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", transition: "all 0.15s", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: isActive ? "var(--blue-deep)" : k.color, lineHeight: 1, fontFamily: "var(--font-mono)" }}>{k.value}</div>
              <div style={{ fontSize: 10, color: isActive ? "var(--blue)" : "var(--muted)", marginTop: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
            </div>
          );
        })}
      </div>

      {/* Absent bar */}
      {absentAngels.length > 0 && (
        <div style={{ background: redistributed ? "var(--green-tint)" : "var(--amber-tint)", border: `1px solid ${redistributed ? "var(--green-edge)" : "var(--amber-edge)"}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, transition: "all 0.3s" }}>
          <div style={{ fontSize: 12, color: redistributed ? "var(--green)" : "var(--amber)" }}>
            {redistributed ? (
              <><strong>Rounds redistributed.</strong> Absent angels' residents have been reassigned to available angels. Go to <strong>Residents</strong> to review assignments.</>
            ) : (
              <><strong>{absentAngels.map((a) => a.name).join(", ")}</strong> {absentAngels.length === 1 ? "is" : "are"} marked absent today. Their residents are unassigned.</>
            )}
          </div>
          {!redistributed && (
            <button onClick={() => { redistribute(absentAngels[0].id); setRedistributed(true); }} style={{ fontSize: 12, fontWeight: 500, padding: "6px 13px", borderRadius: 7, border: "1px solid var(--amber-edge)", background: "var(--amber-pale)", color: "var(--amber)", cursor: "pointer", flexShrink: 0 }}>
              Auto-redistribute rounds
            </button>
          )}
        </div>
      )}

      {/* Header + Add button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>Angels</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Department heads responsible for resident rounding</p>
        </div>
        <button onClick={() => setAddOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--blue)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <Plus size={14} /> Add Angel
        </button>
      </div>

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
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Full name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} placeholder="e.g. Sarah Johnson" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Department</label>
              <select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", cursor: "pointer" }}>
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
