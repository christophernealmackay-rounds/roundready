"use client";
import { useState } from "react";
import { Plus, UserX, Users, ChevronRight, X } from "lucide-react";

const angels = [
  { id: 1, name: "Maria Rodriguez",  dept: "Nursing",      residents: 8, absent: false, since: null },
  { id: 2, name: "James Thompson",   dept: "Dietary",      residents: 7, absent: false, since: null },
  { id: 3, name: "Sandra Kim",       dept: "Activities",   residents: 9, absent: true,  since: "Today, 7:42 AM" },
  { id: 4, name: "David Martinez",   dept: "Therapy",      residents: 8, absent: false, since: null },
  { id: 5, name: "Linda Patterson",  dept: "Housekeeping", residents: 6, absent: false, since: null },
];

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2);
}

export default function AngelsPage() {
  const [absentModal, setAbsentModal] = useState<number | null>(null);
  const selected = angels.find(a => a.id === absentModal);

  return (
    <div className="max-w-[1100px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>Angels</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Department heads responsible for rounding</p>
        </div>
        <button
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "var(--blue)", color: "#fff",
            border: "none", borderRadius: 8, padding: "9px 16px",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
            boxShadow: "var(--shadow-sm)", transition: "all 0.2s",
          }}
        >
          <Plus size={14} /> Add Angel
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Angels", value: "5", sub: "2 departments unassigned" },
          { label: "Currently Absent", value: "1", sub: "9 residents unassigned" },
          { label: "Avg Residents / Angel", value: "7.6", sub: "Across active angels" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
            <p style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-mono)", margin: "4px 0 2px" }}>{s.value}</p>
            <p style={{ fontSize: 11, color: "var(--faint)" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Angels list */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--hair)" }}>
          <p className="section-label">All Angels</p>
        </div>
        <div className="divide-y" style={{ "--tw-divide-color": "var(--hair-soft)" } as React.CSSProperties}>
          {angels.map(angel => (
            <div key={angel.id} className="flex items-center gap-4 px-5 py-4">
              {/* Avatar */}
              <div
                className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
                style={{
                  background: angel.absent ? "var(--surface-sun)" : "var(--blue-tint)",
                  color: angel.absent ? "var(--muted)" : "var(--blue)",
                  fontSize: 11, fontWeight: 700,
                }}
              >
                {initials(angel.name)}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span style={{ fontWeight: 500, color: "var(--ink)" }}>{angel.name}</span>
                  {angel.absent && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 999, background: "var(--amber-tint)", color: "var(--amber)" }}>
                      ABSENT
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>
                  {angel.dept} · {angel.absent ? `Absent since ${angel.since}` : `${angel.residents} residents assigned`}
                </p>
              </div>

              {/* Residents count */}
              <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--muted)" }}>
                <Users size={13} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{angel.residents}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!angel.absent ? (
                  <button
                    onClick={() => setAbsentModal(angel.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 12, fontWeight: 500, padding: "6px 12px",
                      border: "1px solid var(--hair-strong)", borderRadius: 7,
                      background: "var(--surface-alt)", color: "var(--ink-soft)",
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                  >
                    <UserX size={12} /> Mark Absent
                  </button>
                ) : (
                  <button
                    style={{
                      fontSize: 12, fontWeight: 500, padding: "6px 12px",
                      border: "1px solid var(--green-edge)", borderRadius: 7,
                      background: "var(--green-tint)", color: "var(--green)",
                      cursor: "pointer",
                    }}
                  >
                    Return to Duty
                  </button>
                )}
                <button style={{ display: "flex", alignItems: "center", color: "var(--muted)", cursor: "pointer", background: "none", border: "none" }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Absent Modal */}
      {absentModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(7,43,82,0.35)" }}>
          <div className="rounded-2xl w-full max-w-md mx-4 overflow-hidden" style={{ background: "var(--surface)", boxShadow: "var(--shadow-xl)" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "var(--hair)" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500 }}>Mark Angel Absent</h2>
              <button onClick={() => setAbsentModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} color="var(--muted)" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                Marking <strong>{selected.name}</strong> absent will unassign their <strong>{selected.residents} residents</strong>. You can redistribute them to available angels.
              </p>
              <div className="rounded-lg p-3" style={{ background: "var(--amber-tint)", border: "1px solid var(--amber-edge)" }}>
                <p style={{ fontSize: 12, color: "var(--amber)" }}>
                  {selected.residents} residents will show as <strong>Unassigned</strong> until redistributed or the angel returns.
                </p>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "var(--blue)" }} />
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Auto-redistribute residents to available angels</span>
              </label>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t" style={{ borderColor: "var(--hair)" }}>
              <button
                onClick={() => setAbsentModal(null)}
                style={{
                  flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  border: "1px solid var(--hair-strong)", background: "var(--surface-alt)",
                  color: "var(--ink-soft)", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => setAbsentModal(null)}
                style={{
                  flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  border: "none", background: "var(--amber)", color: "#fff", cursor: "pointer",
                }}
              >
                Confirm Absent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
