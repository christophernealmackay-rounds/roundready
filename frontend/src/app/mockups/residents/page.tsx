"use client";
import { useState } from "react";
import { Search, RefreshCw, AlertCircle } from "lucide-react";

const residents = [
  { id: 1, name: "Eleanor Voss",    room: "101", bed: "A", angel: "Maria Rodriguez",  status: "active" },
  { id: 2, name: "Harold Simmons",  room: "101", bed: "B", angel: "Maria Rodriguez",  status: "active" },
  { id: 3, name: "Dorothy Crane",   room: "102", bed: "A", angel: "James Thompson",   status: "active" },
  { id: 4, name: "Robert Finley",   room: "102", bed: "B", angel: "James Thompson",   status: "active" },
  { id: 5, name: "Agnes Whitfield", room: "103", bed: "A", angel: null,               status: "active" },
  { id: 6, name: "Frank Deluca",    room: "103", bed: "B", angel: null,               status: "active" },
  { id: 7, name: "Mildred Oakes",   room: "104", bed: "A", angel: "David Martinez",   status: "active" },
  { id: 8, name: "George Stanton",  room: "104", bed: "B", angel: "David Martinez",   status: "active" },
  { id: 9, name: "Beatrice Holt",   room: "105", bed: "A", angel: "Linda Patterson",  status: "active" },
  { id: 10, name: "Walter Pruett",  room: "105", bed: "B", angel: "Linda Patterson",  status: "active" },
];

export default function ResidentsPage() {
  const [search, setSearch] = useState("");
  const filtered = residents.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.room.includes(search)
  );

  return (
    <div className="max-w-[1100px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>Residents</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Synced from PointClickCare · Last sync: May 5, 2026 6:02 AM</p>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "var(--surface)", border: "1px solid var(--hair)",
          borderRadius: 8, padding: "8px 14px", fontSize: 12,
          color: "var(--ink-soft)", boxShadow: "var(--shadow-sm)", cursor: "pointer",
        }}>
          <RefreshCw size={13} color="var(--muted)" /> Sync PCC
        </button>
      </div>

      {/* Unassigned banner */}
      <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "var(--amber-tint)", border: "1px solid var(--amber-edge)" }}>
        <AlertCircle size={15} color="var(--amber)" />
        <p style={{ fontSize: 12, color: "var(--amber-mid)" }}>
          <strong>2 residents unassigned</strong> — Room 103A and 103B are not currently assigned to an angel. Sandra Kim is absent.
        </p>
        <button style={{ marginLeft: "auto", fontSize: 12, fontWeight: 500, color: "var(--amber)", background: "none", border: "none", cursor: "pointer" }}>
          Redistribute →
        </button>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 px-3 rounded-lg"
        style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-xs)" }}
      >
        <Search size={14} color="var(--faint)" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or room…"
          style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            fontSize: 13, color: "var(--ink)", padding: "9px 0",
          }}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--hair)" }}>
              {["Room", "Bed", "Resident Name", "Assigned Angel", "Status"].map(h => (
                <th key={h} className="text-left px-5 py-3 section-label">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr
                key={r.id}
                className="transition-all hover:bg-[--surface-alt]"
                style={{ borderTop: i > 0 ? "1px solid var(--hair-soft)" : undefined }}
              >
                <td className="px-5 py-3">
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500, color: "var(--blue)", fontSize: 12 }}>
                    {r.room}
                  </span>
                </td>
                <td className="px-5 py-3" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.bed}</td>
                <td className="px-5 py-3" style={{ fontWeight: 500, color: "var(--ink)" }}>{r.name}</td>
                <td className="px-5 py-3">
                  {r.angel ? (
                    <span style={{
                      fontSize: 11.5, fontWeight: 500, padding: "3px 9px", borderRadius: 999,
                      background: "var(--blue-tint)", color: "var(--blue)",
                    }}>
                      {r.angel}
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 11.5, fontWeight: 500, padding: "3px 9px", borderRadius: 999,
                      background: "var(--amber-tint)", color: "var(--amber)",
                    }}>
                      Unassigned
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                    background: "var(--green-tint)", color: "var(--green)",
                  }}>Active</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-3 border-t" style={{ borderColor: "var(--hair)", background: "var(--surface-alt)" }}>
          <p style={{ fontSize: 11.5, color: "var(--muted)" }}>{filtered.length} of {residents.length} residents</p>
        </div>
      </div>
    </div>
  );
}
