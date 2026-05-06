"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { useIssuesStore } from "@/lib/store/useIssuesStore";
import { useUsersStore } from "@/lib/store/useUsersStore";
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

export default function IssuesPage() {
  const issues = useIssuesStore((s) => s.issues);
  const { resolveIssue, reopenIssue } = useIssuesStore();
  const users = useUsersStore((s) => s.users);

  const [flagFilter, setFlagFilter] = useState<FlagFilter>("open");
  const [modalIssue, setModalIssue] = useState<Issue | null>(null);
  const [notes, setNotes] = useState("");
  const [resolvedBy, setResolvedBy] = useState("");
  const [resDate, setResDate] = useState("");

  const open     = issues.filter((i) => i.status === "open");
  const resolved = issues.filter((i) => i.status === "resolved");
  const displayed = flagFilter === "open" ? open : flagFilter === "resolved" ? resolved : issues;

  const resolvedByOptions = [
    "DON — Jennifer D.",
    "Administrator",
    ...users.filter((u) => u.role === "charge_nurse" || u.role === "admin").map((u) => u.name),
  ];

  function openModal(issue: Issue) {
    setModalIssue(issue);
    setNotes(issue.resolutionNotes ?? "");
    setResolvedBy(issue.resolvedBy ?? "");
    setResDate(issue.resolvedAt ? new Date(issue.resolvedAt).toISOString().split("T")[0] : "");
  }

  function handleResolve() {
    if (!modalIssue) return;
    resolveIssue(modalIssue.id, resolvedBy || "Administrator", notes);
    setModalIssue(null);
  }

  function handleReopen() {
    if (!modalIssue) return;
    reopenIssue(modalIssue.id);
    setModalIssue(null);
  }

  return (
    <div className="max-w-[1100px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)" }}>Issues</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Flagged concerns from angel rounds</p>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--red)", fontWeight: 600 }}>{open.length}</span> open &nbsp;·&nbsp;
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--green)", fontWeight: 600 }}>{resolved.length}</span> resolved
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6 }}>
        {(["open","resolved","all"] as FlagFilter[]).map((f) => (
          <button key={f} onClick={() => setFlagFilter(f)} style={{
            fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s",
            border: `1px solid ${flagFilter === f ? "var(--blue)" : "var(--hair-strong)"}`,
            background: flagFilter === f ? "var(--blue-tint)" : "var(--surface)",
            color: flagFilter === f ? "var(--blue)" : "var(--muted)",
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)} {f === "open" ? `(${open.length})` : f === "resolved" ? `(${resolved.length})` : `(${issues.length})`}
          </button>
        ))}
      </div>

      {/* Issue list */}
      {displayed.length === 0 ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13, boxShadow: "var(--shadow-sm)" }}>
          No {flagFilter === "all" ? "" : flagFilter} issues
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {displayed.map((issue) => (
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
                </div>
                <span style={{ fontSize: 11, color: "var(--blue)", fontWeight: 500, flexShrink: 0, paddingTop: 2 }}>View →</span>
              </div>
              {issue.status === "resolved" && issue.resolutionNotes && (
                <div style={{ background: "var(--green-tint)", border: "1px solid var(--green-pale)", borderRadius: 8, padding: "8px 12px", marginTop: 8, fontSize: 12, color: "var(--green)" }}>
                  <strong>Resolved by {issue.resolvedBy}</strong> · {issue.resolvedAt ? fmt(issue.resolvedAt) : ""}
                  <div style={{ color: "var(--ink-soft)", marginTop: 4 }}>{issue.resolutionNotes}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      {modalIssue && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) setModalIssue(null); }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: "24px 28px", width: 480, boxShadow: "var(--shadow-xl)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>{modalIssue.residentName}</h2>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Room {modalIssue.room}{modalIssue.bed} · {modalIssue.angelName} · {modalIssue.department}</div>
              </div>
              <button onClick={() => setModalIssue(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", flexShrink: 0 }}><X size={16} /></button>
            </div>

            <div style={{ background: "var(--surface-alt)", borderRadius: 10, padding: "12px 14px", marginBottom: 18, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
              {modalIssue.questionText}
            </div>

            {modalIssue.status === "open" ? (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Resolution notes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 13, color: "var(--ink)", outline: "none", resize: "vertical", boxSizing: "border-box" }} placeholder="Describe what was done to resolve this issue…" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Resolved by</label>
                    <select value={resolvedBy} onChange={(e) => setResolvedBy(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 12, color: "var(--ink)", outline: "none", cursor: "pointer" }}>
                      <option value="">Select…</option>
                      {resolvedByOptions.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Resolution date</label>
                    <input type="date" value={resDate} onChange={(e) => setResDate(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--hair)", background: "var(--surface-alt)", fontSize: 12, color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setModalIssue(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleResolve} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--green)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Mark resolved</button>
                </div>
              </>
            ) : (
              <>
                {modalIssue.resolutionNotes && (
                  <div style={{ background: "var(--green-tint)", border: "1px solid var(--green-pale)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13 }}>
                    <div style={{ fontWeight: 600, color: "var(--green)", marginBottom: 4 }}>Resolved by {modalIssue.resolvedBy} · {modalIssue.resolvedAt ? fmt(modalIssue.resolvedAt) : ""}</div>
                    <div style={{ color: "var(--ink-soft)", lineHeight: 1.5 }}>{modalIssue.resolutionNotes}</div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setModalIssue(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hair-strong)", background: "var(--surface-alt)", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>Close</button>
                  <button onClick={handleReopen} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--amber-edge)", background: "var(--amber-tint)", color: "var(--amber)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Reopen issue</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
