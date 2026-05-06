"use client";
import { useState } from "react";
import { Search, RefreshCw } from "lucide-react";

type Resident = { id:number; name:string; room:string; bed:string; angel:string|null; status:string };

const allResidents: Resident[] = [
  {id:1,  name:"Eleanor Voss",    room:"101", bed:"A", angel:"Maria Rodriguez",  status:"active"},
  {id:2,  name:"Harold Simmons",  room:"101", bed:"B", angel:"Maria Rodriguez",  status:"active"},
  {id:3,  name:"Dorothy Crane",   room:"102", bed:"A", angel:"James Thompson",   status:"active"},
  {id:4,  name:"Robert Finley",   room:"102", bed:"B", angel:"James Thompson",   status:"active"},
  {id:5,  name:"Agnes Whitfield", room:"103", bed:"A", angel:null,               status:"active"},
  {id:6,  name:"Frank Deluca",    room:"103", bed:"B", angel:null,               status:"active"},
  {id:7,  name:"Mildred Oakes",   room:"104", bed:"A", angel:"David Martinez",   status:"active"},
  {id:8,  name:"George Stanton",  room:"104", bed:"B", angel:"David Martinez",   status:"active"},
  {id:9,  name:"Beatrice Holt",   room:"105", bed:"A", angel:"Linda Patterson",  status:"active"},
  {id:10, name:"Walter Pruett",   room:"105", bed:"B", angel:"Linda Patterson",  status:"active"},
];

const angelNames = ["Maria Rodriguez","James Thompson","David Martinez","Linda Patterson"];

type ResFilter = "all"|"assigned"|"unassigned";

export default function ResidentsPage() {
  const [search, setSearch] = useState("");
  const [resFilter, setResFilter] = useState<ResFilter>("all");
  const [angelFilter, setAngelFilter] = useState<string|null>(null);

  const assigned   = allResidents.filter(r => r.angel !== null);
  const unassigned = allResidents.filter(r => r.angel === null);

  let displayed = allResidents;
  if (resFilter === "assigned")   displayed = assigned;
  if (resFilter === "unassigned") displayed = unassigned;
  if (angelFilter) displayed = displayed.filter(r => r.angel === angelFilter);
  if (search) displayed = displayed.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) || r.room.includes(search)
  );

  const kpiCards = [
    {id:"all" as ResFilter,        label:"Active Residents", value:allResidents.length, color:"var(--ink)"},
    {id:"assigned" as ResFilter,   label:"Assigned",         value:assigned.length,     color:"var(--green)"},
    {id:"unassigned" as ResFilter, label:"Unassigned",       value:unassigned.length,   color:"var(--amber)"},
  ];

  return (
    <div className="max-w-[1100px] mx-auto" style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* KPI filter cards + PCC status */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {kpiCards.map(k => {
          const active = resFilter === k.id;
          return (
            <div key={k.label} onClick={()=>setResFilter(k.id)} style={{ background: active?"var(--blue-tint)":"var(--surface)", border:`1px solid ${active?"var(--blue)":"var(--hair)"}`, borderRadius:10, padding:"12px 14px", cursor:"pointer", transition:"all 0.15s", boxShadow:"var(--shadow-sm)" }}>
              <div style={{ fontSize:24, fontWeight:600, color: active?"var(--blue-deep)":k.color, lineHeight:1, fontFamily:"var(--font-mono)" }}>{k.value}</div>
              <div style={{ fontSize:10, color: active?"var(--blue)":"var(--muted)", marginTop:4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em" }}>{k.label}</div>
            </div>
          );
        })}
        {/* PCC status card */}
        <div style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:10, padding:"12px 14px", boxShadow:"var(--shadow-sm)" }}>
          <div style={{ fontSize:14, fontWeight:600, color:"var(--blue)", lineHeight:1, fontFamily:"var(--font-mono)" }}>PCC</div>
          <div style={{ fontSize:10, color:"var(--muted)", marginTop:4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em" }}>Census Source</div>
          <div style={{ fontSize:10, color:"var(--green)", marginTop:4, fontWeight:600 }}>● Connected</div>
        </div>
      </div>

      {/* Filter banner */}
      {resFilter !== "all" && (
        <div style={{ background:"var(--surface-alt)", border:"1px solid var(--hair)", borderRadius:8, padding:"8px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12, color:"var(--muted)" }}>
          <span>Showing {resFilter} residents only</span>
          <button onClick={()=>{setResFilter("all");setAngelFilter(null);}} style={{ fontSize:11, padding:"4px 10px", borderRadius:6, border:"1px solid var(--hair-strong)", background:"var(--surface)", color:"var(--ink-soft)", cursor:"pointer" }}>
            Clear filter ×
          </button>
        </div>
      )}

      {/* Unassigned banner */}
      {unassigned.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:10, borderRadius:10, padding:"10px 14px", background:"var(--amber-tint)", border:"1px solid var(--amber-edge)" }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6.5" stroke="var(--amber)" strokeWidth="1.2"/><path d="M7.5 4.5v3.5M7.5 10v.5" stroke="var(--amber)" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <p style={{ fontSize:12, color:"var(--amber)", flex:1 }}>
            <strong>{unassigned.length} residents unassigned</strong> — Sandra Kim is absent. Rooms 103A &amp; 103B need an angel assigned.
          </p>
          <button style={{ fontSize:12, fontWeight:500, color:"var(--amber)", background:"none", border:"none", cursor:"pointer", whiteSpace:"nowrap" }}>
            Redistribute →
          </button>
        </div>
      )}

      {/* Filter + action row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        {/* Angel filter pills */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          <button onClick={()=>setAngelFilter(null)} style={{ fontSize:11, fontWeight:500, padding:"5px 12px", borderRadius:20, cursor:"pointer", transition:"all 0.15s", border:`1px solid ${angelFilter===null?"var(--blue)":"var(--hair-strong)"}`, background: angelFilter===null?"var(--blue-tint)":"var(--surface)", color: angelFilter===null?"var(--blue)":"var(--muted)" }}>
            All Angels
          </button>
          {angelNames.map(a => (
            <button key={a} onClick={()=>setAngelFilter(angelFilter===a?null:a)} style={{ fontSize:11, fontWeight:500, padding:"5px 12px", borderRadius:20, cursor:"pointer", transition:"all 0.15s", border:`1px solid ${angelFilter===a?"var(--blue)":"var(--hair-strong)"}`, background: angelFilter===a?"var(--blue-tint)":"var(--surface)", color: angelFilter===a?"var(--blue)":"var(--muted)" }}>
              {a.split(" ")[0]} {a.split(" ")[1][0]}.
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={{ fontSize:12, fontWeight:500, padding:"6px 13px", border:"1px solid var(--green-edge)", borderRadius:7, background:"var(--green-tint)", color:"var(--green)", cursor:"pointer" }}>
            Auto-assign all
          </button>
          <button style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, padding:"6px 13px", border:"1px solid var(--hair)", borderRadius:7, background:"var(--surface)", color:"var(--ink-soft)", cursor:"pointer", boxShadow:"var(--shadow-sm)" }}>
            <RefreshCw size={12} color="var(--muted)"/> Sync from PCC
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"0 12px", background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:8, boxShadow:"var(--shadow-xs)" }}>
        <Search size={14} color="var(--faint)"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or room…" style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:13, color:"var(--ink)", padding:"9px 0" }}/>
      </div>

      {/* Table */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:12, boxShadow:"var(--shadow-sm)", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--surface-alt)", borderBottom:"1px solid var(--hair)" }}>
              {["Room","Bed","Resident Name","Assigned Angel","Status"].map(h => (
                <th key={h} className="section-label" style={{ textAlign:"left", padding:"10px 18px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((r, i) => (
              <tr key={r.id} style={{ borderTop: i>0?"1px solid var(--hair-soft)":undefined }}>
                <td style={{ padding:"10px 18px" }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontWeight:500, color:"var(--blue)", fontSize:12 }}>{r.room}</span>
                </td>
                <td style={{ padding:"10px 18px", color:"var(--muted)", fontFamily:"var(--font-mono)", fontSize:12 }}>{r.bed}</td>
                <td style={{ padding:"10px 18px", fontWeight:500, color:"var(--ink)" }}>{r.name}</td>
                <td style={{ padding:"10px 18px" }}>
                  {r.angel ? (
                    <span style={{ fontSize:11.5, fontWeight:500, padding:"3px 9px", borderRadius:999, background:"var(--blue-tint)", color:"var(--blue)" }}>{r.angel}</span>
                  ) : (
                    <span style={{ fontSize:11.5, fontWeight:500, padding:"3px 9px", borderRadius:999, background:"var(--amber-tint)", color:"var(--amber)" }}>Unassigned</span>
                  )}
                </td>
                <td style={{ padding:"10px 18px" }}>
                  <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:999, background:"var(--green-tint)", color:"var(--green)" }}>Active</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding:"10px 18px", borderTop:"1px solid var(--hair)", background:"var(--surface-alt)" }}>
          <p style={{ fontSize:11.5, color:"var(--muted)" }}>{displayed.length} of {allResidents.length} residents</p>
        </div>
      </div>
    </div>
  );
}
