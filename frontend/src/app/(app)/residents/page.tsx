"use client";
import { useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { useResidentsStore } from "@/lib/store/useResidentsStore";
import { useAngelsStore } from "@/lib/store/useAngelsStore";
import type { Resident } from "@/lib/types";

type ResFilter = "all" | "assigned" | "unassigned";

function ini(n: string) { return n.split(" ").map((p) => p[0]).join("").slice(0, 2); }

export default function ResidentsPage() {
  const residents = useResidentsStore((s) => s.residents);
  const { assignToAngel, unassignResident, autoAssign } = useResidentsStore();
  const angels = useAngelsStore((s) => s.angels);

  const [search, setSearch] = useState("");
  const [resFilter, setResFilter] = useState<ResFilter>("all");
  const [angelFilter, setAngelFilter] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState<Resident | null>(null);
  const [selectedAngel, setSelectedAngel] = useState("");
  const [pccConnected] = useState(false);

  const activeResidents = residents.filter((r) => r.status === "active");
  const assigned   = activeResidents.filter((r) => r.angelId !== null);
  const unassigned = activeResidents.filter((r) => r.angelId === null);
  const activeAngels = angels.filter((a) => !a.absent);

  let displayed = activeResidents;
  if (resFilter === "assigned")   displayed = assigned;
  if (resFilter === "unassigned") displayed = unassigned;
  if (angelFilter) displayed = displayed.filter((r) => r.angelId === angelFilter);
  if (search) displayed = displayed.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) || r.room.includes(search)
  );

  const kpiCards = [
    { id: "all" as ResFilter,        label: "Active Residents", value: activeResidents.length, color: "var(--ink)" },
    { id: "assigned" as ResFilter,   label: "Assigned",         value: assigned.length,        color: "var(--green)" },
    { id: "unassigned" as ResFilter, label: "Unassigned",       value: unassigned.length,      color: "var(--amber)" },
  ];

  function openAssign(r: Resident) {
    setAssignModal(r);
    setSelectedAngel(r.angelId ?? "");
  }

  function saveAssign() {
    if (!assignModal) return;
    if (selectedAngel) assignToAngel(assignModal.id, selectedAngel);
    else unassignResident(assignModal.id);
    setAssignModal(null);
  }

  function getAngel(angelId: string | null) {
    return angels.find((a) => a.id === angelId);
  }

  return (
    <div className="max-w-[1100px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* KPI filter cards + PCC status */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {kpiCards.map((k) => {
          const active = resFilter === k.id;
          return (
            <div key={k.label} onClick={() => setResFilter(k.id)} style={{ background: active ? "var(--blue-tint)" : "var(--surface)", border: `1px solid ${active ? "var(--blue)" : "var(--hair)"}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", transition: "all 0.15s", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: active ? "var(--blue-deep)" : k.color, lineHeight: 1, fontFamily: "var(--font-mono)" }}>{k.value}</div>
              <div style={{ fontSize: 10, color: active ? "var(--blue)" : "var(--muted)", marginTop: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
            </div>
          );
        })}
        {/* PCC status */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 10, padding: "12px 14px", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: pccConnected ? "var(--green)" : "var(--muted)" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: pccConnected ? "var(--green)" : "var(--muted)" }}>{pccConnected ? "PCC Connected" : "PCC Disconnected"}</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>PointClickCare</div>
        </div>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>Residents</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Census and angel assignments</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => autoAssign(activeAngels.map((a) => a.id))} style={{ fontSize: 12, fontWeight: 500, padding: "7px 14px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface)", color: "var(--ink-soft)", cursor: "pointer" }}>
            Auto-assign all
          </button>
          <button style={{ fontSize: 12, fontWeight: 500, padding: "7px 14px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface)", color: "var(--ink-soft)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <RefreshCw size={12} /> Sync from PCC
          </button>
        </div>
      </div>

      {/* Search + angel filter pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "0 0 220px" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search residents or room…" style={{ width: "100%", padding: "8px 10px 8px 30px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface)", fontSize: 12, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
        </div>
        <button onClick={() => setAngelFilter(null)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 20, border: `1px solid ${angelFilter === null ? "var(--blue)" : "var(--hair-strong)"}`, background: angelFilter === null ? "var(--blue-tint)" : "var(--surface)", color: angelFilter === null ? "var(--blue)" : "var(--muted)", cursor: "pointer" }}>
          All angels
        </button>
        {angels.filter((a) => !a.absent).map((a) => (
          <button key={a.id} onClick={() => setAngelFilter(angelFilter === a.id ? null : a.id)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 20, border: `1px solid ${angelFilter === a.id ? "var(--blue)" : "var(--hair-strong)"}`, background: angelFilter === a.id ? "var(--blue-tint)" : "var(--surface)", color: angelFilter === a.id ? "var(--blue)" : "var(--muted)", cursor: "pointer" }}>
            {a.name.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Resident list */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px 1fr auto", gap: 12, padding: "10px 18px", borderBottom: "1px solid var(--hair)", background: "var(--surface-alt)" }}>
          {["Resident","Room","Bed","Angel",""].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
          ))}
        </div>

        {displayed.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No residents match your filters</div>
        ) : displayed.map((r, i) => {
          const angel = getAngel(r.angelId);
          return (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px 1fr auto", gap: 12, padding: "12px 18px", borderBottom: i < displayed.length - 1 ? "1px solid var(--hair-soft)" : undefined, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--surface-alt)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--muted)", flexShrink: 0 }}>
                  {ini(r.name)}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{r.name}</span>
              </div>
              <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--ink)" }}>{r.room}</span>
              <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>{r.bed}</span>
              <div>
                {angel ? (
                  <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{angel.name}</span>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--amber-tint)", color: "var(--amber)" }}>Unassigned</span>
                )}
              </div>
              <button onClick={() => openAssign(r)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", cursor: "pointer" }}>
                Assign
              </button>
            </div>
          );
        })}
      </div>

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) setAssignModal(null); }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: "24px 28px", width: 400, boxShadow: "var(--shadow-xl)" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)", marginBottom: 6 }}>Assign {assignModal.name}</h2>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 18 }}>Room {assignModal.room}{assignModal.bed}</p>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Angel</label>
            <select value={selectedAngel} onChange={(e) => setSelectedAngel(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", marginBottom: 20 }}>
              <option value="">— Unassigned —</option>
              {activeAngels.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.department})</option>)}
            </select>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setAssignModal(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveAssign} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--blue)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
