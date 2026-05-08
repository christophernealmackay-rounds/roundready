/**
 * Replaces the inline 11px-uppercase-tracked-muted label that's repeated
 * across every tab. Optional accent prop adds a 2px colored bar before the
 * text — useful for status sections (red bar for issues, green for resolved,
 * plum for editorial accents like "Watch List").
 */
import type { ReactNode } from "react";

type Accent = "blue" | "plum" | "green" | "amber" | "red" | "muted" | "none";

interface Props {
  children: ReactNode;
  accent?: Accent;
  trailing?: ReactNode;
  style?: React.CSSProperties;
}

const accentColor: Record<Accent, string | null> = {
  blue:  "var(--blue)",
  plum:  "var(--plum)",
  green: "var(--green)",
  amber: "var(--amber-mid)",
  red:   "var(--red)",
  muted: "var(--hair-strong)",
  none:  null,
};

export default function SectionLabel({ children, accent = "none", trailing, style }: Props) {
  const bar = accentColor[accent];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {bar && (
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 2,
              height: 11,
              borderRadius: 1,
              background: bar,
            }}
          />
        )}
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.13em",
          }}
        >
          {children}
        </span>
      </div>
      {trailing}
    </div>
  );
}
