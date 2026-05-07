"use client";
import { useState } from "react";
import { Plus, Search, Pencil, X } from "lucide-react";
import { useUsersStore } from "@/lib/store/useUsersStore";
import type { User, Role } from "@/lib/types";

const roleLabel: Record<Role, { label: string; bg: string; color: string }> = {
  admin:        { label: "Admin",        bg: "var(--plum-tint)",  color: "var(--plum)" },
  angel:        { label: "Angel",        bg: "var(--blue-tint)",  color: "var(--blue)" },
  charge_nurse: { label: "Charge Nurse", bg: "var(--green-tint)", color: "var(--green)" },
  viewer:       { label: "Viewer",       bg: "var(--surface-sun)", color: "var(--muted)" },
};

function ini(n: string) { return n.split(" ").map((p) => p[0]).join("").slice(0, 2); }

export default function UsersPage() {
  const users = useUsersStore((s) => s.users);
  const departments = useUsersStore((s) => s.departments);
  const { addUser, updateUser, addDepartment, removeDepartment } = useUsersStore();

  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [newDept, setNewDept] = useState("");
  const [form, setForm] = useState<{ name: string; email: string; role: Role; departmentId: string }>({
    name: "", email: "", role: "angel", departmentId: "dept-1",
  });

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  function deptName(id: string) { return departments.find((d) => d.id === id)?.name ?? id; }

  function saveAdd() {
    if (!form.name.trim() || !form.email.trim()) return;
    addUser({ ...form, active: true, notificationPrefs: {} });
    setAddOpen(false);
    setForm({ name: "", email: "", role: "angel", departmentId: "dept-1" });
  }

  function saveEdit() {
    if (!editUser) return;
    updateUser(editUser);
    setEditUser(null);
  }

  return (
    <div className="max-w-[1100px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>Users</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Manage team members, roles, and permissions</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setDeptOpen(true)} style={{ fontSize: 12, fontWeight: 500, padding: "7px 14px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface)", color: "var(--ink-soft)", cursor: "pointer" }}>
            Departments
          </button>
          <button onClick={() => setAddOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--blue)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 320 }}>
        <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" style={{ width: "100%", padding: "8px 10px 8px 30px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface)", fontSize: 12, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
      </div>

      {/* User list */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 120px 140px 44px", gap: 12, padding: "10px 18px", borderBottom: "1px solid var(--hair)", background: "var(--surface-alt)" }}>
          {["Name","Email","Role","Department",""].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No users found</div>
        ) : filtered.map((u, i) => {
          const rl = roleLabel[u.role] ?? roleLabel.viewer;
          return (
            <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 120px 140px 44px", gap: 12, padding: "12px 18px", borderBottom: i < filtered.length - 1 ? "1px solid var(--hair-soft)" : undefined, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--blue-tint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--blue-deep)", flexShrink: 0 }}>
                  {ini(u.name)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{u.name}</div>
                  {!u.active && <span style={{ fontSize: 10, color: "var(--muted)" }}>Inactive</span>}
                </div>
              </div>
              <span style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</span>
              <span style={{ display: "inline-flex", alignSelf: "center", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: rl.bg, color: rl.color }}>{rl.label}</span>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{deptName(u.departmentId)}</span>
              <button onClick={() => setEditUser({ ...u })} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--muted)", cursor: "pointer" }}>
                <Pencil size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add User Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) setAddOpen(false); }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: "24px 28px", width: 480, boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>Add User</h2>
              <button onClick={() => setAddOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={16} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Full name</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Role</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", cursor: "pointer" }}>
                  <option value="admin">Admin</option>
                  <option value="angel">Angel</option>
                  <option value="charge_nurse">Charge Nurse</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Department</label>
                <select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", cursor: "pointer" }}>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setAddOpen(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveAdd} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--blue)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Add User</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) setEditUser(null); }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: "24px 28px", width: 480, boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>Edit User</h2>
              <button onClick={() => setEditUser(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={16} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Full name</label>
                <input value={editUser.name} onChange={(e) => setEditUser((u) => u ? { ...u, name: e.target.value } : u)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Email</label>
                <input value={editUser.email} onChange={(e) => setEditUser((u) => u ? { ...u, email: e.target.value } : u)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Role</label>
                <select value={editUser.role} onChange={(e) => setEditUser((u) => u ? { ...u, role: e.target.value as Role } : u)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", cursor: "pointer" }}>
                  <option value="admin">Admin</option>
                  <option value="angel">Angel</option>
                  <option value="charge_nurse">Charge Nurse</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Department</label>
                <select value={editUser.departmentId} onChange={(e) => setEditUser((u) => u ? { ...u, departmentId: e.target.value } : u)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", cursor: "pointer" }}>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
              <button onClick={() => setEditUser(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveEdit} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--blue)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Save changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Departments Modal */}
      {deptOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) setDeptOpen(false); }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: "24px 28px", width: 400, boxShadow: "var(--shadow-xl)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>Departments</h2>
              <button onClick={() => setDeptOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={16} /></button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, marginBottom: 14 }}>
              {departments.map((d) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--hair-soft)" }}>
                  <span style={{ fontSize: 13, color: "var(--ink)" }}>{d.name}</span>
                  {d.custom && (
                    <button onClick={() => removeDepartment(d.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}><X size={13} /></button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="New department name…" style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 12, color: "var(--ink)", outline: "none" }} onKeyDown={(e) => { if (e.key === "Enter" && newDept.trim()) { addDepartment(newDept.trim()); setNewDept(""); } }} />
              <button onClick={() => { if (newDept.trim()) { addDepartment(newDept.trim()); setNewDept(""); } }} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "var(--blue)", color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
