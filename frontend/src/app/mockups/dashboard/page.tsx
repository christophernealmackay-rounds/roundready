"use client";
import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { AlertCircle } from "lucide-react";

const weekData   = [{ d:"Mon",rate:91,raised:1,resolved:1},{d:"Tue",rate:88,raised:2,resolved:2},{d:"Wed",rate:94,raised:1,resolved:1},{d:"Thu",rate:76,raised:3,resolved:0},{d:"Fri",rate:89,raised:2,resolved:2}];
const todayData  = [{ d:"6a",rate:62,raised:0,resolved:0},{d:"7a",rate:74,raised:1,resolved:0},{d:"8a",rate:82,raised:1,resolved:1},{d:"9a",rate:79,raised:0,resolved:0},{d:"10a",rate:86,raised:2,resolved:0},{d:"11a",rate:76,raised:0,resolved:0}];
const monthData  = [{ d:"W1",rate:84,raised:4,resolved:4},{d:"W2",rate:89,raised:3,resolved:3},{d:"W3",rate:91,raised:3,resolved:3},{d:"W4",rate:86,raised:2,resolved:0}];
const hourlyData = [{h:"6a",n:3},{h:"7a",n:11},{h:"8a",n:14},{h:"9a",n:10},{h:"10a",n:7},{h:"11a",n:4},{h:"12p",n:2}];

const angelRows = [
  {name:"Maria R.",rounds:6,total:8},
  {name:"James T.",rounds:5,total:7},
  {name:"David M.",rounds:8,total:8},
  {name:"Linda P.",rounds:7,total:6},
];

const openIssues = [
  {id:"f1",resident:"Harold Bingham",room:"100B",angel:"Marcus T.",issue:"Pain score 8/10 — resident verbalized severe discomfort in left hip"},
  {id:"f2",resident:"Dorothy Ashford",room:"102A",angel:"Sarah K.",issue:"Call light found on floor — resident unable to reach for ~45 minutes"},
  {id:"f3",resident:"Chester Dunbar",room:"104B",angel:"Linda R.",issue:"Resident observed without non-slip footwear while ambulating"},
];

type Range = "today"|"week"|"month";
const kpis: Record<Range,{completed:number;rate:string;open:number;resolved:number;census:number}> = {
  today:{completed:38,rate:"76%",open:3,resolved:1,census:50},
  week: {completed:274,rate:"88%",open:3,resolved:7,census:50},
  month:{completed:1042,rate:"86%",open:3,resolved:28,census:50},
};
const chartDataMap: Record<Range,typeof weekData> = {
  today:todayData, week:weekData, month:monthData,
};
const rangeLbl: Record<Range,string> = {
  today:"Today by hour", week:"This week", month:"This month",
};

function ini(n:string){return n.split(" ").map(p=>p[0]).join("")}

export default function DashboardPage() {
  const [range, setRange] = useState<Range>("week");
  const kpi = kpis[range];
  const chartData = chartDataMap[range];

  return (
    <div className="max-w-[1240px] mx-auto" style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* Header row: pills + export */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", gap:6 }}>
          {(["today","week","month"] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              fontSize:12, fontWeight:500, padding:"5px 14px", borderRadius:20, cursor:"pointer", transition:"all 0.15s",
              border:`1px solid ${range===r?"var(--blue)":"var(--hair-strong)"}`,
              background: range===r?"var(--blue-tint)":"var(--surface)",
              color: range===r?"var(--blue)":"var(--muted)",
            }}>
              {r==="today"?"Today":r==="week"?"This week":"This month"}
            </button>
          ))}
        </div>
        <button style={{ fontSize:12, fontWeight:500, padding:"7px 16px", borderRadius:8, border:"none", background:"var(--blue)", color:"#fff", cursor:"pointer" }}>
          Export compliance report
        </button>
      </div>

      {/* Active QAPI template banner */}
      <div style={{ background:"var(--blue-tint)", border:"1px solid var(--blue-pale)", borderRadius:10, padding:"11px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
        <div>
          <p style={{ fontSize:11, fontWeight:600, color:"var(--blue-mid)", marginBottom:2 }}>Active QAPI Template</p>
          <p style={{ fontSize:14, fontWeight:600, color:"var(--blue-deep)" }}>Fall Prevention &amp; Resident Safety</p>
          <p style={{ fontSize:11, color:"var(--blue)", marginTop:2 }}>8 questions · Started Apr 1, 2026</p>
        </div>
        <button style={{ fontSize:12, padding:"6px 13px", borderRadius:7, border:"1px solid var(--hair-strong)", background:"var(--surface)", color:"var(--ink-soft)", cursor:"pointer", whiteSpace:"nowrap", fontWeight:500 }}>
          Manage template
        </button>
      </div>

      {/* 5 KPI cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
        {[
          {label:"Rounds Completed", value:String(kpi.completed), color:"var(--ink)"},
          {label:"Completion Rate",  value:kpi.rate,              color:"var(--blue)"},
          {label:"Open Issues",      value:String(kpi.open),      color:"var(--red)"},
          {label:"Resolved Today",   value:String(kpi.resolved),  color:"var(--green)"},
          {label:"Active Residents", value:String(kpi.census),    color:"var(--blue)"},
        ].map(k => (
          <div key={k.label} style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:10, padding:"12px 14px", cursor:"pointer", transition:"all 0.15s", boxShadow:"var(--shadow-sm)" }}>
            <div style={{ fontSize:24, fontWeight:600, color:k.color, lineHeight:1, fontFamily:"var(--font-mono)" }}>{k.value}</div>
            <div style={{ fontSize:10, color:"var(--muted)", marginTop:4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* 2-column layout */}
      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:12 }}>

        {/* LEFT */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* Completion rate — area chart */}
          <div style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:12, padding:"16px 18px", boxShadow:"var(--shadow-sm)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <p className="section-label">Daily completion rate (%)</p>
              <span style={{ fontSize:11, color:"var(--muted)" }}>{rangeLbl[range]}</span>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A5FA8" stopOpacity={0.14}/>
                    <stop offset="95%" stopColor="#1A5FA8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hair)" vertical={false}/>
                <XAxis dataKey="d" tick={{fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]} unit="%" tick={{fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"var(--surface)",border:"1px solid var(--hair)",borderRadius:8,fontSize:11}} formatter={(v) => [`${v}%`,"Rate"]}/>
                <Area type="monotone" dataKey="rate" stroke="#1A5FA8" strokeWidth={2} fill="url(#rGrad)" dot={{fill:"#1A5FA8",r:3,strokeWidth:0}}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Issues raised vs resolved */}
          <div style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:12, padding:"16px 18px", boxShadow:"var(--shadow-sm)" }}>
            <p className="section-label" style={{ marginBottom:12 }}>Issues raised vs resolved</p>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={chartData} barSize={12} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hair)" vertical={false}/>
                <XAxis dataKey="d" tick={{fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip contentStyle={{background:"var(--surface)",border:"1px solid var(--hair)",borderRadius:8,fontSize:11}}/>
                <Bar dataKey="raised"   name="Raised"   fill="#C53030" radius={[3,3,0,0]}/>
                <Bar dataKey="resolved" name="Resolved" fill="#3B6D11" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", gap:16, marginTop:8 }}>
              {[{c:"#C53030",l:"Raised"},{c:"#3B6D11",l:"Resolved"}].map(lg=>(
                <span key={lg.l} style={{ fontSize:11, color:"var(--muted)", display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background:lg.c }}/>
                  {lg.l}
                </span>
              ))}
            </div>
          </div>

          {/* Angel completion today */}
          <div style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:12, padding:"16px 18px", boxShadow:"var(--shadow-sm)" }}>
            <p className="section-label" style={{ marginBottom:10 }}>Angel completion today</p>
            {angelRows.map((a,i) => (
              <div key={a.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom: i<angelRows.length-1?"1px solid var(--hair-soft)":undefined }}>
                <div style={{ width:30, height:30, borderRadius:"50%", background:"var(--blue-tint)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"var(--blue)", flexShrink:0 }}>
                  {ini(a.name)}
                </div>
                <span style={{ flex:1, fontSize:13, color:"var(--ink)" }}>{a.name}</span>
                <div style={{ width:100, height:6, background:"var(--hair)", borderRadius:3 }}>
                  <div style={{ height:"100%", width:`${Math.round(a.rounds/a.total*100)}%`, background:"var(--blue)", borderRadius:3 }}/>
                </div>
                <span style={{ fontSize:12, color:"var(--blue)", fontFamily:"var(--font-mono)", minWidth:52, textAlign:"right" }}>{a.rounds} rounds</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* Open issues panel */}
          <div style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:12, padding:"16px 18px", boxShadow:"var(--shadow-sm)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <p className="section-label">Open issues</p>
              <span style={{ fontSize:11, color:"var(--red)", fontWeight:500 }}>{kpi.open} unresolved</span>
            </div>
            {openIssues.map((f,i) => (
              <div key={f.id} style={{ display:"flex", alignItems:"flex-start", gap:9, padding:"9px 0", borderBottom: i<openIssues.length-1?"1px solid var(--hair-soft)":undefined, cursor:"pointer" }}>
                <div style={{ width:26, height:26, borderRadius:7, background:"var(--red-tint)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                  <AlertCircle size={13} color="var(--red)"/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:"var(--ink)" }}>{f.resident} · Rm {f.room}</div>
                  <div style={{ fontSize:11, color:"var(--muted)", marginTop:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{f.issue}</div>
                </div>
              </div>
            ))}
            <button style={{ width:"100%", marginTop:10, fontSize:12, background:"var(--surface-alt)", border:"1px solid var(--hair)", borderRadius:7, padding:"7px", color:"var(--ink-soft)", cursor:"pointer", fontWeight:500 }}>
              View all issues →
            </button>
          </div>

          {/* Hourly completions */}
          <div style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:12, padding:"16px 18px", boxShadow:"var(--shadow-sm)" }}>
            <p className="section-label" style={{ marginBottom:12 }}>Completions by hour</p>
            <ResponsiveContainer width="100%" height={72}>
              <BarChart data={hourlyData} barSize={16}>
                <XAxis dataKey="h" tick={{fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"var(--surface)",border:"1px solid var(--hair)",borderRadius:8,fontSize:11}} formatter={(v)=>[v,"Completions"]}/>
                <Bar dataKey="n" fill="var(--blue)" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Census & capacity */}
          <div style={{ background:"var(--surface)", border:"1px solid var(--hair)", borderRadius:12, padding:"16px 18px", boxShadow:"var(--shadow-sm)" }}>
            <p className="section-label" style={{ marginBottom:10 }}>Census &amp; capacity</p>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
              <span style={{ fontSize:28, fontWeight:700, color:"var(--green)", fontFamily:"var(--font-mono)" }}>91%</span>
              <span style={{ fontSize:12, color:"var(--muted)" }}>50 of 55 beds</span>
            </div>
            <div style={{ height:10, background:"var(--hair)", borderRadius:5, overflow:"hidden", marginBottom:6 }}>
              <div style={{ height:"100%", width:"91%", background:"var(--green)", borderRadius:5 }}/>
            </div>
            <p style={{ fontSize:11, color:"var(--muted)", marginBottom:14 }}>Census is strong — above target</p>
            <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10, borderTop:"1px solid var(--hair-soft)" }}>
              {[{v:"48",l:"Assigned",c:"var(--green)"},{v:"2",l:"Unassigned",c:"var(--amber)"},{v:"5",l:"Available",c:"var(--faint)"}].map(b=>(
                <div key={b.l} style={{ textAlign:b.l==="Unassigned"?"center":b.l==="Available"?"right":undefined }}>
                  <div style={{ fontSize:18, fontWeight:600, color:b.c, fontFamily:"var(--font-mono)" }}>{b.v}</div>
                  <div style={{ fontSize:11, color:"var(--muted)" }}>{b.l}</div>
                </div>
              ))}
            </div>
            <button style={{ width:"100%", marginTop:12, fontSize:12, background:"var(--surface-alt)", border:"1px solid var(--hair)", borderRadius:7, padding:"7px", color:"var(--ink-soft)", cursor:"pointer", fontWeight:500 }}>
              Manage assignments →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
