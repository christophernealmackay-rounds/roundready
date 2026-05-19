/**
 * Minimal trend sparkline — no axes, grid, or tooltip. Sized to fill its
 * container; meant for the KpiCard `footer` slot. Domain auto-fits so small
 * variations in a high (90–100%) clean rate are still visible.
 */
"use client";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate } from "@/lib/dates";
import RefinedTooltip from "./RefinedTooltip";

type AccentColor = "blue" | "green" | "amber" | "red" | "plum";

const STROKE: Record<AccentColor, string> = {
  blue: "var(--blue)",
  green: "var(--green)",
  amber: "var(--amber-mid)",
  red: "var(--red)",
  plum: "var(--plum)",
};

interface Props {
  data: { date: string; cleanRate: number | null }[];
  accent?: AccentColor;
  height?: number;
  /** When set, hovering shows a date + percent tooltip on the point. */
  tooltip?: boolean;
}

export default function Sparkline({ data, accent = "green", height = 36, tooltip = false }: Props) {
  if (data.length < 2) {
    return <div style={{ height, opacity: 0 }} aria-hidden />;
  }
  const stroke = STROKE[accent];
  const gid = `spark-${accent}`;
  return (
    <div style={{ height, marginTop: 6 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          {tooltip && <XAxis dataKey="date" hide />}
          <YAxis
            hide
            domain={[
              (min: number) => Math.max(0, Math.floor(min - 2)),
              (max: number) => Math.min(100, Math.ceil(max + 2)),
            ]}
          />
          {tooltip && (
            <Tooltip
              content={
                <RefinedTooltip
                  unit="%"
                  formatLabel={(l) => formatDate(l)}
                />
              }
              cursor={{ stroke: "var(--blue-mid)", strokeWidth: 1, strokeDasharray: "2 3" }}
            />
          )}
          <Area
            type="monotone"
            dataKey="cleanRate"
            name="Completion"
            stroke={stroke}
            strokeWidth={1.5}
            fill={`url(#${gid})`}
            connectNulls
            isAnimationActive={false}
            dot={false}
            activeDot={tooltip ? { r: 3, stroke, strokeWidth: 1.5, fill: "var(--surface)" } : false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
