/**
 * Recharts custom tooltip in the editorial-luxe style. Pass as
 * `<Tooltip content={<RefinedTooltip />} />` on any chart.
 *
 * - Warm cream surface, refined hairline border, soft shadow.
 * - Mono numerals via tabular-nums.
 * - Fraunces italic for the dimension label (the X-axis category, e.g.
 *   "Tue", "May 7", "9a") so the tooltip reads like a caption.
 *
 * Recharts 3's TooltipProps surface is unstable across versions, so we
 * type the props loosely and rely on documented runtime fields rather
 * than inheriting from the library type.
 */
"use client";

interface PayloadEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
}

interface Props {
  active?: boolean;
  payload?: PayloadEntry[];
  label?: string | number;
  unit?: string;
  /** Optional override of the dimension label formatting. */
  formatLabel?: (label: string) => string;
}

export default function RefinedTooltip({
  active,
  payload,
  label,
  unit,
  formatLabel,
}: Props) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--hair-strong)",
        borderRadius: 8,
        padding: "8px 12px 9px",
        boxShadow: "0 6px 20px rgba(20,23,28,.10), 0 1px 0 rgba(255,255,255,.7) inset",
        minWidth: 110,
        animation: "luxe-fade 120ms var(--ease-luxe) both",
      }}
    >
      {label !== undefined && label !== "" && (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 13,
            fontStyle: "italic",
            color: "var(--blue-ink)",
            marginBottom: 5,
            letterSpacing: "-0.01em",
          }}
        >
          {formatLabel ? formatLabel(String(label)) : String(label)}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {payload.map((p, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 11,
              color: "var(--ink)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: p.color ?? "var(--blue)",
                }}
              />
              <span style={{ color: "var(--muted)", fontSize: 11 }}>{p.name ?? ""}</span>
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
              }}
            >
              {p.value}
              {unit ?? ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
