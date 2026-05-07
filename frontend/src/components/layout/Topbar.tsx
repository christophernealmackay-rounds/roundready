"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";
import { useIssuesStore, useRoundsStore, useUsersStore } from "@/lib/store";
import { initials, useCurrentUser } from "@/lib/auth/currentUser";
import type { NotificationPrefs } from "@/lib/types";

const NAV = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Angels",    href: "/angels" },
  { label: "Residents", href: "/residents" },
  { label: "Issues",    href: "/issues" },
  { label: "Users",     href: "/users" },
  { label: "QAPI",      href: "/qapi" },
  { label: "Rounds",    href: "/rounds" },
  { label: "Reports",   href: "/reports" },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Topbar() {
  const pathname = usePathname();
  const openCount = useIssuesStore((s) => s.issues.filter((i) => i.status === "open").length);
  const currentUser = useCurrentUser();
  const setNotificationPrefs = useUsersStore((s) => s.setNotificationPrefs);
  const departments = useUsersStore((s) => s.departments);
  const questions = useRoundsStore((s) => s.questions);
  const userPrefs: NotificationPrefs = currentUser?.notificationPrefs ?? {};
  function togglePref(key: keyof NotificationPrefs) {
    if (!currentUser) return;
    setNotificationPrefs(currentUser.id, { ...userPrefs, [key]: !userPrefs[key] });
  }

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeDays, setActiveDays] = useState([0, 1, 2, 3, 4]);
  const [times, setTimes] = useState(["10:00 AM", "1:00 PM", "4:00 PM"]);
  const [reminders, setReminders] = useState(true);
  const [capacity, setCapacity] = useState("55");
  const [emailTogg, setEmailTogg] = useState(true);
  const [pushAdminTogg, setPushAdminTogg] = useState(true);
  const [smsTogg, setSmsTogg] = useState(false);
  const [pushAngelTogg, setPushAngelTogg] = useState(true);

  function toggleDay(i: number) {
    setActiveDays((prev) => prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort());
  }

  function addTime(e: React.ChangeEvent<HTMLSelectElement>) {
    const t = e.target.value;
    if (t && !times.includes(t)) setTimes((prev) => [...prev, t]);
    e.target.value = "";
  }

  return (
    <>
      <header className="sticky top-0 z-[100] flex flex-col" style={{ background: "var(--topbar-gradient)" }}>
        <div className="flex items-center h-[56px] px-6 gap-6">
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, letterSpacing: "-0.02em", color: "#fff" }}>
            RoundReady
          </span>
          <span style={{ fontSize: 11, fontWeight: 400, letterSpacing: "0.005em", color: "rgba(255,255,255,0.55)" }}>|</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.6)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Admin Portal
          </span>
          <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)" }}>Sunrise Gardens SNF</span>
          <div className="flex-1" />
          <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>Tue May 6, 2026</span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center w-8 h-8 rounded-full transition-all hover:bg-white/10"
            aria-label="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6.5 2h3l.4 1.4a5 5 0 0 1 1.2.7l1.4-.4 1.5 2.6-1 1a5 5 0 0 1 0 1.4l1 1-1.5 2.6-1.4-.4a5 5 0 0 1-1.2.7L9.5 14h-3l-.4-1.4a5 5 0 0 1-1.2-.7l-1.4.4L2 9.7l1-1a5 5 0 0 1 0-1.4l-1-1L3.5 3.7l1.4.4a5 5 0 0 1 1.2-.7L6.5 2Z" stroke="rgba(255,255,255,0.8)" strokeWidth="1.3"/>
              <circle cx="8" cy="8" r="2" stroke="rgba(255,255,255,0.8)" strokeWidth="1.3"/>
            </svg>
          </button>
          <div className="flex items-center justify-center w-8 h-8 rounded-full select-none" style={{ background: "var(--avatar-gradient)", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.02em", color: "#fff", boxShadow: "0 0 0 2px rgba(255,255,255,0.15)" }} title={currentUser?.name ?? ""}>
            {currentUser ? initials(currentUser.name) : ""}
          </div>
        </div>

        <nav className="flex items-end px-6">
          {NAV.map((tab) => {
            const active = pathname === tab.href || (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
            const badge = tab.label === "Issues" ? openCount : undefined;
            return (
              <Link key={tab.href} href={tab.href} style={{ fontSize: 13, fontWeight: 500, padding: "13px 16px", color: active ? "#fff" : "rgba(255,255,255,0.6)", borderBottom: active ? "2px solid #fff" : "2px solid transparent", transition: "all 0.15s", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                {tab.label}
                {badge !== undefined && badge > 0 && (
                  <span style={{ background: "var(--red-tint)", color: "var(--red)", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 10 }}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      {settingsOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-start justify-end"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}
        >
          <div style={{ background: "var(--surface-alt)", width: "min(820px,100vw)", height: "100vh", overflowY: "auto", boxShadow: "-20px 0 60px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 h-[56px]" style={{ background: "var(--topbar-gradient)", flexShrink: 0 }}>
              <div className="flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6.5 2h3l.4 1.4a5 5 0 0 1 1.2.7l1.4-.4 1.5 2.6-1 1a5 5 0 0 1 0 1.4l1 1-1.5 2.6-1.4-.4a5 5 0 0 1-1.2.7L9.5 14h-3l-.4-1.4a5 5 0 0 1-1.2-.7l-1.4.4L2 9.7l1-1a5 5 0 0 1 0-1.4l-1-1L3.5 3.7l1.4.4a5 5 0 0 1 1.2-.7L6.5 2Z" stroke="rgba(255,255,255,0.85)" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="rgba(255,255,255,0.85)" strokeWidth="1.3"/></svg>
                <span style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>Settings</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Sunrise Gardens SNF</span>
              </div>
              <button onClick={() => setSettingsOpen(false)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                <X size={13} /> Close
              </button>
            </div>

            <div style={{ padding: "20px 24px", flex: 1 }}>
              {/* My notifications — per-user prefs (persisted via PATCH /users/{id}) */}
              {currentUser && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>My Notifications — {currentUser.name}</p>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "4px 16px", marginBottom: 20, boxShadow: "var(--shadow-sm)" }}>
                    {([
                      { key: "issues" as const,    label: "Flagged issues",          sub: "Notify me whenever a round flags a concern" },
                      { key: "reminders" as const, label: "Round reminders",         sub: "Push notifications before each rounding window" },
                      { key: "summaries" as const, label: "Daily completion summary", sub: "End-of-day rollup of completion rate" },
                    ]).map((n, i, arr) => {
                      const on = !!userPrefs[n.key];
                      return (
                        <div key={n.key} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "11px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--hair-soft)" : undefined, gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{n.label}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{n.sub}</div>
                          </div>
                          <div onClick={() => togglePref(n.key)} style={{ width: 38, height: 21, borderRadius: 11, background: on ? "var(--blue)" : "var(--hair-strong)", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                            <div style={{ position: "absolute", top: 3, left: on ? 20 : 3, width: 15, height: 15, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Global department routing — read-only display (driven by question.notify_department_id) */}
                  <p style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>Department Routing</p>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "14px 16px", marginBottom: 20, boxShadow: "var(--shadow-sm)" }}>
                    <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
                      Issues flagged by an angel route to the department configured on the rounding question. Configure routing on each question in the <Link href="/rounds" style={{ color: "var(--blue)", textDecoration: "none" }}>Rounds tab</Link>.
                    </p>
                    {(() => {
                      const counts = new Map<string, number>();
                      for (const q of questions) {
                        if (q.notifyDepartmentId) counts.set(q.notifyDepartmentId, (counts.get(q.notifyDepartmentId) ?? 0) + 1);
                      }
                      const rows = departments
                        .map((d) => ({ ...d, n: counts.get(d.id) ?? 0 }))
                        .filter((d) => d.n > 0)
                        .sort((a, b) => b.n - a.n);
                      if (rows.length === 0) {
                        return <div style={{ fontSize: 12, color: "var(--muted)", padding: "8px 0" }}>No questions have routing configured yet.</div>;
                      }
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {rows.map((d) => (
                            <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--hair-soft)", fontSize: 12 }}>
                              <span style={{ color: "var(--ink)" }}>{d.name}</span>
                              <span style={{ fontFamily: "var(--font-mono)", color: "var(--muted)", fontSize: 11 }}>
                                {d.n} {d.n === 1 ? "question" : "questions"}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              <button style={{ width: "100%", padding: 10, borderRadius: 8, border: "none", background: "var(--blue)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", marginBottom: 20 }}>
                Save all settings
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>Facility Profile</p>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "14px 16px", marginBottom: 16, boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Facility name</div>
                      <input defaultValue="Sunrise Gardens SNF" style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--hair)", borderRadius: 8, fontSize: 12, background: "var(--surface-alt)", color: "var(--ink)", outline: "none" }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Primary notification email</div>
                      <input defaultValue="admin@sunrisegardens.com" style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--hair)", borderRadius: 8, fontSize: 12, background: "var(--surface-alt)", color: "var(--ink)", outline: "none" }} />
                    </div>
                    <button style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: "var(--blue)", color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Save changes</button>
                  </div>

                  <p style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>Integrations</p>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "4px 16px", marginBottom: 16, boxShadow: "var(--shadow-sm)" }}>
                    {[
                      { name: "PointClickCare FHIR", sub: "Patient census + observation sync", status: "Not connected", statusColor: "var(--muted)", statusBg: "var(--surface-alt)", btn: "Connect" },
                      { name: "AWS S3 photo storage", sub: "HIPAA-eligible · BAA signed", status: "Connected", statusColor: "var(--green)", statusBg: "var(--green-tint)", btn: null },
                      { name: "Email (SMTP)", sub: "Staff invites and daily summaries", status: "Connected", statusColor: "var(--green)", statusBg: "var(--green-tint)", btn: null },
                    ].map((intg, i) => (
                      <div key={intg.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: i < 2 ? "1px solid var(--hair-soft)" : undefined }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{intg.name}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{intg.sub}</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: intg.statusBg, color: intg.statusColor }}>{intg.status}</span>
                        {intg.btn && <button style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", cursor: "pointer" }}>{intg.btn}</button>}
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>Census Capacity</p>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "14px 16px", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Licensed bed capacity</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>Used to calculate census percentage on the dashboard.</div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
                      <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} style={{ width: 80, padding: "7px 10px", border: "1px solid var(--hair)", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-mono)", background: "var(--surface-alt)", color: "var(--ink)", outline: "none" }} />
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>licensed beds</span>
                    </div>
                    {[
                      { color: "var(--green)", label: "90% and above — excellent census" },
                      { color: "var(--amber-mid)", label: "80–89% — monitor, below target" },
                      { color: "var(--red-mid)", label: "Below 80% — concern, review admissions" },
                    ].map((g) => (
                      <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: g.color }} />
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>{g.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>Notification Delivery</p>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "4px 16px", marginBottom: 16, boxShadow: "var(--shadow-sm)" }}>
                    {[
                      { label: "Email notifications", sub: "Completion status sent to administrator email", on: emailTogg, toggle: () => setEmailTogg((v) => !v) },
                      { label: "Push notifications — administrator", sub: "Check-in alerts to the RoundReady admin app", on: pushAdminTogg, toggle: () => setPushAdminTogg((v) => !v) },
                      { label: "SMS alerts — flagged concerns only", sub: "Text message when a concern is escalated", on: smsTogg, toggle: () => setSmsTogg((v) => !v) },
                      { label: "Push notifications — angels", sub: "Required for angel round reminders to be delivered", on: pushAngelTogg, toggle: () => setPushAngelTogg((v) => !v) },
                    ].map((n, i) => (
                      <div key={n.label} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "11px 0", borderBottom: i < 3 ? "1px solid var(--hair-soft)" : undefined, gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{n.label}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{n.sub}</div>
                        </div>
                        <div onClick={n.toggle} style={{ width: 38, height: 21, borderRadius: 11, background: n.on ? "var(--blue)" : "var(--hair-strong)", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                          <div style={{ position: "absolute", top: 3, left: n.on ? 20 : 3, width: 15, height: 15, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>Billing</p>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "14px 16px", marginBottom: 16, boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Professional plan</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>$350/month · renews Jun 1, 2026</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--green-tint)", color: "var(--green)" }}>Active</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>Unlimited rounds · unlimited angels · compliance reports · email support · audit log exports</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 12, cursor: "pointer" }}>Manage billing</button>
                      <button style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--red-edge)", background: "var(--red-tint)", color: "var(--red)", fontSize: 12, cursor: "pointer" }}>Cancel plan</button>
                    </div>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>Rounding Schedule</p>
              <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "14px 16px", marginBottom: 16, boxShadow: "var(--shadow-sm)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Active rounding days</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>Rounds are expected and tracked on selected days only.</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {days.map((d, i) => (
                    <button key={d} onClick={() => toggleDay(i)} style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${activeDays.includes(i) ? "var(--blue)" : "var(--hair-strong)"}`, background: activeDays.includes(i) ? "var(--blue)" : "var(--surface-alt)", color: activeDays.includes(i) ? "#fff" : "var(--muted)", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                      {d}
                    </button>
                  ))}
                </div>
                <div style={{ background: "var(--surface-alt)", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "var(--muted)" }}>
                  Rounds active on: {days.filter((_, i) => activeDays.includes(i)).join(", ")}
                </div>
              </div>

              <p style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>Completion Notifications</p>
              <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: "14px 16px", marginBottom: 16, boxShadow: "var(--shadow-sm)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Administrator check-in times</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>Completion status sent to administrator at each time. Notifications stop once all rounds are complete.</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {times.map((t) => (
                    <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, border: "1px solid var(--blue)", background: "var(--blue-tint)", color: "var(--blue)" }}>
                      {t}
                      <button onClick={() => setTimes((prev) => prev.filter((x) => x !== t))} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: "var(--blue)", fontSize: 14, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
                <select onChange={addTime} style={{ padding: "7px 10px", border: "1px solid var(--hair)", borderRadius: 8, fontSize: 12, background: "var(--surface-alt)", color: "var(--ink)", cursor: "pointer", outline: "none", marginBottom: 16 }}>
                  <option value="">Add a time…</option>
                  {["9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM"].map((t) => <option key={t}>{t}</option>)}
                </select>

                <div style={{ borderTop: "1px solid var(--hair-soft)", paddingTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ paddingRight: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Angel round reminders</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>Send a push notification to each angel <strong>30 minutes before</strong> each check-in time.</div>
                    </div>
                    <div onClick={() => setReminders((v) => !v)} style={{ width: 38, height: 21, borderRadius: 11, background: reminders ? "var(--blue)" : "var(--hair-strong)", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                      <div style={{ position: "absolute", top: 3, left: reminders ? 20 : 3, width: 15, height: 15, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
                    </div>
                  </div>
                  {reminders && (
                    <div style={{ background: "var(--plum-tint)", border: "1px solid var(--plum-pale)", borderRadius: 9, padding: "10px 13px", fontSize: 12, color: "var(--plum)" }}>
                      <strong>How it works:</strong> 30 minutes before each check-in, a push notification fires to any angel with incomplete rounds. Fully-complete angels receive nothing.
                    </div>
                  )}
                </div>
              </div>

              <button style={{ width: "100%", padding: 10, borderRadius: 8, border: "none", background: "var(--blue)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", marginBottom: 8 }}>
                Save all settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
