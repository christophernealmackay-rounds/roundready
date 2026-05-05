"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

const tabs = [
  { label: "Dashboard", href: "/mockups/dashboard" },
  { label: "Angels",    href: "/mockups/angels" },
  { label: "Residents", href: "/mockups/residents" },
  { label: "Users",     href: "/mockups/users" },
  { label: "QAPI",      href: "/mockups/qapi" },
  { label: "Rounds",    href: "/mockups/rounds" },
  { label: "Reports",   href: "/mockups/reports" },
];

export default function Topbar() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-[100] flex flex-col"
      style={{ background: "var(--topbar-gradient)" }}
    >
      {/* Main bar */}
      <div className="flex items-center h-[56px] px-6 gap-6">
        {/* Logo */}
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "#fff",
          }}
        >
          RoundReady
        </span>

        {/* Facility name */}
        <span style={{ fontSize: 11.5, fontWeight: 400, letterSpacing: "0.005em", color: "rgba(255,255,255,0.65)" }}>
          Sunrise Gardens SNF
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Settings */}
        <button
          className="flex items-center justify-center w-8 h-8 rounded-full transition-all hover:bg-white/10"
          aria-label="Settings"
        >
          <Settings size={16} color="rgba(255,255,255,0.8)" />
        </button>

        {/* Avatar */}
        <div
          className="flex items-center justify-center w-8 h-8 rounded-full select-none"
          style={{
            background: "var(--avatar-gradient)",
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.02em",
            color: "#fff",
            boxShadow: "0 0 0 2px rgba(255,255,255,0.15)",
          }}
        >
          CM
        </div>
      </div>

      {/* Nav tabs */}
      <nav className="flex items-end px-6">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                fontSize: 13,
                fontWeight: 500,
                padding: "14px 18px",
                color: active ? "#fff" : "rgba(255,255,255,0.65)",
                borderBottom: active ? "2px solid #fff" : "2px solid transparent",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
