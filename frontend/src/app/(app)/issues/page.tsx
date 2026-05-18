"use client";
import { useState } from "react";
import { Bell, X } from "lucide-react";
import { useIssuesStore } from "@/lib/store/useIssuesStore";
import { useUsersStore } from "@/lib/store/useUsersStore";
import { useCurrentUser } from "@/lib/auth/currentUser";
import { PageHero, Pill } from "@/components/ui";
import type { Issue } from "@/lib/types";

type FlagFilter = "open" | "resolved" | "all";

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/**
 * Resolve is allowed for: DON (admin), Charge Nurse, and the department head
 * of the issue's department. Everyone else sees a read-only modal.
 */
function canResolve(user: ReturnType<typeof useCurrentUser>, issue: Issue): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "charge_nurse") return true;
  if (user.role === "angel" && user.departmentId === issue.departmentId) return true;
  return false;
}

export default function IssuesPage() {
  const issues = useIssuesStore((s) => s.issues);
  const { resolveIssue, reopenIssue } = useIssuesStore();
  const users = useUsersStore((s) => s.users);
  const currentUser = useCurrentUser();

  const [flagFilter, setFlagFilter] = useState<FlagFilter>("open");
  const [modalIssue, setModalIssue] = useState<Issue | null>(null);
  const [notes, setNotes] = useState("");
  const [resolvedById, setResolvedById] = useState("");

  const open     = issues.filter((i) => i.status === "open");
  const resolved = issues.filter((i) => i.status === "resolved");
  const displayed = flagFilter === "open" ? open : flagFilter === "resolved" ? resolved : issues;

  // Eligible resolvers: admins, charge nurses, and the department head of the
  // issue's department. The dropdown defaults to the current user.
  function eligibleResolvers(issue: Issue) {
    return users.filter(
      (u) =>
        u.active &&
        (u.role === "admin" ||
          u.role === "charge_nurse" ||
          (u.role === "angel" && u.departmentId === issue.departmentId))
    );
  }

  function openModal(issue: Issue) {
    setModalIssue(issue);
    setNotes(issue.resolutionNotes ?? "");
    setResolvedById(issue.resolvedBy ?? currentUser?.id ?? "");
  }

  async function handleResolve() {
    if (!modalIssue || !resolvedById) return;
    await resolveIssue(modalIssue.id, resolvedById, notes);
    setModalIssue(null);
  }

  async function handleReopen() {
    if (!modalIssue) return;
    await reopenIssue(modalIssue.id);
    setModalIssue(null);
  }

  return (
    <div className="max-w-[1100px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      <PageHero
        eyebrow="Issues · Flagged Concerns"
        title="Watch list,"
        accent="open and resolved."
        caption="Concerns surfaced during angel rounds. Resolution mirrors the audit trail."
        trailing={
          <div
            style={{
              fontSize: 12,
              color: "var(--muted)",
              fontFamily: "var(--font-mono)",
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span>
              <span style={{ color: "var(--red)", fontWeight: 600 }}>{open.length}</span>
              <span style={{ marginLeft: 5 }}>open</span>
            </span>
            <span style={{ color: "var(--hair-strong)" }}>·</span>
            <span>
              <span style={{ color: "var(--green)", fontWeight: 600 }}>{resolved.length}</span>
              <span style={{ marginLeft: 5 }}>resolved</span>
            </span>
          </div>
        }
      />

      {/* Filter pills */}
      <div className="luxe-reveal-stagger" style={{ ["--i" as string]: 0, display: "flex", gap: 6 }}>
        {(["open","resolved","all"] as FlagFilter[]).map((f) => (
          <Pill key={f} active={flagFilter === f} onClick={() => setFlagFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}{" "}
            {f === "open" ? `(${open.length})` : f === "resolved" ? `(${resolved.length})` : `(${issues.length})`}
          </Pill>
        ))}
      </div>

      {/* Issue list */}
      {displayed.length === 0 ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13, boxShadow: "var(--shadow-sm)" }}>
          No {flagFilter === "all" ? "" : flagFilter} issues
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {displayed.map((issue) => {
            const notifs = issue.notifications ?? [];
            return (
              <div key={issue.id} style={{ background: "var(--surface)", border: `1px solid ${issue.status === "open" ? "var(--hair)" : "var(--hair-soft)"}`, borderRadius: 12, padding: "16px 18px", boxShadow: "var(--shadow-sm)", cursor: "pointer", transition: "all 0.15s" }} onClick={() => openModal(issue)}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{issue.residentName}</span>
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>Rm {issue.room}{issue.bed}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 999, background: issue.status === "open" ? "var(--red-tint)" : "var(--green-tint)", color: issue.status === "open" ? "var(--red)" : "var(--green)" }}>
                        {issue.status === "open" ? "Open" : "Resolved"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                      {issue.angelName} · {issue.department} · {fmtTime(issue.createdAt)} · {fmt(issue.createdAt)}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>{issue.questionText}</div>
                    {issue.flagNotes && (
                      <div style={{ marginTop: 8, paddingLeft: 10, borderLeft: "2px solid var(--blue-pale)", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 600, color: "var(--blue)" }}>Angel observed: </span>
                        {issue.flagNotes}
                      </div>
                    )}
                    {notifs.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
                        <Bell size={11} />
                        Notified {notifs.map((n) => n.notifiedUserName ?? "user").join(", ")} at {fmtTime(notifs[0].notifiedAt)}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--blue)", fontWeight: 500, flexShrink: 0, paddingTop: 2 }}>View →</span>
                </div>
                {issue.status === "resolved" && issue.resolutionNotes && (
                  <div style={{ background: "var(--green-tint)", border: "1px solid var(--green-pale)", borderRadius: 8, padding: "8px 12px", marginTop: 8, fontSize: 12, color: "var(--green)" }}>
                    <strong>Resolved by {issue.resolvedByName ?? issue.resolvedBy}</strong> · {issue.resolvedAt ? fmt(issue.resolvedAt) : ""}
                    <div style={{ color: "var(--ink-soft)", marginTop: 4 }}>{issue.resolutionNotes}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution Modal */}
      {modalIssue && (() => {
        const notifs = modalIssue.notifications ?? [];
        const resolvers = eligibleResolvers(modalIssue);
        const allowed = canResolve(currentUser, modalIssue);
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) setModalIssue(null); }}>
            <div style={{ background: "var(--surface)", borderRadius: 16, padding: "24px 28px", width: 520, boxShadow: "var(--shadow-xl)", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
                <div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>{modalIssue.residentName}</h2>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Room {modalIssue.room}{modalIssue.bed} · {modalIssue.angelName} · {modalIssue.department}</div>
                </div>
                <button onClick={() => setModalIssue(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", flexShrink: 0 }}><X size={16} /></button>
              </div>

              <div style={{ background: "var(--surface-alt)", borderRadius: 10, padding: "12px 14px", marginBottom: 14, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                {modalIssue.questionText}
              </div>

              {/* What the angel observed — the context the resolver needs */}
              {modalIssue.flagNotes && (
                <div style={{ background: "var(--blue-wash)", border: "1px solid var(--blue-pale)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>
                    What the angel observed
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                    {modalIssue.flagNotes}
                  </div>
                </div>
              )}

              {/* Notification trail */}
              {notifs.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Notification trail</div>
                  <div style={{ background: "var(--blue-wash)", border: "1px solid var(--blue-pale)", borderRadius: 9, padding: "10px 12px", fontSize: 12 }}>
                    {notifs.map((n) => (
                      <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", color: "var(--ink-soft)" }}>
                        <Bell size={11} style={{ color: "var(--blue)" }} />
                        <span style={{ fontWeight: 500 }}>{n.notifiedUserName ?? "Unknown user"}</span>
                        <span style={{ color: "var(--muted)" }}>· {n.channel === "in_app" ? "In-app" : n.channel}</span>
                        <span style={{ color: "var(--muted)", marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11 }}>{fmtTime(n.notifiedAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {modalIssue.status === "open" ? (
                allowed ? (
                  <>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Resolution notes</label>
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", resize: "vertical", boxSizing: "border-box" }} placeholder="Describe what was done to resolve this issue…" />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Resolved by</label>
                      <select value={resolvedById} onChange={(e) => setResolvedById(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 12, color: "var(--ink)", outline: "none", cursor: "pointer" }}>
                        <option value="">Select…</option>
                        {resolvers.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role.replace("_"," ")})</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => setModalIssue(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                      <button onClick={handleResolve} disabled={!resolvedById} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: resolvedById ? "var(--green)" : "var(--hair-strong)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: resolvedById ? "pointer" : "not-allowed" }}>Mark resolved</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ background: "var(--amber-tint)", border: "1px solid var(--amber-edge)", borderRadius: 9, padding: "10px 12px", fontSize: 12, color: "var(--amber)", marginBottom: 16 }}>
                      You don&apos;t have permission to resolve this issue. Resolution is restricted to the DON, a Charge Nurse, or the {modalIssue.department} department head.
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => setModalIssue(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>Close</button>
                    </div>
                  </>
                )
              ) : (
                <>
                  {modalIssue.resolutionNotes && (
                    <div style={{ background: "var(--green-tint)", border: "1px solid var(--green-pale)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13 }}>
                      <div style={{ fontWeight: 600, color: "var(--green)", marginBottom: 4 }}>Resolved by {modalIssue.resolvedByName ?? modalIssue.resolvedBy} · {modalIssue.resolvedAt ? fmt(modalIssue.resolvedAt) : ""}</div>
                      <div style={{ color: "var(--ink-soft)", lineHeight: 1.5 }}>{modalIssue.resolutionNotes}</div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setModalIssue(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>Close</button>
                    {allowed && (
                      <button onClick={handleReopen} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--amber-edge)", background: "var(--amber-tint)", color: "var(--amber)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Reopen issue</button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
