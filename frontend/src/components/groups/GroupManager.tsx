"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, Trash2, X } from "lucide-react";
import { useResidentGroupsStore } from "@/lib/store/useResidentGroupsStore";
import { useResidentsStore } from "@/lib/store/useResidentsStore";

interface Props {
  open: boolean;
  onClose: () => void;
  /** When set, the modal opens directly into editing this group. */
  editingGroupId?: string | null;
}

export default function GroupManager({ open, onClose, editingGroupId }: Props) {
  const groups = useResidentGroupsStore((s) => s.groups);
  const { createGroup, deleteGroup, setMembers } = useResidentGroupsStore();
  const residents = useResidentsStore((s) => s.residents);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [memberSet, setMemberSet] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  // Reset state every time the modal opens.
  useEffect(() => {
    if (!open) return;
    if (editingGroupId) {
      const g = groups.find((x) => x.id === editingGroupId);
      if (g) {
        setEditingId(g.id);
        setName(g.name);
        setMemberSet(new Set(g.memberIds));
        return;
      }
    }
    setEditingId(null);
    setName("");
    setMemberSet(new Set());
    setSearch("");
  }, [open, editingGroupId, groups]);

  const carts = useMemo(() => groups.filter((g) => g.type === "cart"), [groups]);
  const filteredResidents = residents.filter(
    (r) =>
      r.status === "active" &&
      (search === "" ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.room.includes(search))
  );

  function toggle(id: string) {
    setMemberSet((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (!name.trim() || memberSet.size === 0) return;
    setBusy(true);
    try {
      let groupId = editingId;
      if (!groupId) {
        const g = await createGroup(name.trim(), "cart");
        groupId = g.id;
      }
      await setMembers(groupId, [...memberSet]);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this cart?")) return;
    setBusy(true);
    try {
      await deleteGroup(id);
      if (editingId === id) onClose();
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 16,
          padding: "24px 28px",
          width: 560,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 500,
              color: "var(--ink)",
            }}
          >
            {editingId ? "Edit cart" : "Group residents into a cart"}
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
          >
            <X size={16} />
          </button>
        </div>

        {!editingId && carts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 6,
              }}
            >
              Existing carts
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {carts.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    borderRadius: 20,
                    border: "1px solid var(--hair-strong)",
                    background: "var(--surface-alt)",
                    fontSize: 12,
                    color: "var(--ink-soft)",
                  }}
                >
                  <button
                    onClick={() => {
                      setEditingId(c.id);
                      setName(c.name);
                      setMemberSet(new Set(c.memberIds));
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 12 }}
                  >
                    {c.name}
                    <span style={{ marginLeft: 5, color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
                      {c.memberIds.length}
                    </span>
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    title="Delete"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0, display: "flex" }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>
            Cart name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Med-pass cart A"
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 8,
              border: "1px solid var(--hair)",
              background: "var(--surface-alt)",
              fontSize: 13,
              color: "var(--ink)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)" }}>
            Residents in this cart{" "}
            <span style={{ color: "var(--ink)", fontFamily: "var(--font-mono)" }}>{memberSet.size}</span>
          </label>
          <button
            onClick={() =>
              setMemberSet(memberSet.size === filteredResidents.length ? new Set() : new Set(filteredResidents.map((r) => r.id)))
            }
            style={{ fontSize: 11, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
          >
            {memberSet.size === filteredResidents.length ? "Clear all" : "Select all"}
          </button>
        </div>

        <div style={{ position: "relative", marginBottom: 8 }}>
          <Search
            size={12}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
            }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search residents or room…"
            style={{
              width: "100%",
              padding: "8px 10px 8px 30px",
              borderRadius: 8,
              border: "1px solid var(--hair)",
              background: "var(--surface-alt)",
              fontSize: 12,
              color: "var(--ink)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            border: "1px solid var(--hair)",
            borderRadius: 8,
            background: "var(--surface-alt)",
            marginBottom: 18,
            maxHeight: 280,
          }}
        >
          {filteredResidents.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>No residents</div>
          ) : (
            filteredResidents.map((r) => (
              <label
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--hair-soft)",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--ink)",
                }}
              >
                <input type="checkbox" checked={memberSet.has(r.id)} onChange={() => toggle(r.id)} />
                <span style={{ flex: 1 }}>{r.name}</span>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                  Rm {r.room}
                  {r.bed}
                </span>
              </label>
            ))
          )}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          {editingId ? (
            <button
              onClick={() => remove(editingId)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--red-edge)",
                background: "var(--red-tint)",
                color: "var(--red)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Delete cart
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--hair-strong)",
                background: "var(--surface-alt)",
                color: "var(--ink-soft)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!name.trim() || memberSet.size === 0 || busy}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background:
                  !name.trim() || memberSet.size === 0 || busy ? "var(--hair-strong)" : "var(--blue)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 500,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {editingId ? "Save changes" : "Create cart"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
