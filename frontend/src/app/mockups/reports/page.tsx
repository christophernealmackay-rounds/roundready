"use client";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Download, Filter, ChevronDown, Search, FileText } from "lucide-react";

const reportData = [
  { qapi:"Fall Prevention",     compliance:92, issues:3,  rounds:48 },
  { qapi:"Pressure Injury",     compliance:88, issues:7,  rounds:48 },
  { qapi:"Hydration/Nutrition", compliance:79, issues:12, rounds:48 },
  { qapi:"Skin Integrity",      compliance:91, issues:4,  rounds:48 },
  { qapi:"Catheter Care",       compliance:84, issues:6,  rounds:48 },
];

const drilldown = [
  { question:"Is the call light within reach?",          yes:46, no:2, issues:2 },
  { question:"Are bed rails in proper position?",        yes:48, no:0, issues:0 },
  { question:"Is the floor free of fall hazards?",       yes:45, no:3, issues:1 },
  { question:"Are non-slip footwear accessible?",        yes:44, no:4, issues:4 },
  { question:"Is fall risk assessment current?",         yes:47, no:1, issues:1 },
];

const allResidents = ["Eleanor Voss","Harold Simmons","Dorothy Crane","Robert Finley","Agnes Whitfield","Frank Deluca","Mildred Oakes","George Stanton","Beatrice Holt","Walter Pruett"];

const previousReports = [
  { name:"April 2026 — all residents", generated:"May 1", rounds:1180, rate:"84%", issues:38 },
  { name:"March 2026 — all residents", generated:"Apr 1", rounds:1286, rate:"91%", issues:9 },
  { name:"Jan 19–31, 2026 — Voss, Bingham, Crane (surveyor prep)", generated:"Feb 1", rounds:186, rate:"95%", issues:2 },
  { name:"January 2026 — all residents", generated:"Feb 1", rounds:1240, rate:"88%", issues:11 },
];

type DateRange = "month"|"30"|"7"|"yesterday"|"custom";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [selectedQapi, setSelectedQapi] = useState("All QAPIs");
  const [selectedResidents, setSelectedResidents] = useState<Set<string>>(new Set(allResidents));
  const [ddOpen, setDdOpen] = useState(false);
  const [ddSearch, setDdSearch] = useState("");

  const filteredRes = allResidents.filter(r => r.toLowerCase().includes(ddSearch.toLowerCase()));
  const allSelected = selectedResidents.size === allResidents.length;

  function toggleResident(name: string) {
    setSelectedResidents(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  const dateRangePills: {id:DateRange; label:string}[] = [
    {id:"month",     label:"This month"},
    {id:"30",        label:"Last 30 days"},
    {id:"7",         label:"Last 7 days"},
    {id:"yesterday", label:"Yesterday"},
    {id:"custom",    label:"Custom range"},
  ];

  const previewKpis = [
    {label:"Completed", value:"1,180", color:"var(--ink)"},
    {label:"Rate",      value:"84%",   color:"var(--blue)"},
    {label:"Issues",    value:"32",    color:"var(--red)"},
    {label:"Resolved",  value:"28",    color:"var(--green)"},
    {label:"Missed",    value:"52",    color:"var(--amber)"},
  ];

  return (
    <div className="max-w-[1200px] mx-auto" style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:500, color:"var(--ink)" }}>Reports</h1>
          <p style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>Generate and export compliance reports</p>
        </div>
      </div>

      {/* Report builder card */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:12, padding:"18px 20px", boxShadow:"var(--shadow-sm)" }}>
        <div style={{ fontSize:14, fontWeight:600, color:"var(--ink)", marginBottom:16 }}>Generate compliance report</div>

        {/* QAPI template selector */}
        <div style={{ marginBottom:14 }}>
          <p className="section-label" style={{ marginBottom:8 }}>QAPI Template</p>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <select value={selectedQapi} onChange={e=>setSelectedQapi(e.target.value)} style={{ flex:1, minWidth:220, padding:"8px 10px", border:"1px solid var(--hair)", borderRadius:8, fontSize:12, background:"var(--surface-alt)", color:"var(--ink)", outline:"none", cursor:"pointer" }}>
              <option>Active — Fall Prevention &amp; Resident Safety</option>
              <option>Archived — Pressure Injury Prevention</option>
              <option>Archived — Hydration &amp; Nutrition Monitoring</option>
            </select>
            <span style={{ fontSize:11, color:"var(--muted)" }}>8 questions · Started Apr 1, 2026</span>
          </div>
        </div>

        {/* Resident multi-select */}
        <div style={{ marginBottom:14 }}>
          <p className="section-label" style={{ marginBottom:8 }}>Residents</p>
          <div style={{ position:"relative" }}>
            <div onClick={()=>setDdOpen(!ddOpen)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", border:`1px solid ${ddOpen?"var(--blue)":"var(--hair)"}`, borderRadius: ddOpen?"8px 8px 0 0":"8px", background:"var(--surface-alt)", color:"var(--ink)", cursor:"pointer", fontSize:12 }}>
              <span>{allSelected ? `All ${allResidents.length} residents selected` : `${selectedResidents.size} of ${allResidents.length} selected`}</span>
              <ChevronDown size={13} color="var(--muted)"/>
            </div>
            {ddOpen && (
              <div style={{ border:`1px solid var(--blue)`, borderTop:"none", borderRadius:"0 0 8px 8px", background:"var(--surface)", zIndex:50, position:"relative" }}>
                <div style={{ padding:"0 12px", borderBottom:"1px solid var(--hair-soft)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 0" }}>
                    <Search size={12} color="var(--faint)"/>
                    <input value={ddSearch} onChange={e=>setDdSearch(e.target.value)} placeholder="Search residents…" style={{ flex:1, border:"none", outline:"none", fontSize:12, background:"transparent", color:"var(--ink)" }}/>
                  </div>
                </div>
                <div style={{ maxHeight:200, overflowY:"auto" }}>
                  {filteredRes.map(r => (
                    <label key={r} style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 12px", borderBottom:"1px solid var(--hair-soft)", cursor:"pointer", fontSize:12, color:"var(--ink)" }}>
                      <input type="checkbox" checked={selectedResidents.has(r)} onChange={()=>toggleResident(r)} style={{ accentColor:"var(--blue)", width:13, height:13 }}/>
                      {r}
                    </label>
                  ))}
                </div>
                <div style={{ display:"flex", gap:8, padding:"8px 12px", borderTop:"1px solid var(--hair)", background:"var(--surface-alt)" }}>
                  <button onClick={()=>setSelectedResidents(new Set(allResidents))} style={{ fontSize:11, padding:"4px 10px", borderRadius:6, border:"1px solid var(--hair-strong)", background:"var(--surface)", color:"var(--ink-soft)", cursor:"pointer" }}>Select all</button>
                  <button onClick={()=>setSelectedResidents(new Set())} style={{ fontSize:11, padding:"4px 10px", borderRadius:6, border:"1px solid var(--hair-strong)", background:"var(--surface)", color:"var(--ink-soft)", cursor:"pointer" }}>Clear all</button>
                  <span style={{ fontSize:11, color:"var(--muted)", padding:"4px 0", flex:1, textAlign:"right" }}>{selectedResidents.size} selected</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Date range pills */}
        <div style={{ marginBottom:14 }}>
          <p className="section-label" style={{ marginBottom:8 }}>Date Range</p>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom: dateRange==="custom"?10:0 }}>
            {dateRangePills.map(p => (
              <button key={p.id} onClick={()=>setDateRange(p.id)} style={{
                fontSize:11, fontWeight:500, padding:"5px 13px", borderRadius:20, cursor:"pointer", transition:"all 0.15s",
                border:`1px solid ${dateRange===p.id?"var(--blue)":"var(--hair-strong)"}`,
                background: dateRange===p.id?"var(--blue-tint)":"var(--surface-alt)",
                color: dateRange===p.id?"var(--blue)":"var(--muted)",
              }}>
                {p.label}
              </button>
            ))}
          </div>
          {dateRange==="custom" && (
            <div style={{ display:"flex", gap:12, alignItems:"center", marginTop:10, flexWrap:"wrap" }}>
              <div><div style={{ fontSize:10, color:"var(--muted)", marginBottom:3 }}>From</div><input type="date" style={{ padding:"7px 10px", border:"1px solid var(--hair)", borderRadius:8, fontSize:12, background:"var(--surface-alt)", color:"var(--ink)", outline:"none", width:150 }}/></div>
              <span style={{ color:"var(--muted)", fontSize:18, paddingTop:16 }}>→</span>
              <div><div style={{ fontSize:10, color:"var(--muted)", marginBottom:3 }}>To</div><input type="date" style={{ padding:"7px 10px", border:"1px solid var(--hair)", borderRadius:8, fontSize:12, background:"var(--surface-alt)", color:"var(--ink)", outline:"none", width:150 }}/></div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div style={{ background:"var(--surface-alt)", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
          <div style={{ fontSize:11, color:"var(--muted)", marginBottom:10 }}>Preview — {dateRange==="month"?"May 2026":dateRange==="30"?"Last 30 days":dateRange==="7"?"Last 7 days":dateRange==="yesterday"?"Yesterday":"Custom range"}</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:20 }}>
            {previewKpis.map(k => (
              <div key={k.label}>
                <div style={{ fontSize:22, fontWeight:600, color:k.color, fontFamily:"var(--font-mono)" }}>{k.value}</div>
                <div style={{ fontSize:11, color:"var(--muted)" }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Export buttons */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:500, padding:"8px 18px", border:"none", borderRadius:8, background:"var(--blue)", color:"#fff", cursor:"pointer" }}>
            <FileText size={13}/> Export PDF report
          </button>
          <button style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:500, padding:"8px 14px", border:"1px solid var(--hair-strong)", borderRadius:8, background:"var(--surface-alt)", color:"var(--ink-soft)", cursor:"pointer" }}>
            <Download size={13}/> Export CSV
          </button>
          <button style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:500, padding:"8px 14px", border:"1px solid var(--hair-strong)", borderRadius:8, background:"var(--surface-alt)", color:"var(--ink-soft)", cursor:"pointer" }}>
            Export audit log
          </button>
        </div>
      </div>

      {/* Chart + table split */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 3fr", gap:14 }}>
        <div style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:12, padding:"16px 18px", boxShadow:"var(--shadow-sm)" }}>
          <p className="section-label" style={{ marginBottom:14 }}>Compliance by QAPI</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={reportData} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hair)" horizontal={false}/>
              <XAxis type="number" domain={[0,100]} unit="%" tick={{fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="qapi" tick={{fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false} width={120}/>
              <Tooltip contentStyle={{background:"var(--surface)",border:"1px solid var(--hair)",borderRadius:8,fontSize:11}} formatter={(v)=>[`${v}%`,"Compliance"]}/>
              <Bar dataKey="compliance" fill="var(--blue)" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:12, overflow:"hidden", boxShadow:"var(--shadow-sm)" }}>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--hair)" }}>
            <p className="section-label">QAPI Summary</p>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"var(--surface-alt)", borderBottom:"1px solid var(--hair)" }}>
                {["QAPI","Rounds","Compliance","Issues",""].map(h=>(
                  <th key={h} className="section-label" style={{ textAlign:"left", padding:"9px 16px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.map((row,i)=>(
                <tr key={row.qapi} style={{ borderTop:i>0?"1px solid var(--hair-soft)":undefined }}>
                  <td style={{ padding:"10px 16px", fontWeight:500, color:"var(--ink)", fontSize:12 }}>{row.qapi}</td>
                  <td style={{ padding:"10px 16px", fontFamily:"var(--font-mono)", fontSize:12, color:"var(--ink-soft)" }}>{row.rounds}</td>
                  <td style={{ padding:"10px 16px" }}>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:13, fontWeight:600, color: row.compliance>=90?"var(--green)":row.compliance>=80?"var(--amber)":"var(--red)" }}>{row.compliance}%</span>
                  </td>
                  <td style={{ padding:"10px 16px" }}>
                    {row.issues>0 ? <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:999, background:"var(--red-tint)", color:"var(--red)" }}>{row.issues} issues</span> : <span style={{ fontSize:11, color:"var(--faint)" }}>None</span>}
                  </td>
                  <td style={{ padding:"10px 16px" }}>
                    <button style={{ fontSize:12, fontWeight:500, color:"var(--blue)", background:"none", border:"none", cursor:"pointer" }}>Detail →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Question drilldown */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:12, overflow:"hidden", boxShadow:"var(--shadow-sm)" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--hair)" }}>
          <p className="section-label">Question Drilldown — Fall Prevention</p>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--surface-alt)", borderBottom:"1px solid var(--hair)" }}>
              {["Question","Yes","No","Compliance","Issues"].map(h=>(
                <th key={h} className="section-label" style={{ textAlign:"left", padding:"9px 18px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drilldown.map((row,i)=>(
              <tr key={row.question} style={{ borderTop:i>0?"1px solid var(--hair-soft)":undefined }}>
                <td style={{ padding:"10px 18px", color:"var(--ink-soft)", maxWidth:300, fontSize:12 }}>{row.question}</td>
                <td style={{ padding:"10px 18px", fontFamily:"var(--font-mono)", fontSize:12, color:"var(--green)" }}>{row.yes}</td>
                <td style={{ padding:"10px 18px", fontFamily:"var(--font-mono)", fontSize:12, color: row.no>0?"var(--red)":"var(--faint)" }}>{row.no}</td>
                <td style={{ padding:"10px 18px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:60, height:6, borderRadius:999, background:"var(--hair)", overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${Math.round(row.yes/(row.yes+row.no)*100)}%`, background:"var(--blue)", borderRadius:999 }}/>
                    </div>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:11.5 }}>{Math.round(row.yes/(row.yes+row.no)*100)}%</span>
                  </div>
                </td>
                <td style={{ padding:"10px 18px", fontFamily:"var(--font-mono)", fontSize:12, color: row.issues>0?"var(--red)":"var(--faint)" }}>{row.issues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Previously generated reports */}
      <div>
        <p className="section-label" style={{ marginBottom:10 }}>Previously Generated Reports</p>
        <div style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:12, overflow:"hidden", boxShadow:"var(--shadow-sm)" }}>
          {previousReports.map((r,i)=>(
            <div key={r.name} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 18px", borderTop: i>0?"1px solid var(--hair-soft)":undefined }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"var(--blue-tint)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <FileText size={15} color="var(--blue)"/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500, color:"var(--ink)" }}>{r.name}</div>
                <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>Generated {r.generated} · {r.rounds.toLocaleString()} rounds · {r.rate} completion · {r.issues} issues</div>
              </div>
              <button style={{ fontSize:12, fontWeight:500, padding:"5px 13px", border:"1px solid var(--hair-strong)", borderRadius:7, background:"var(--surface-alt)", color:"var(--ink-soft)", cursor:"pointer", whiteSpace:"nowrap" }}>
                Download PDF
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:10, background:"var(--surface)", border:"1px solid var(--hair)", boxShadow:"var(--shadow-xs)", flexWrap:"wrap" }}>
        <Filter size={13} color="var(--muted)"/>
        {[
          {label:"QAPI", value:"All QAPIs"},
          {label:"Angel", value:"All Angels"},
        ].map(f=>(
          <div key={f.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ fontSize:10, color:"var(--muted)", fontWeight:600, letterSpacing:"0.04em", textTransform:"uppercase" }}>{f.label}:</span>
            <select style={{ fontSize:12, fontWeight:500, color:"var(--ink-soft)", background:"var(--surface-alt)", border:"1px solid var(--hair)", borderRadius:6, padding:"4px 8px", cursor:"pointer", outline:"none" }}>
              <option>{f.value}</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
