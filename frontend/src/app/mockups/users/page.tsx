"use client";
import { useState } from "react";
import { Plus, Search, Pencil, X } from "lucide-react";

type User = { id: number; name: string; email: string; role: string; dept: string; active: boolean };

const initialUsers: User[] = [
  { id: 1, name: "Christopher Mackay", email: "chris@sunrisegardens.com",  role: "admin",        dept: "Administration", active: true },
  { id: 2, name: "Maria Rodriguez",    email: "mrodriguez@sunrise.com",    role: "angel",        dept: "Nursing",        active: true },
  { id: 3, name: "James Thompson",     email: "jthompson@sunrise.com",     role: "angel",        dept: "Dietary",        active: true },
  { id: 4, name: "Sandra Kim",         email: "skim@sunrise.com",          role: "angel",        dept: "Activities",     active: true },
  { id: 5, name: "Patricia Nguyen",    email: "pnguyen@sunrise.com",       role: "charge_nurse", dept: "Nursing",        active: true },
  { id: 6, name: "David Martinez",     email: "dmartinez@sunrise.com",     role: "angel",        dept: "Therapy",        active: true },
];

const roleLabel: Record<string, { label: string; bg: string; color: string }> = {
  admin:        { label: "Admin",        bg: "var(--plum-tint)",  color: "var(--plum)"  },
  angel:        { label: "Angel",        bg: "var(--blue-tint)",  color: "var(--blue)"  },
  charge_nurse: { label: "Charge Nurse", bg: "var(--green-tint)", color: "var(--green)" },
  viewer:       { label: "Viewer",       bg: "var(--surface-sun)",color: "var(--muted)" },
};

const departments = ["Nursing","Dietary","Activities","MDS","Therapy","Social Services","Housekeeping","Maintenance","Admissions","Medical Records","Administration"];

const fieldStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--hair)", background: "var(--surface-alt)",
  fontSize: 13, color: "var(--ink)", outline: "none",
} as React.CSSProperties;

const labelStyle = {
  display: "block", fontSize: 11.5, fontWeight: 600,
  color: "var(--muted)", marginBottom: 5, letterSpacing: "0.02em",
} as React.CSSProperties;

export default function UsersPage() {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "angel", dept: "Nursing" });

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  function openEdit(u: User) {
    setEditUser({ ...u });
  }

  function saveEdit() {
    if (!editUser) return;
    setUsers(us => us.map(u => u.id === editUser.id ? editUser : u));
    setEditUser(null);
  }

  function saveAdd() {
    setUsers(us => [...us, { id: Date.now(), ...form, active: true }]);
    setAddOpen(false);
    setForm({ name: "", email: "", role: "angel", dept: "Nursing" });
  }

  return (
    <div className="max-w-[1100px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>Users</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Manage team members, roles, and permissions</p>
        </div>
        <button onClick={() => setAddOpen(true)} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "var(--blue)", color: "#fff", border: "none",
          borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer",
          boxShadow: "var(--shadow-sm)",
        }}>
          <Plus size={14} /> Add User
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-xs)" }}>
        <Search size={14} color="var(--faint)" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--ink)", padding: "9px 0" }} />
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--hair)" }}>
              {["Name", "Email", "Role", "Department", "Status", ""].map(h => (
                <th key={h} className="text-left px-5 py-3 section-label">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => {
              const r = roleLabel[u.role];
              return (
                <tr key={u.id} style={{ borderTop: i > 0 ? "1px solid var(--hair-soft)" : undefined }}>
                  <td className="px-5 py-3" style={{ fontWeight: 500, color: "var(--ink)" }}>{u.name}</td>
                  <td className="px-5 py-3" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{u.email}</td>
                  <td className="px-5 py-3">
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: r.bg, color: r.color }}>{r.label}</span>
                  </td>
                  <td className="px-5 py-3" style={{ color: "var(--ink-soft)" }}>{u.dept}</td>
                  <td className="px-5 py-3">
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--green-tint)", color: "var(--green)" }}>Active</span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => openEdit(u)}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        fontSize: 12, fontWeight: 500, padding: "5px 10px", borderRadius: 6,
                        border: "1px solid var(--hair)", background: "var(--surface-alt)",
                        color: "var(--ink-soft)", cursor: "pointer", transition: "all 0.2s",
                      }}
                    >
                      <Pencil size={11} /> Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Departments */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--hair)", boxShadow: "var(--shadow-sm)" }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--hair)" }}>
          <p className="section-label">Departments</p>
          <button style={{ fontSize: 12, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>+ Add Department</button>
        </div>
        <div className="p-4 flex flex-wrap gap-2">
          {departments.map(d => (
            <span key={d} className="flex items-center gap-1.5" style={{
              fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 999,
              background: "var(--surface-alt)", color: "var(--ink-soft)", border: "1px solid var(--hair)",
            }}>
              {d}
              <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                <X size={11} color="var(--faint)" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(7,43,82,0.35)" }}>
          <div className="rounded-2xl w-full max-w-md mx-4" style={{ background: "var(--surface)", boxShadow: "var(--shadow-xl)" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "var(--hair)" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500 }}>Edit User</h2>
              <button onClick={() => setEditUser(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} color="var(--muted)" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label style={labelStyle}>Full Name</label>
                <input value={editUser.name} onChange={e => setEditUser({ ...editUser, name: e.target.value })} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input value={editUser.email} onChange={e => setEditUser({ ...editUser, email: e.target.value })} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value })} style={fieldStyle}>
                  <option value="admin">Admin</option>
                  <option value="angel">Angel</option>
                  <option value="charge_nurse">Charge Nurse</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Department</label>
                <select value={editUser.dept} onChange={e => setEditUser({ ...editUser, dept: e.target.value })} style={fieldStyle}>
                  {departments.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={editUser.active ? "active" : "inactive"} onChange={e => setEditUser({ ...editUser, active: e.target.value === "active" })} style={fieldStyle}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t" style={{ borderColor: "var(--hair)" }}>
              <button onClick={() => setEditUser(null)} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", cursor: "pointer" }}>Cancel</button>
              <button onClick={saveEdit} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none", background: "var(--blue)", color: "#fff", cursor: "pointer" }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(7,43,82,0.35)" }}>
          <div className="rounded-2xl w-full max-w-md mx-4" style={{ background: "var(--surface)", boxShadow: "var(--shadow-xl)" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "var(--hair)" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500 }}>Add User</h2>
              <button onClick={() => setAddOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} color="var(--muted)" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {(["name","email"] as const).map(f => (
                <div key={f}>
                  <label style={labelStyle}>{f === "name" ? "Full Name" : "Email Address"}</label>
                  <input value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} placeholder={f === "name" ? "Jane Smith" : "jane@sunrisegardens.com"} style={fieldStyle} />
                </div>
              ))}
              <div>
                <label style={labelStyle}>Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={fieldStyle}>
                  <option value="admin">Admin</option>
                  <option value="angel">Angel</option>
                  <option value="charge_nurse">Charge Nurse</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Department</label>
                <select value={form.dept} onChange={e => setForm({ ...form, dept: e.target.value })} style={fieldStyle}>
                  {departments.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t" style={{ borderColor: "var(--hair)" }}>
              <button onClick={() => setAddOpen(false)} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", cursor: "pointer" }}>Cancel</button>
              <button onClick={saveAdd} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none", background: "var(--blue)", color: "#fff", cursor: "pointer" }}>Create User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
