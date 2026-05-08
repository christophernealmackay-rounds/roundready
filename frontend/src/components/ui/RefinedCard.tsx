/**
 * The base luxe card surface. 1px hairline + inner highlight + soft warm
 * shadow. Hover state lifts and darkens the border via the .luxe-card-hover
 * CSS class so static cards (no hover) share the same default appearance.
 *
 * Most existing card divs in the app can be swapped to <RefinedCard> with
 * a one-line change.
 */
"use client";
import type { CSSProperties, ReactNode, MouseEventHandler } from "react";

interface Props {
  children: ReactNode;
  hoverable?: boolean;
  padding?: number | string;
  className?: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler<HTMLDivElement>;
  /** Stagger index — sets --i for the .luxe-reveal-stagger animation. */
  revealIndex?: number;
}

export default function RefinedCard({
  children,
  hoverable = false,
  padding = "14px 16px",
  className = "",
  style,
  onClick,
  revealIndex,
}: Props) {
  const classes = [
    "luxe-card",
    hoverable && "luxe-card-hover",
    revealIndex !== undefined && "luxe-reveal-stagger",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      onClick={onClick}
      style={{
        padding,
        cursor: onClick ? "pointer" : undefined,
        ...(revealIndex !== undefined ? { ["--i" as string]: revealIndex } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
