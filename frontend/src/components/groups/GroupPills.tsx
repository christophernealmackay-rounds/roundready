"use client";
import { Plus } from "lucide-react";
import { useResidentGroupsStore } from "@/lib/store/useResidentGroupsStore";
import type { ResidentGroupType } from "@/lib/types";

interface Props {
  selectedId: string | null;
  onChange: (id: string | null) => void;
  onCreateClick?: () => void;
  /** Restrict pills to a single group type; otherwise show all groups. */
  type?: ResidentGroupType;
}

export default function GroupPills({ selectedId, onChange, onCreateClick, type }: Props) {
  const groups = useResidentGroupsStore((s) => s.groups).filter(
    (g) => !type || g.type === type
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      <button
        onClick={() => onChange(null)}
        style={pillStyle(selectedId === null)}
      >
        All
      </button>
      {groups.map((g) => (
        <button
          key={g.id}
          onClick={() => onChange(selectedId === g.id ? null : g.id)}
          style={pillStyle(selectedId === g.id)}
          title={`${g.memberIds.length} residents`}
        >
          {g.name}
          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              opacity: 0.7,
              marginLeft: 5,
            }}
          >
            {g.memberIds.length}
          </span>
        </button>
      ))}
      {onCreateClick && (
        <button
          onClick={onCreateClick}
          style={{
            fontSize: 12,
            padding: "5px 12px",
            borderRadius: 20,
            border: "1px dashed var(--hair-strong)",
            background: "var(--surface)",
            color: "var(--muted)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Plus size={12} /> Group residents
        </button>
      )}
    </div>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 500,
    padding: "5px 12px",
    borderRadius: 20,
    cursor: "pointer",
    transition: "all 0.15s",
    border: `1px solid ${active ? "var(--blue)" : "var(--hair-strong)"}`,
    background: active ? "var(--blue-tint)" : "var(--surface)",
    color: active ? "var(--blue)" : "var(--muted)",
  };
}
