"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";

type Angel = { id:number; name:string; dept:string; residents:number; absent:boolean; rounds:number };

const initialAngels: Angel[] = [
  {id:1, name:"Maria Rodriguez", dept:"Nursing",      residents:8, absent:false, rounds:6},
  {id:2, name:"James Thompson",  dept:"Dietary",      residents:7, absent:false, rounds:5},
  {id:3, name:"Sandra Kim",      dept:"Activities",   residents:9, absent:true,  rounds:0},
  {id:4, name:"David Martinez",  dept:"Therapy",      residents:8, absent:false, rounds:8},
  {id:5, name:"Linda Patterson", dept:"Housekeeping", residents:6, absent:false, rounds:7},
];

function ini(n:string){return n.split(" ").map(p=>p[0]).join("").slice(0,2)}

type Filter = "all"|"active"|"absent";

export default function AngelsPage() {
  const [angels, setAngels] = useState(initialAngels);
  const [filter, setFilter] = useState<Filter>("all");
  const [absentModal, setAbsentModal] = useState<Angel|null>(null);
  const [redistribute, setRedistribute] = useState(true);

  const absentAngels = angels.filter(a=>a.absent);
  const activeAngels = angels.filter(a=>!a.absent);
  const depts = new Set(angels.map(a=>a.dept)).size;

  const displayed = filter==="active" ? activeAngels : filter==="absent" ? absentAngels : angels;

  function markAbsent(a: Angel) {
    setAngels(prev => prev.map(x => x.id===a.id ? {...x, absent:true, rounds:0} : x));
    setAbsentModal(null);
  }

  function returnToDuty(id: number) {
    setAngels(prev => prev.map(x => x.id===id ? {...x, absent:false} : x));
  }

  const kpiCards: {id:Filter; label:string; value:number; color:string}[] = [
    {id:"all",    label:"Total Angels",  value:angels.length,        color:"var(--ink)"},
    {id:"active", label:"On Duty Today", value:activeAngels.length,  color:"var(--green)"},
    {id:"absent", label:"Absent Today",  value:absentAngels.length,  color:"var(--red)"},
    {id:"all",    label:"Departments",   value:depts,                 color:"var(--blue)"},
  ];

  return (
    <div className="max-w-[1100px] mx-auto" style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* 4 KPI filter cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {kpiCards.map((k,i) => {
          const isActive = (i===0&&filter==="all") || (i===1&&filter==="active") || (i===2&&filter==="absent");
          const filterId: Filter = i===1?"active":i===2?"absent":"all";
          return (
            <div key={k.label} onClick={()=>setFilter(filterId)} style={{
              background:"var(--surface)", border:`1px solid ${isActive?"var(--blue)":"var(--hair)"}`,
              borderRadius:10, padding:"12px 14px", cursor:"pointer", transition:"all 0.15s",
              boxShadow:"var(--shadow-sm)",
              ...(isActive ? {background:"var(--blue-tint)"} : {}),
            }}>
              <div style={{ fontSize:24, fontWeight:600, color: isActive?"var(--blue-deep)":k.color, lineHeight:1, fontFamily:"var(--font-mono)" }}>{k.value}</div>
              <div style={{ fontSize:10, color: isActive?"var(--blue)":"var(--muted)", marginTop:4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em" }}>{k.label}</div>
            </div>
          );
        })}
      </div>

      {/* Absent bar */}
      {absentAngels.length > 0 && (
        <div style={{ background:"var(--amber-tint)", border:"1px solid var(--amber-edge)", borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div style={{ fontSize:12, color:"var(--amber)" }}>
            <strong>{absentAngels.map(a=>a.name).join(", ")}</strong> {absentAngels.length===1?"is":"are"} marked absent today. Their residents are unassigned.
          </div>
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            <button style={{ fontSize:12, fontWeight:500, padding:"6px 13px", borderRadius:7, border:"1px solid var(--amber-edge)", background:"var(--amber-pale)", color:"var(--amber)", cursor:"pointer" }}>
              Auto-redistribute rounds
            </button>
            <button style={{ fontSize:12, padding:"6px 10px", borderRadius:7, border:"1px solid var(--hair)", background:"var(--surface)", color:"var(--ink-soft)", cursor:"pointer" }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Filter banner */}
      {filter !== "all" && (
        <div style={{ background:"var(--surface-alt)", border:"1px solid var(--hair)", borderRadius:8, padding:"8px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12, color:"var(--muted)" }}>
          <span>Showing {filter==="active"?"active":"absent"} angels only</span>
          <button onClick={()=>setFilter("all")} style={{ fontSize:11, padding:"4px 10px", borderRadius:6, border:"1px solid var(--hair-strong)", background:"var(--surface)", color:"var(--ink-soft)", cursor:"pointer" }}>
            Clear filter ×
          </button>
        </div>
      )}

      {/* List header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <p style={{ fontSize:10, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.07em" }}>
          {filter==="active"?"Active Angels":filter==="absent"?"Absent Angels":"All Angels"}
        </p>
        <button style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:500, padding:"7px 14px", border:"none", borderRadius:8, background:"var(--blue)", color:"#fff", cursor:"pointer", boxShadow:"var(--shadow-sm)" }}>
          <Plus size={13}/> Add Angel
        </button>
      </div>

      {/* Angel list */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:12, boxShadow:"var(--shadow-sm)", overflow:"hidden" }}>
        {displayed.length===0 ? (
          <div style={{ padding:"24px", textAlign:"center", fontSize:13, color:"var(--muted)" }}>No angels match this filter</div>
        ) : displayed.map((angel, i) => (
          <div key={angel.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 18px", borderTop: i>0?"1px solid var(--hair-soft)":undefined }}>
            {/* Avatar */}
            <div style={{ width:32, height:32, borderRadius:"50%", background: angel.absent?"var(--surface-sun)":"var(--blue-tint)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color: angel.absent?"var(--muted)":"var(--blue)", flexShrink:0 }}>
              {ini(angel.name)}
            </div>

            {/* Info */}
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:13, fontWeight:500, color:"var(--ink)" }}>{angel.name}</span>
                {angel.absent && (
                  <span style={{ fontSize:10, fontWeight:600, padding:"1px 7px", borderRadius:999, background:"var(--amber-tint)", color:"var(--amber)" }}>ABSENT</span>
                )}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
                <span style={{ fontSize:10, fontWeight:500, padding:"2px 7px", borderRadius:8, background:"var(--plum-tint)", color:"var(--plum)" }}>{angel.dept}</span>
                <span style={{ fontSize:11, color:"var(--muted)" }}>{angel.residents} resident{angel.residents!==1?"s":""}</span>
              </div>
            </div>

            {/* Status badge */}
            <span style={{ fontSize:10, fontWeight:600, padding:"2px 9px", borderRadius:999, background: angel.absent?"var(--amber-tint)":angel.rounds>0?"var(--green-tint)":"var(--surface-alt)", color: angel.absent?"var(--amber)":angel.rounds>0?"var(--green)":"var(--muted)" }}>
              {angel.absent?"Absent":angel.rounds>0?"Active":"No activity"}
            </span>

            {/* Actions */}
            {angel.absent ? (
              <button onClick={()=>setAngels(prev=>prev.map(x=>x.id===angel.id?{...x,absent:false}:x))} style={{ fontSize:12, fontWeight:500, padding:"5px 11px", border:"1px solid var(--amber-edge)", borderRadius:7, background:"var(--amber-pale)", color:"var(--amber)", cursor:"pointer" }}>
                Redistribute
              </button>
            ) : null}
            <button style={{ fontSize:12, fontWeight:500, padding:"5px 11px", border:"1px solid var(--hair-strong)", borderRadius:7, background:"var(--surface-alt)", color:"var(--ink-soft)", cursor:"pointer" }}>
              Residents
            </button>
            {angel.absent ? (
              <button onClick={()=>returnToDuty(angel.id)} style={{ fontSize:12, fontWeight:500, padding:"5px 11px", border:"1px solid var(--green-edge)", borderRadius:7, background:"var(--green-tint)", color:"var(--green)", cursor:"pointer" }}>
                Return to Duty
              </button>
            ) : (
              <button onClick={()=>setAbsentModal(angel)} style={{ fontSize:12, fontWeight:500, padding:"5px 11px", border:"1px solid var(--hair-strong)", borderRadius:7, background:"var(--surface-alt)", color:"var(--ink-soft)", cursor:"pointer" }}>
                Mark Absent
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Mark Absent modal */}
      {absentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(7,43,82,0.35)" }}>
          <div style={{ background:"var(--surface)", borderRadius:16, width:"100%", maxWidth:440, margin:"0 16px", boxShadow:"var(--shadow-xl)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px 16px", borderBottom:"1px solid var(--hair)" }}>
              <h2 style={{ fontFamily:"var(--font-display)", fontSize:17, fontWeight:500 }}>Mark Angel Absent</h2>
              <button onClick={()=>setAbsentModal(null)} style={{ background:"none", border:"none", cursor:"pointer" }}>
                <X size={18} color="var(--muted)"/>
              </button>
            </div>
            <div style={{ padding:"16px 24px 20px", display:"flex", flexDirection:"column", gap:12 }}>
              <p style={{ fontSize:13, color:"var(--ink-soft)" }}>
                Marking <strong>{absentModal.name}</strong> absent will unassign their <strong>{absentModal.residents} residents</strong>. You can redistribute them to available angels.
              </p>
              <div style={{ borderRadius:8, padding:"10px 12px", background:"var(--amber-tint)", border:"1px solid var(--amber-edge)" }}>
                <p style={{ fontSize:12, color:"var(--amber)" }}>
                  {absentModal.residents} residents will show as <strong>Unassigned</strong> until redistributed or the angel returns.
                </p>
              </div>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:12, color:"var(--ink-soft)" }}>
                <input type="checkbox" checked={redistribute} onChange={e=>setRedistribute(e.target.checked)} style={{ accentColor:"var(--blue)", width:14, height:14 }}/>
                Auto-redistribute residents to available angels
              </label>
            </div>
            <div style={{ display:"flex", gap:8, padding:"0 24px 20px" }}>
              <button onClick={()=>setAbsentModal(null)} style={{ flex:1, padding:"9px", borderRadius:8, fontSize:13, fontWeight:500, border:"1px solid var(--hair-strong)", background:"var(--surface-alt)", color:"var(--ink-soft)", cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={()=>markAbsent(absentModal)} style={{ flex:1, padding:"9px", borderRadius:8, fontSize:13, fontWeight:500, border:"none", background:"var(--amber)", color:"#fff", cursor:"pointer" }}>
                Confirm Absent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
