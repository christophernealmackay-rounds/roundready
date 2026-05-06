"use client";
import { useState } from "react";
import { X } from "lucide-react";

type Issue = {
  id: string; resident: string; room: string; angel: string;
  issue: string; time: string; date: string;
  resolved: boolean; notes: string; by: string; resDate: string;
};

const initialIssues: Issue[] = [
  {id:"f1", resident:"Harold Bingham",    room:"100B", angel:"Marcus T.",  issue:"Pain score 8/10 — resident verbalized severe discomfort in left hip, requesting pain management review",                                             time:"11:02 AM", date:"May 6, 2026",  resolved:false, notes:"", by:"", resDate:""},
  {id:"f2", resident:"Dorothy Ashford",   room:"102A", angel:"Sarah K.",   issue:"Call light found on floor — resident unable to reach call system for approximately 45 minutes",                                                       time:"9:18 AM",  date:"May 6, 2026",  resolved:false, notes:"", by:"", resDate:""},
  {id:"f3", resident:"Chester Dunbar",    room:"104B", angel:"Linda R.",   issue:"Resident observed without non-slip footwear while attempting to ambulate to bathroom unassisted",                                                     time:"2:44 PM",  date:"May 5, 2026",  resolved:false, notes:"", by:"", resDate:""},
  {id:"f4", resident:"Eleanor Voss",      room:"100A", angel:"Sarah K.",   issue:"Skin redness on left heel — possible Stage 1 pressure injury",                                                                                       time:"7:44 AM",  date:"May 4, 2026",  resolved:true,  notes:"Charge nurse notified immediately. Heel protectors applied per wound care protocol. Wound care team alerted and follow-up scheduled. Care plan updated.",by:"DON — Jennifer D.", resDate:"May 4, 2026"},
  {id:"f5", resident:"Walter Grimes",     room:"102B", angel:"Marcus T.",  issue:"Bed rails not in correct position per care plan — left side rail found in lowered position",                                                         time:"2:10 PM",  date:"May 3, 2026",  resolved:true,  notes:"Rails adjusted immediately. CNA re-educated on positioning protocol. Supervisor notified.",                                                             by:"Tom C.",             resDate:"May 3, 2026"},
  {id:"f6", resident:"Mildred Crane",     room:"101A", angel:"Diana B.",   issue:"Resident verbalized feeling isolated — no visitor contact in 9 days per chart",                                                                     time:"10:30 AM", date:"May 2, 2026",  resolved:true,  notes:"Social worker notified and conducted welfare visit same day. Family contacted by DON. Volunteer visitor program enrollment initiated.",               by:"DON — Jennifer D.", resDate:"May 2, 2026"},
  {id:"f7", resident:"Beatrice Holloway", room:"103A", angel:"Rachel W.",  issue:"IV pole cord stretched across walking path near bed — fall hazard",                                                                                  time:"3:55 PM",  date:"May 1, 2026",  resolved:true,  notes:"Cord repositioned and secured. Nursing staff re-educated on equipment placement.",                                                                    by:"Sarah K.",           resDate:"May 1, 2026"},
];

const resolvedByOptions = ["DON — Jennifer D.","Administrator","Sarah K. (Nursing)","Marcus T. (PT)","Tom C. (Administration)","Diana B. (Medical Records)"];

type FlagFilter = "open"|"resolved"|"all";

export default function IssuesPage() {
  const [issues, setIssues] = useState(initialIssues);
  const [flagFilter, setFlagFilter] = useState<FlagFilter>("open");
  const [modalId, setModalId] = useState<string|null>(null);
  const [notes, setNotes] = useState("");
  const [resolvedBy, setResolvedBy] = useState("Select…");
  const [resDate, setResDate] = useState("");

  const open     = issues.filter(f=>!f.resolved);
  const resolved = issues.filter(f=>f.resolved);
  const displayed = flagFilter==="open"?open : flagFilter==="resolved"?resolved : issues;

  const modalIssue = issues.find(f=>f.id===modalId);

  function openModal(id: string) {
    const f = issues.find(x=>x.id===id);
    if (!f) return;
    setModalId(id);
    setNotes(f.notes);
    setResolvedBy(f.by||"Select…");
    setResDate(f.resDate||"");
  }

  function markResolved() {
    if (!modalId) return;
    setIssues(prev => prev.map(f => f.id===modalId ? {...f, resolved:true, notes, by:resolvedBy, resDate} : f));
    setModalId(null);
  }

  function reopenIssue() {
    if (!modalId) return;
    setIssues(prev => prev.map(f => f.id===modalId ? {...f, resolved:false, notes:"", by:"", resDate:""} : f));
    setModalId(null);
  }

  return (
    <div className="max-w-[1100px] mx-auto" style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:500, color:"var(--ink)" }}>Issues</h1>
          <p style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>Flagged concerns from angel rounds</p>
        </div>
        <div style={{ fontSize:12, color:"var(--muted)" }}>
          <span style={{ fontFamily:"var(--font-mono)", color:"var(--red)", fontWeight:600 }}>{open.length}</span> open &nbsp;·&nbsp; <span style={{ fontFamily:"var(--font-mono)", color:"var(--green)", fontWeight:600 }}>{resolved.length}</span> resolved
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display:"flex", gap:6 }}>
        {(["open","resolved","all"] as FlagFilter[]).map(f => (
          <button key={f} onClick={()=>setFlagFilter(f)} style={{
            fontSize:12, fontWeight:500, padding:"5px 14px", borderRadius:20, cursor:"pointer", transition:"all 0.15s",
            border:`1px solid ${flagFilter===f?"var(--blue)":"var(--hair-strong)"}`,
            background: flagFilter===f?"var(--blue-tint)":"var(--surface)",
            color: flagFilter===f?"var(--blue)":"var(--muted)",
          }}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
            {f==="open" && <span style={{ marginLeft:6, fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:10, background:"var(--red-tint)", color:"var(--red)" }}>{open.length}</span>}
          </button>
        ))}
      </div>

      {/* Issue cards */}
      {displayed.length === 0 ? (
        <div style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:12, padding:32, textAlign:"center", fontSize:13, color:"var(--muted)" }}>
          No {flagFilter==="open"?"open ":flagFilter==="resolved"?"resolved ":""}issues found.
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {displayed.map(f => (
            <div key={f.id} onClick={()=>openModal(f.id)} style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:12, padding:"14px 18px", cursor:"pointer", transition:"border-color 0.15s", boxShadow:"var(--shadow-sm)", opacity: f.resolved ? 0.8 : 1 }}
              onMouseEnter={e=>(e.currentTarget.style.borderColor="var(--hair-strong)")}
              onMouseLeave={e=>(e.currentTarget.style.borderColor="var(--hair)")}
            >
              <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                {/* Icon */}
                <div style={{ width:32, height:32, borderRadius:9, background: f.resolved?"var(--green-tint)":"var(--red-tint)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {f.resolved ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="var(--green)" strokeWidth="1.2"/><path d="M4.5 7l2 2 3.5-3.5" stroke="var(--green)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="var(--red)" strokeWidth="1.2"/><path d="M7 4.5v3M7 9v.5" stroke="var(--red)" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                    <span style={{ fontSize:13, fontWeight:500, color:"var(--ink)" }}>{f.resident}</span>
                    <span style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)" }}>Rm {f.room}</span>
                    <span style={{ fontSize:10, fontWeight:500, padding:"2px 7px", borderRadius:8, background:"var(--plum-tint)", color:"var(--plum)" }}>{f.angel}</span>
                    {f.resolved && <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:999, background:"var(--green-tint)", color:"var(--green)" }}>Resolved</span>}
                  </div>
                  <p style={{ fontSize:12.5, color:"var(--ink-soft)", lineHeight:1.5 }}>{f.issue}</p>
                  {f.resolved && f.notes && (
                    <div style={{ marginTop:8, padding:"8px 10px", background:"var(--green-tint)", borderRadius:8 }}>
                      <p style={{ fontSize:11, color:"var(--green)", fontWeight:600, marginBottom:2 }}>Resolution</p>
                      <p style={{ fontSize:11.5, color:"var(--ink-soft)", lineHeight:1.4 }}>{f.notes}</p>
                      <p style={{ fontSize:11, color:"var(--muted)", marginTop:4 }}>By {f.by} · {f.resDate}</p>
                    </div>
                  )}
                </div>

                {/* Time */}
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)" }}>{f.time}</div>
                  <div style={{ fontSize:11, color:"var(--faint)", marginTop:2 }}>{f.date}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      {modalId && modalIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(7,43,82,0.4)" }}>
          <div style={{ background:"var(--surface)", borderRadius:16, width:"100%", maxWidth:520, margin:"0 16px", maxHeight:"90vh", overflowY:"auto", boxShadow:"var(--shadow-xl)" }}>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"20px 24px 16px", borderBottom:"1px solid var(--hair)" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color:"var(--ink)" }}>{modalIssue.resident} · Rm {modalIssue.room}</div>
                <div style={{ fontSize:12, color:"var(--muted)", marginTop:3 }}>{modalIssue.angel} · {modalIssue.time} · {modalIssue.date}</div>
              </div>
              <button onClick={()=>setModalId(null)} style={{ background:"none", border:"none", cursor:"pointer", flexShrink:0 }}>
                <X size={18} color="var(--muted)"/>
              </button>
            </div>

            {/* Issue detail */}
            <div style={{ padding:"16px 24px" }}>
              <div style={{ background:"var(--surface-alt)", borderRadius:9, padding:"11px 13px", marginBottom:16 }}>
                <div style={{ fontSize:10, color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Issue</div>
                <div style={{ fontSize:13, color:"var(--ink)", lineHeight:1.5 }}>{modalIssue.issue}</div>
              </div>

              {!modalIssue.resolved ? (
                <>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Resolution notes</div>
                  <div style={{ fontSize:12, color:"var(--muted)", marginBottom:10 }}>Describe what action was taken to address this concern.</div>
                  <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} placeholder="e.g. Charge nurse notified, resident repositioned, call light relocated…" style={{ width:"100%", padding:"9px 12px", border:"1px solid var(--hair)", borderRadius:8, fontSize:12, background:"var(--surface)", color:"var(--ink)", outline:"none", resize:"vertical", fontFamily:"inherit", marginBottom:14, boxSizing:"border-box" }}/>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:18 }}>
                    <div>
                      <div style={{ fontSize:11, color:"var(--muted)", marginBottom:4 }}>Resolved by</div>
                      <select value={resolvedBy} onChange={e=>setResolvedBy(e.target.value)} style={{ width:"100%", padding:"8px 10px", border:"1px solid var(--hair)", borderRadius:8, fontSize:12, background:"var(--surface)", color:"var(--ink)", outline:"none", cursor:"pointer" }}>
                        <option>Select…</option>
                        {resolvedByOptions.map(o=><option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize:11, color:"var(--muted)", marginBottom:4 }}>Resolution date</div>
                      <input type="date" value={resDate} onChange={e=>setResDate(e.target.value)} style={{ width:"100%", padding:"8px 10px", border:"1px solid var(--hair)", borderRadius:8, fontSize:12, background:"var(--surface)", color:"var(--ink)", outline:"none" }}/>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={markResolved} style={{ flex:1, padding:"9px", borderRadius:8, fontSize:13, fontWeight:500, border:"none", background:"var(--green)", color:"#fff", cursor:"pointer" }}>
                      Mark as resolved
                    </button>
                    <button onClick={()=>setModalId(null)} style={{ padding:"9px 16px", borderRadius:8, fontSize:13, fontWeight:500, border:"1px solid var(--hair-strong)", background:"var(--surface-alt)", color:"var(--ink-soft)", cursor:"pointer" }}>
                      Save draft
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background:"var(--green-tint)", borderRadius:9, padding:"11px 13px", marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:"var(--green)", marginBottom:5 }}>✓ Resolved</div>
                    <div style={{ fontSize:13, color:"var(--ink)", marginBottom:5, lineHeight:1.5 }}>{modalIssue.notes}</div>
                    <div style={{ fontSize:11, color:"var(--green-mid)" }}>By {modalIssue.by} · {modalIssue.resDate}</div>
                  </div>
                  <button onClick={reopenIssue} style={{ padding:"8px 16px", borderRadius:8, fontSize:12, fontWeight:500, border:"1px solid var(--hair-strong)", background:"var(--surface-alt)", color:"var(--ink-soft)", cursor:"pointer" }}>
                    Reopen issue
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
