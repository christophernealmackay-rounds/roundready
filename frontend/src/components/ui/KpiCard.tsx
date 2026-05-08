/**
 * Editorial KPI card. Replaces the repeated dashboard / tab KPI tile pattern.
 *
 * Improvements over the previous inline pattern:
 *   - Number is bigger (28 → 32–40px depending on size prop)
 *   - Label sits below in 10px tracked-uppercase
 *   - Optional `delta` shows ↑/↓ change with color
 *   - Optional `accent` color recolors the number (status semantics)
 *   - Optional `active` flips the card to selected state for filter usage
 *   - Reveal animation via stagger index
 *
 * Sparklines are intentionally omitted from the first cut to keep the
 * widget light; the underlying RefinedCard supports any custom child if
 * a single tab needs a richer treatment later.
 */
"use client";
import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import RefinedCard from "./RefinedCard";

type AccentColor = "ink" | "blue" | "blue-deep" | "green" | "amber" | "red" | "plum" | "muted";
type Size = "sm" | "md" | "lg";

interface Props {
  label: string;
  value: ReactNode;
  accent?: AccentColor;
  size?: Size;
  /** Right-aligned subtle text under the value (e.g. "of 55 beds"). */
  unit?: string;
  /** Small badge at top-right (e.g. "5 open"). */
  badge?: ReactNode;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  active?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  revealIndex?: number;
  /** Slot rendered below the value — sparkline, mini chart, anything. */
  footer?: ReactNode;
  style?: CSSProperties;
}

const ACCENT_VAR: Record<AccentColor, string> = {
  ink:        "var(--ink)",
  blue:       "var(--blue)",
  "blue-deep":"var(--blue-deep)",
  green:      "var(--green)",
  amber:      "var(--amber-mid)",
  red:        "var(--red)",
  plum:       "var(--plum)",
  muted:      "var(--muted)",
};

const SIZE: Record<Size, { num: number; pad: string; gap: number }> = {
  sm: { num: 28, pad: "12px 14px", gap: 4 },
  md: { num: 34, pad: "14px 16px", gap: 5 },
  lg: { num: 44, pad: "18px 20px", gap: 7 },
};

export default function KpiCard({
  label,
  value,
  accent = "ink",
  size = "md",
  unit,
  badge,
  delta,
  active = false,
  onClick,
  revealIndex,
  footer,
  style,
}: Props) {
  const s = SIZE[size];
  const valueColor = active ? "var(--blue-deep)" : ACCENT_VAR[accent];
  const labelColor = active ? "var(--blue)" : "var(--muted)";

  return (
    <RefinedCard
      hoverable={Boolean(onClick)}
      onClick={onClick}
      revealIndex={revealIndex}
      padding={s.pad}
      style={{
        ...(active
          ? {
              background: "var(--blue-tint)",
              borderColor: "var(--blue)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,.85), 0 1px 0 rgba(26,95,168,.08), 0 4px 14px rgba(26,95,168,.10)",
            }
          : null),
        ...style,
      }}
    >
      {badge && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -8 }}>
          {badge}
        </div>
      )}

      <div
        style={{
          fontSize: s.num,
          fontWeight: 600,
          color: valueColor,
          lineHeight: 1,
          fontFamily: "var(--font-mono)",
          letterSpacing: "-0.01em",
          fontVariantNumeric: "tabular-nums",
          display: "flex",
          alignItems: "baseline",
          gap: 6,
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: Math.round(s.num * 0.36), color: "var(--muted)", fontWeight: 400 }}>
            {unit}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginTop: s.gap + 3,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: labelColor,
            textTransform: "uppercase",
            letterSpacing: "0.09em",
          }}
        >
          {label}
        </div>
        {delta && (
          <span
            style={{
              fontSize: 10.5,
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              color:
                delta.direction === "up"
                  ? "var(--green)"
                  : delta.direction === "down"
                    ? "var(--red)"
                    : "var(--muted)",
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            {delta.direction === "up" ? "↑" : delta.direction === "down" ? "↓" : "→"}
            {delta.value}
          </span>
        )}
      </div>

      {footer && <div style={{ marginTop: s.gap + 6 }}>{footer}</div>}
    </RefinedCard>
  );
}
