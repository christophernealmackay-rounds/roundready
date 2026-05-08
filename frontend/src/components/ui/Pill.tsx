/**
 * Filter / range pill used by Dashboard date range, Issues filter,
 * Reports range. Replaces the hand-rolled inline pill style with a
 * consistent treatment that uses the new .luxe-pill-active inset glow.
 */
"use client";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}

export default function Pill({ children, active = false, onClick, size = "md" }: Props) {
  const pad = size === "sm" ? "4px 11px" : "6px 14px";
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "luxe-pill-active" : undefined}
      style={{
        fontSize: 12,
        fontWeight: 500,
        padding: pad,
        borderRadius: 20,
        cursor: "pointer",
        transition: "all 180ms var(--ease-luxe)",
        ...(active
          ? null
          : {
              border: "1px solid var(--hair-strong)",
              background: "var(--surface)",
              color: "var(--muted)",
            }),
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}
