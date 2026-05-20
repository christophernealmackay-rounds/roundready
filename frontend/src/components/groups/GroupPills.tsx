"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useResidentGroupsStore } from "@/lib/store/useResidentGroupsStore";
import type { ResidentGroup, ResidentGroupType } from "@/lib/types";

interface Props {
  selectedId: string | null;
  onChange: (id: string | null) => void;
  onCreateClick?: () => void;
  /** When set, a hover-revealed "×" appears on each group pill. */
  onDelete?: (group: ResidentGroup) => void;
  /** Restrict pills to a single group type; otherwise show all groups. */
  type?: ResidentGroupType;
}

export default function GroupPills({ selectedId, onChange, onCreateClick, onDelete, type }: Props) {
  const groups = useResidentGroupsStore((s) => s.groups).filter(
    (g) => !type || g.type === type
  );
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [xHoverId, setXHoverId] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      <button
        onClick={() => onChange(null)}
        style={pillStyle(selectedId === null)}
      >
        All
      </button>
      {groups.map((g) => {
        const showX = onDelete && hoverId === g.id;
        const xActive = xHoverId === g.id;
        return (
          <div
            key={g.id}
            style={{ position: "relative", display: "inline-flex" }}
            onMouseEnter={() => setHoverId(g.id)}
            onMouseLeave={() => { setHoverId(null); setXHoverId(null); }}
          >
            <button
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
            {showX && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete!(g); }}
                onMouseEnter={() => setXHoverId(g.id)}
                onMouseLeave={() => setXHoverId(null)}
                title="Remove grouping"
                aria-label={`Remove ${g.name} grouping`}
                style={{
                  position: "absolute",
                  top: -5,
                  right: -5,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: `1px solid ${xActive ? "var(--red-edge)" : "var(--hair-strong)"}`,
                  background: xActive ? "var(--red-tint)" : "var(--surface)",
                  color: xActive ? "var(--red)" : "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                  boxShadow: "var(--shadow-xs)",
                  lineHeight: 1,
                  transition: "all 0.15s",
                }}
              >
                <X size={9} strokeWidth={2.5} />
              </button>
            )}
          </div>
        );
      })}
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
