/**
 * Editorial-luxe page hero. Replaces the bare `<h1>` pattern on every tab
 * with a structured eyebrow + Fraunces display headline + optional caption,
 * and animates in via the global luxe-reveal-hero keyframes.
 *
 * Usage:
 *   <PageHero
 *     eyebrow="Dashboard · Overview"
 *     title="Today,"
 *     accent="Thursday — May 7"
 *     caption="Compliance posture across all active QAPI items."
 *   />
 *
 * The accent prop renders Fraunces italic on a second line — the
 * signature editorial touch. Omit it for one-line heros.
 */
import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: ReactNode;
  accent?: ReactNode;
  caption?: ReactNode;
  /** Optional right-aligned slot for actions (e.g. Export button). */
  trailing?: ReactNode;
}

export default function PageHero({ eyebrow, title, accent, caption, trailing }: Props) {
  return (
    <div
      className="luxe-reveal-hero"
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 24,
        flexWrap: "wrap",
        marginBottom: 18,
      }}
    >
      <div style={{ minWidth: 0 }}>
        {eyebrow && (
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              marginBottom: 8,
            }}
          >
            {eyebrow}
          </div>
        )}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: accent ? 38 : 44,
            fontWeight: 400,
            letterSpacing: "-0.022em",
            color: "var(--ink)",
            lineHeight: 1.02,
            margin: 0,
            fontFeatureSettings: '"ss01"',
          }}
        >
          {title}
          {accent && (
            <>
              <br />
              <em
                style={{
                  fontStyle: "italic",
                  fontWeight: 400,
                  color: "var(--blue-ink)",
                  letterSpacing: "-0.018em",
                }}
              >
                {accent}
              </em>
            </>
          )}
        </h1>
        {caption && (
          <p
            style={{
              fontSize: 13,
              color: "var(--muted)",
              marginTop: 10,
              maxWidth: 560,
              lineHeight: 1.5,
            }}
          >
            {caption}
          </p>
        )}
      </div>
      {trailing && (
        <div style={{ flexShrink: 0, display: "flex", gap: 8, alignItems: "center" }}>
          {trailing}
        </div>
      )}
    </div>
  );
}
