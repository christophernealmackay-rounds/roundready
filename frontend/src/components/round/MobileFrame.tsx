"use client";
import type { ReactNode } from "react";

/**
 * Phone bezel + screen. Used to render the angel-side rounding UI inside
 * the admin web app, so DON/Administrator can preview what their angels
 * see on their phones.
 */
export default function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 360,
        height: 720,
        background: "#0d0d12",
        borderRadius: 44,
        padding: 12,
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.04) inset, 0 30px 80px rgba(0,0,0,0.45), 0 8px 20px rgba(0,0,0,0.3)",
        position: "relative",
      }}
    >
      {/* Side buttons */}
      <span style={sideBtn(120, 4)} />
      <span style={sideBtn(180, 4)} />
      <span style={sideBtn(150, "right")} />

      {/* Screen */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "var(--bg)",
          borderRadius: 32,
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Status bar / notch */}
        <div
          style={{
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 22px",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--ink)",
            position: "relative",
            zIndex: 2,
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)" }}>9:41</span>
          <span
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              top: 6,
              width: 90,
              height: 22,
              background: "#0d0d12",
              borderRadius: 14,
            }}
          />
          <span style={{ fontSize: 10, color: "var(--muted)" }}>● ●● ●●●●●</span>
        </div>

        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          {children}
        </div>

        {/* Home indicator */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingBottom: 6,
            paddingTop: 4,
          }}
        >
          <div style={{ width: 110, height: 4, background: "var(--ink)", opacity: 0.6, borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

function sideBtn(top: number, side: "right" | number): React.CSSProperties {
  return {
    position: "absolute",
    [typeof side === "number" ? "left" : "right"]: -2,
    top,
    width: 4,
    height: side === "right" ? 60 : 32,
    background: "#1f1f25",
    borderRadius: 2,
    display: "block",
  } as React.CSSProperties;
}
