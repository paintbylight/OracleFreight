import { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";


const RISK_COLORS = { critical:"#FF3B3B", high:"#FF8C00", medium:"#FFD600", low:"#00E676" };
const RISK_BG = { critical:"rgba(255,59,59,0.10)", high:"rgba(255,140,0,0.10)", medium:"rgba(255,214,0,0.10)", low:"rgba(0,230,118,0.10)" };
const CAT_ICONS = { Security:"🛡", Congestion:"⚓", Weather:"🌩", Regulatory:"📋", Operations:"⚙", Geopolitical:"🌐", Sanctions:"🚫", Infrastructure:"🏗", Highway:"🛣", Border:"🚧", Compliance:"📑" };
const MODE_ICON  = { sea:"🚢", air:"✈", road:"🚛" };
const MODE_LABEL = { sea:"Vessel", air:"Air Cargo", road:"Road Freight" };
const MODE_COLOR = { sea:"#00B4FF", air:"#A78BFA", road:"#34D399" };

const mockShipments = [
  { id:"SHP-2291", origin:"Shanghai, China",   destination:"Rotterdam, Netherlands", transit:["Singapore","Suez Canal"],          mode:"sea",  cargo:"Electronics"     },
  { id:"SHP-2290", origin:"Dubai, UAE",         destination:"London, UK",             transit:["Frankfurt, Germany"],              mode:"air",  cargo:"Pharmaceuticals"  },
  { id:"SHP-2289", origin:"Los Angeles, USA",   destination:"Toronto, Canada",        transit:["I-90 Chicago","Detroit-Windsor"],   mode:"road", cargo:"Automotive Parts" },
];

const riskDB = {
  "Suez Canal":            [{ type:"critical", category:"Security",   title:"Red Sea Corridor Threat",       detail:"Houthi militant activity in the Red Sea has caused major carriers to reroute via Cape of Good Hope. Expect 10–14 day delay and 15–20% freight cost surcharge." },
                            { type:"high",     category:"Congestion", title:"Canal Throughput Backlog",      detail:"Northbound convoy wait times averaging 38 hours due to reduced daily passages." }],
  "Singapore":             [{ type:"medium",   category:"Weather",    title:"Monsoon Season Active",         detail:"Southwest monsoon through September causing intermittent port delays of 6–12 hours. Berth availability reduced by 18%." },
                            { type:"low",      category:"Regulatory", title:"IMO Emission Controls",         detail:"MARPOL Annex VI enforcement tightened. Verify vessel compliance documentation prior to port entry." }],
  "Frankfurt, Germany":    [{ type:"low",      category:"Operations", title:"ATC Staffing Shortages",        detail:"Minor ground delays reported at FRA averaging 22 minutes. No material impact expected on cargo schedules." }],
  "Shanghai, China":       [{ type:"high",     category:"Regulatory", title:"Export Control Updates",        detail:"New dual-use technology export classifications effective Q3. Pre-shipment commodity classification review recommended." },
                            { type:"medium",   category:"Congestion", title:"Yangshan Port Berthing Delays", detail:"Container throughput at 94% capacity. Average vessel dwell time increased to 2.3 days." }],
  "Rotterdam, Netherlands":[{ type:"low",      category:"Operations", title:"Labour Agreement Renewal",      detail:"FNV dock workers in final contract negotiations. Low probability of action but monitor through end of month." }],
  "Dubai, UAE":            [{ type:"low",      category:"Regulatory", title:"Customs Pre-clearance Mandate", detail:"Dubai Customs now requires 24hr advance cargo manifests for all inbound air freight from high-risk origins." }],
  "London, UK":            [{ type:"medium",   category:"Regulatory", title:"Post-Brexit Import Controls",   detail:"Full SPS border checks now in effect. Agri-food shipments require valid Export Health Certificates." }],
  "Los Angeles, USA":      [{ type:"medium",   category:"Congestion", title:"Port Congestion — LA/LB",       detail:"Vessel queue at LA/LB port complex averaging 4.1 days. Schedule reliability at 58% for trans-Pacific services." }],
  "I-90 Chicago":          [{ type:"critical", category:"Highway",    title:"Multi-Vehicle Accident — I-90", detail:"Major accident near mile marker 148 eastbound blocking 3 lanes. Illinois DOT estimating 4–6 hour clearance time. Alternate routing via I-80 recommended." },
                            { type:"high",     category:"Weather",    title:"Winter Storm Warning Active",   detail:"NWS Winter Storm Warning in effect through 06:00 CST. Ice accumulation 0.3–0.5 inches expected on I-90 and I-94 corridors. Speed restrictions in place." }],
  "Detroit-Windsor":       [{ type:"high",     category:"Border",     title:"Ambassador Bridge — 3hr Wait",  detail:"CBSA reporting 3hr 20min commercial vehicle wait time at Ambassador Bridge. Blue Water Bridge currently showing 45min wait — recommended diversion." },
                            { type:"low",      category:"Compliance", title:"CBSA Pre-Arrival Review",       detail:"Automotive parts from US origin subject to CUSMA rules-of-origin verification. Ensure Form B3 documentation complete before border approach." }],
  "Toronto, Canada":       [{ type:"low",      category:"Weather",    title:"Lake-Effect Snow Advisory",     detail:"Environment Canada advisory for Toronto metro area. 5–10cm accumulation expected overnight. Minor delays at distribution centres possible." }],
};

function getRisks(s) { return [s.origin,...s.transit,s.destination].flatMap(p=>(riskDB[p]||[]).map(r=>({...r,location:p}))); }
function overallScore(risks) {
  if (!risks?.length) return "low";
  if (risks.some(r=>r.type==="critical")) return "critical";
  if (risks.some(r=>r.type==="high"))     return "high";
  if (risks.some(r=>r.type==="medium"))   return "medium";
  return "low";
}

// ── Freight Index Data ────────────────────────────────────────────────────────
function genW(base,vol,trend,n=12){ const p=[base]; for(let i=1;i<n;i++){ p.push(Math.max(50,+(p[i-1]+(Math.random()-0.48)*vol+trend).toFixed(2))); } return p; }

const SEA_LANES = [
  { id:"fbx01", name:"FBX01 — Global Composite",           index:"Freightos Baltic (FBX)",       current:2340,  unit:"$/40ft",  weeks:genW(2800,180,-40),  change:-16.4, trend:"falling", vsAvg:+8,  description:"Global composite container spot rate. Currently elevated above 12-month average due to ongoing Red Sea diversion surcharges adding distance and cost to Asia-Europe trades." },
  { id:"fbx11", name:"FBX11 — China/E.Asia → N.Europe",    index:"Freightos Baltic (FBX)",       current:3180,  unit:"$/40ft",  weeks:genW(3900,220,-60),  change:-18.5, trend:"falling", vsAvg:+22, description:"North Europe rates remain elevated on Red Sea rerouting premium. Carrier blank sailing programmes supporting floor rates. Expect gradual normalisation if security situation improves." },
  { id:"fbx13", name:"FBX13 — China/E.Asia → US West",     index:"Freightos Baltic (FBX)",       current:2760,  unit:"$/40ft",  weeks:genW(2400,160,30),   change:+14.8, trend:"rising",  vsAvg:+5,  description:"Eastbound transpacific rates have firmed on strong import demand ahead of inventory restocking season. Early peak season bookings driving premium over contract rates." },
  { id:"wci",   name:"WCI — Shanghai → Rotterdam",          index:"Drewry World Container Index", current:3420,  unit:"$/40ft",  weeks:genW(4100,240,-58),  change:-16.6, trend:"falling", vsAvg:+18, description:"Drewry WCI benchmark for the world's most traded container lane. Rate remains elevated vs. pre-Red Sea crisis levels. Drewry forecasts continued softening through Q2." },
  { id:"bdi",   name:"BDI — Baltic Dry Index",              index:"Baltic Exchange",              current:1840,  unit:"points",  weeks:genW(1600,120,18),   change:+12.2, trend:"rising",  vsAvg:-4,  description:"Bulk dry freight composite rising on increased iron ore and grain shipment volumes. Brazilian soybean export season and Australian iron ore shipments supporting Capesize rates." },
  { id:"scfi",  name:"SCFI — Shanghai Composite",           index:"SCFI",                         current:1620,  unit:"points",  weeks:genW(1900,140,-24),  change:-7.4,  trend:"falling", vsAvg:+3,  description:"Shanghai Containerized Freight Index composite. Export demand from China remains below seasonal norms. Europe and US West Coast lanes driving downward pressure on composite." },
];
const AIR_LANES = [
  { id:"bai",   name:"BAI — Baltic Air Freight Composite",  index:"Baltic Air Index (BAI)",       current:4.82,  unit:"$/kg",    weeks:genW(480,28,-6).map(v=>+(v/100).toFixed(2)),  change:+6.2,  trend:"rising",  vsAvg:+12, description:"Baltic Exchange air freight composite. Rates firming on e-commerce demand and belly cargo capacity constraints on Asia-Europe. Spot premium over contract at widest in 18 months." },
  { id:"bai11", name:"BAI11 — Hong Kong → N.America",       index:"Baltic Air Index (BAI)",       current:5.24,  unit:"$/kg",    weeks:genW(510,32,-4).map(v=>+(v/100).toFixed(2)),  change:+8.4,  trend:"rising",  vsAvg:+18, description:"Strongest performing air lane in current market. Premium e-commerce and electronics demand from Greater China driving spot rate premium. Capacity tight heading into Q2." },
  { id:"bai31", name:"BAI31 — Europe → N.America",          index:"Baltic Air Index (BAI)",       current:3.14,  unit:"$/kg",    weeks:genW(310,22,2).map(v=>+(v/100).toFixed(2)),   change:+2.1,  trend:"stable",  vsAvg:+2,  description:"Westbound transatlantic rates broadly stable. Pharmaceutical and perishable cargo maintaining floor on premium lanes. Contract coverage providing stability for regular shippers." },
  { id:"tac",   name:"TAC Index — Global Air Composite",    index:"TAC Index",                    current:4.61,  unit:"$/kg",    weeks:genW(460,26,-3).map(v=>+(v/100).toFixed(2)),  change:+5.8,  trend:"rising",  vsAvg:+9,  description:"Transport Air Cargo Index tracks contract and spot rates globally. Current spot premium over contract at highest level since Q1 2022, indicating capacity pressure across major corridors." },
];
const ROAD_LANES = [
  { id:"dat",   name:"DAT — US Truckload Spot (Dry Van)",   index:"DAT Freight Analytics",        current:2.18,  unit:"$/mi",    weeks:genW(218,14,2).map(v=>+(v/100).toFixed(2)),   change:+4.2,  trend:"rising",  vsAvg:-8,  description:"US dry van truckload spot rates recovering from 2024 trough but remain well below 2022 peak. Capacity tightening heading into peak season. Tender rejection rates rising for first time in 18 months." },
  { id:"dat2",  name:"DAT — US Truckload Spot (Reefer)",    index:"DAT Freight Analytics",        current:2.84,  unit:"$/mi",    weeks:genW(276,18,4).map(v=>+(v/100).toFixed(2)),   change:+6.8,  trend:"rising",  vsAvg:-3,  description:"Refrigerated truckload rates firming on produce season demand. California and Florida shipping lanes seeing strongest gains. Reefer capacity utilisation at 87%." },
  { id:"cass",  name:"Cass Freight Index — Expenditure",    index:"Cass Information Systems",     current:112.4, unit:"index",   weeks:genW(1092,62,12).map(v=>+(v/10).toFixed(1)),  change:+3.1,  trend:"rising",  vsAvg:-5,  description:"Cass freight expenditure index tracking total North American freight spend. Rising on volume recovery but below 2022 peak. Signals gradual market tightening entering mid-2026." },
  { id:"ti",    name:"Ti — European Road Freight Rate",     index:"Transport Intelligence (Ti)",  current:108.2, unit:"index",   weeks:genW(1060,48,8).map(v=>+(v/10).toFixed(1)),   change:+2.4,  trend:"stable",  vsAvg:+1,  description:"Pan-European road freight rate benchmark. German corridor rates softened on manufacturing slowdown. Iberian and Eastern European lanes showing stronger demand and tighter capacity." },
  { id:"trans", name:"Transporeon — EU Spot Rate Monitor",  index:"Transporeon",                  current:94.6,  unit:"index",   weeks:genW(938,52,-4).map(v=>+(v/10).toFixed(1)),   change:-1.8,  trend:"falling", vsAvg:-6,  description:"Real-time European spot rate monitor. Spot rates trading below contract as excess capacity persists in core North-South corridors. Cross-border lanes more balanced." },
];

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, color, width=120, height=36 }) {
  const min=Math.min(...data), max=Math.max(...data), range=max-min||1;
  const pts=data.map((v,i)=>{ const x=(i/(data.length-1))*width, y=height-((v-min)/range)*(height-6)-3; return `${x},${y}`; }).join(" ");
  const lx=width, ly=height-((data[data.length-1]-min)/range)*(height-6)-3;
  return <svg width={width} height={height} style={{display:"block"}}><polyline points={pts} fill="none" stroke={`${color}55`} strokeWidth="1.5"/><circle cx={lx} cy={ly} r="3" fill={color}/></svg>;
}

// ── Rate Card ─────────────────────────────────────────────────────────────────
function RateCard({ item, mc, selected, onClick }) {
  const up=item.change>0, dn=item.change<0;
  const tc=up?"#FF8C00":dn?"#00E676":"#FFD600", ti=up?"↑":dn?"↓":"→";
  return (
    <div onClick={onClick} style={{background:selected?"#0D2438":"#0A1E30",border:`1px solid ${selected?mc+"44":"#0D2A3F"}`,borderLeft:`3px solid ${selected?mc:"#1A3050"}`,borderRadius:"10px",padding:"14px 16px",cursor:"pointer",transition:"all 0.2s"}}
      onMouseEnter={e=>{if(!selected)e.currentTarget.style.background="#0D2235";}}
      onMouseLeave={e=>{if(!selected)e.currentTarget.style.background="#0A1E30";}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"10px"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:"#E8F4FF",fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:"600",fontSize:"12px",marginBottom:"2px",lineHeight:"1.4"}}>{item.name}</div>
          <div style={{color:"#2A5070",fontFamily:"'Space Mono',monospace",fontSize:"9px",marginBottom:"8px"}}>{item.index}</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:"8px"}}>
            <span style={{color:mc,fontFamily:"'Space Mono',monospace",fontSize:"20px",fontWeight:"bold",lineHeight:1}}>{typeof item.current==="number"&&item.current>100?item.current.toLocaleString():item.current}</span>
            <span style={{color:"#3A6080",fontFamily:"'Space Mono',monospace",fontSize:"10px",marginBottom:"2px"}}>{item.unit}</span>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"6px",flexShrink:0}}>
          <Sparkline data={item.weeks} color={mc}/>
          <span style={{color:tc,fontFamily:"'Space Mono',monospace",fontSize:"11px",fontWeight:"bold"}}>{ti} {Math.abs(item.change)}% <span style={{color:"#1E3A52",fontSize:"9px",fontWeight:"normal"}}>12w</span></span>
        </div>
      </div>
      <div style={{marginTop:"8px",display:"flex",alignItems:"center",gap:"8px"}}>
        <span style={{color:"#2A4A6A",fontFamily:"'Space Mono',monospace",fontSize:"9px"}}>VS 90D AVG</span>
        <span style={{background:item.vsAvg>0?"rgba(255,140,0,0.12)":item.vsAvg<0?"rgba(0,230,118,0.1)":"rgba(255,214,0,0.1)",color:item.vsAvg>0?"#FF8C00":item.vsAvg<0?"#00E676":"#FFD600",border:`1px solid ${item.vsAvg>0?"#FF8C0033":item.vsAvg<0?"#00E67633":"#FFD60033"}`,borderRadius:"4px",padding:"1px 7px",fontFamily:"'Space Mono',monospace",fontSize:"9px",fontWeight:"bold"}}>
          {item.vsAvg>0?"+":""}{item.vsAvg}%
        </span>
      </div>
    </div>
  );
}

// ── AI Market Commentary ───────────────────────────────────────────────────────
function MarketCommentary({ mode, sel }) {
  const [text,setText]=useState(""); const [loading,setLoading]=useState(false); const [done,setDone]=useState(false);
  const prevKey=useRef("");
  const key=`${mode}-${sel?.id}`;
  useEffect(()=>{ if(key!==prevKey.current){setText("");setDone(false);prevKey.current=key;} },[key]);

  async function run() {
    if (!sel) return;
    setLoading(true); setText(""); setDone(false);
    const all=mode==="sea"?SEA_LANES:mode==="air"?AIR_LANES:ROAD_LANES;
    const summary=all.map(i=>`${i.name}: ${i.current} ${i.unit} (${i.change>0?"+":""}${i.change}% over 12 weeks, ${i.vsAvg>0?"+":""}${i.vsAvg}% vs 90-day avg). ${i.description}`).join("\n");
    const prompt=`You are a senior freight market analyst. Provide a concise market commentary (5–7 sentences) on current ${mode==="sea"?"container shipping":mode==="air"?"air cargo":"road freight"} market conditions based on these index readings:\n\n${summary}\n\nThe user is focused on: ${sel.name} at ${sel.current} ${sel.unit}.\n\nCover: overall market direction, key drivers behind current rate levels, how the selected index compares to the broader picture, risk factors that could move rates in the next 4–8 weeks, and a practical implication for a shipper deciding whether to book now or wait. Be direct and specific. Prose only.`;
    try {
      const res=await fetch("/api/assess",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})});
      const data=await res.json();
      const full=data.content?.map(c=>c.text||"").join("")||"Unable to generate commentary.";
      let i=0; const iv=setInterval(()=>{setText(full.slice(0,i));i+=3;if(i>full.length){setText(full);clearInterval(iv);setDone(true);}},18);
    } catch(e){setText("Error connecting to AI engine.");setDone(true);}
    setLoading(false);
  }

  if (!sel) return <div style={{background:"rgba(0,180,255,0.03)",border:"1px solid rgba(0,180,255,0.1)",borderRadius:"8px",padding:"24px",textAlign:"center"}}><div style={{color:"#1A3050",fontFamily:"'Space Mono',monospace",fontSize:"11px"}}>← Select an index to generate AI market commentary</div></div>;

  return (
    <div style={{background:"rgba(0,180,255,0.04)",border:"1px solid rgba(0,180,255,0.18)",borderRadius:"8px",padding:"20px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"26px",height:"26px",borderRadius:"50%",background:"linear-gradient(135deg,#00B4FF,#0066FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px"}}>✦</div>
          <div><div style={{color:"#00B4FF",fontFamily:"'Space Mono',monospace",fontSize:"11px",letterSpacing:"0.1em"}}>AI MARKET COMMENTARY</div><div style={{color:"#2A5070",fontFamily:"'Space Mono',monospace",fontSize:"9px",marginTop:"2px"}}>{sel.name}</div></div>
        </div>
        {!loading&&<button onClick={run} style={{background:"rgba(0,180,255,0.08)",border:"1px solid #00B4FF44",borderRadius:"6px",color:"#00B4FF",padding:"6px 14px",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:"10px",letterSpacing:"0.08em"}}>{done?"↻ REFRESH":"▶ GENERATE"}</button>}
      </div>
      <div style={{background:"rgba(0,0,0,0.2)",borderRadius:"6px",padding:"10px 14px",marginBottom:"12px"}}>
        <p style={{color:"#4A7090",fontFamily:"'IBM Plex Sans',sans-serif",fontSize:"12px",margin:0,lineHeight:"1.6"}}>{sel.description}</p>
      </div>
      {loading&&!text&&<div style={{display:"flex",gap:"6px",alignItems:"center",padding:"8px 0"}}>{[0,1,2].map(i=><div key={i} style={{width:"6px",height:"6px",borderRadius:"50%",background:"#00B4FF",animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}<span style={{color:"#3A6080",fontFamily:"'Space Mono',monospace",fontSize:"11px",marginLeft:"8px"}}>Analysing market conditions...</span></div>}
      {text&&<p style={{color:"#B8D4E8",fontSize:"13px",lineHeight:"1.85",fontFamily:"'IBM Plex Sans',sans-serif",margin:0,borderLeft:"2px solid #00B4FF33",paddingLeft:"16px"}}>{text}{!done&&<span style={{animation:"blink 1s step-end infinite",color:"#00B4FF"}}>█</span>}</p>}
      {!text&&!loading&&<p style={{color:"#2A4060",fontFamily:"'Space Mono',monospace",fontSize:"11px",margin:0}}>Click GENERATE for an AI-powered market commentary on this index.</p>}
    </div>
  );
}

// ── Benchmarks Tab ────────────────────────────────────────────────────────────
function BenchmarksTab() {
  const [activeMode,setActiveMode]=useState("sea");
  const [sel,setSel]=useState(null);
  const lanes=activeMode==="sea"?SEA_LANES:activeMode==="air"?AIR_LANES:ROAD_LANES;
  const mc=MODE_COLOR[activeMode];
  const rising=lanes.filter(l=>l.trend==="rising").length;
  const falling=lanes.filter(l=>l.trend==="falling").length;
  const avgVs=Math.round(lanes.reduce((s,l)=>s+l.vsAvg,0)/lanes.length);
  const sources={
    sea:[{n:"Freightos Baltic Index (FBX)",d:"Weekly container spot rates by trade lane. Free API available at api.freightos.com."},{n:"Drewry World Container Index",d:"Per-lane 40ft container benchmark. Widely cited industry standard."},{n:"Baltic Exchange (BDI/BCI)",d:"Dry bulk and container composite indices. Commercial subscription."},{n:"Shanghai Containerized Freight Index (SCFI)",d:"China export lane rates. Published weekly by the Shanghai Shipping Exchange."}],
    air:[{n:"Baltic Air Index (BAI)",d:"Air cargo rates by trade lane. Baltic Exchange commercial data."},{n:"TAC Index",d:"Transport Air Cargo global spot and contract benchmark."},{n:"IATA Air Cargo Data",d:"Monthly market reports. Summary level available free."},{n:"WorldACD Weekly Data",d:"Air cargo market intelligence. Commercial subscription."}],
    road:[{n:"DAT Freight Analytics",d:"US truckload spot and contract rates by lane. Industry standard."},{n:"Cass Freight Index",d:"North American freight volume and expenditure. Published monthly."},{n:"Transport Intelligence (Ti)",d:"Pan-European road freight rate benchmark."},{n:"Transporeon Rate Monitor",d:"Real-time European spot rate monitor. Commercial subscription."}]
  };
  return (
    <div style={{animation:"slideIn 0.3s ease"}}>
      <div style={{color:"#2A4A6A",fontFamily:"'Space Mono',monospace",fontSize:"10px",letterSpacing:"0.12em",marginBottom:"20px"}}>── FREIGHT RATE BENCHMARKS · MARKET INDEX MONITOR</div>
      <div style={{display:"flex",gap:"8px",marginBottom:"20px",flexWrap:"wrap"}}>
        {[{key:"sea",label:"🚢 Sea / Container"},{key:"air",label:"✈ Air Cargo"},{key:"road",label:"🚛 Road Freight"}].map(m=>(
          <button key={m.key} onClick={()=>{setActiveMode(m.key);setSel(null);}} style={{background:activeMode===m.key?`${MODE_COLOR[m.key]}18`:"#08182A",border:`1px solid ${activeMode===m.key?MODE_COLOR[m.key]:"#1A3050"}`,borderRadius:"6px",color:activeMode===m.key?MODE_COLOR[m.key]:"#2A5070",padding:"8px 18px",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:"10px",letterSpacing:"0.08em",transition:"all 0.2s"}}>{m.label}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"20px"}}>
        {[{label:"INDICES TRACKED",value:lanes.length,color:mc},{label:"RATES RISING",value:rising,color:"#FF8C00"},{label:"RATES FALLING",value:falling,color:"#00E676"},{label:"AVG VS 90D",value:`${avgVs>0?"+":""}${avgVs}%`,color:avgVs>0?"#FF8C00":avgVs<0?"#00E676":"#FFD600"}].map((s,i)=>(
          <div key={i} style={{background:"#0A1E30",border:"1px solid #0D2A3F",borderRadius:"8px",padding:"12px 14px",borderTop:`2px solid ${s.color}33`}}>
            <div style={{color:s.color,fontFamily:"'Space Mono',monospace",fontSize:"20px",fontWeight:"bold"}}>{s.value}</div>
            <div style={{color:"#1E4060",fontFamily:"'Space Mono',monospace",fontSize:"9px",letterSpacing:"0.12em",marginTop:"4px"}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px",alignItems:"start"}}>
        <div>
          <div style={{color:"#2A4A6A",fontFamily:"'Space Mono',monospace",fontSize:"9px",letterSpacing:"0.12em",marginBottom:"10px"}}>SELECT AN INDEX FOR AI COMMENTARY</div>
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {lanes.map(item=><RateCard key={item.id} item={item} mc={mc} selected={sel?.id===item.id} onClick={()=>setSel(sel?.id===item.id?null:item)}/>)}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          <MarketCommentary mode={activeMode} sel={sel}/>
          <div style={{background:"#0A1E30",border:"1px solid #0D2A3F",borderRadius:"10px",padding:"18px"}}>
            <div style={{color:"#2A5070",fontFamily:"'Space Mono',monospace",fontSize:"9px",letterSpacing:"0.12em",marginBottom:"14px"}}>── DATA SOURCES</div>
            {sources[activeMode].map((s,i)=>(
              <div key={i} style={{display:"flex",gap:"10px",marginBottom:"12px",alignItems:"flex-start"}}>
                <span style={{fontSize:"13px",flexShrink:0,marginTop:"1px"}}>📊</span>
                <div><div style={{color:"#7AB0CC",fontFamily:"'Space Mono',monospace",fontSize:"10px",marginBottom:"2px"}}>{s.n}</div><div style={{color:"#2A4A6A",fontFamily:"'IBM Plex Sans',sans-serif",fontSize:"11px",lineHeight:"1.4"}}>{s.d}</div></div>
              </div>
            ))}
            <div style={{borderTop:"1px solid #0D2035",paddingTop:"12px",marginTop:"4px"}}>
              <span style={{color:"#1A3050",fontFamily:"'Space Mono',monospace",fontSize:"9px",lineHeight:"1.6"}}>⚠ Index values are simulated for demonstration. Production feeds sourced directly from index providers via API or licensed data agreements.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function RiskBadge({level,large}){ return <span style={{background:RISK_BG[level],color:RISK_COLORS[level],border:`1px solid ${RISK_COLORS[level]}44`,borderRadius:"4px",padding:large?"4px 12px":"2px 8px",fontSize:large?"12px":"10px",fontFamily:"'Space Mono',monospace",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:"bold"}}>{level}</span>; }
function ModePill({mode}){ const c=MODE_COLOR[mode]||"#00B4FF"; return <span style={{background:`${c}15`,color:c,border:`1px solid ${c}33`,borderRadius:"4px",padding:"2px 9px",fontSize:"10px",fontFamily:"'Space Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em"}}>{MODE_ICON[mode]} {MODE_LABEL[mode]}</span>; }
function RouteVisual({shipment}){ const pts=[shipment.origin,...shipment.transit,shipment.destination]; return <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:0,margin:"16px 0"}}>{pts.map((pt,i)=><div key={i} style={{display:"flex",alignItems:"center"}}><div style={{background:i===0?"rgba(0,230,118,0.12)":i===pts.length-1?"rgba(255,59,59,0.12)":"#0D2035",border:`1px solid ${i===0?"#00E676":i===pts.length-1?"#FF3B3B":"#1A3050"}`,borderRadius:"6px",padding:"6px 12px",fontSize:"11px",color:i===0?"#00E676":i===pts.length-1?"#FF3B3B":"#5A8AAA",fontFamily:"'Space Mono',monospace",fontWeight:i===0||i===pts.length-1?"bold":"normal",whiteSpace:"nowrap"}}>{MODE_ICON[shipment.mode]} {pt}</div>{i<pts.length-1&&<div style={{color:"#1E3A52",fontSize:"13px",padding:"0 6px"}}>──▶</div>}</div>)}</div>; }
function TxtIn({value,onChange,placeholder,label}){ const [f,setF]=useState(false); return <div>{label&&<label style={{color:"#3A6080",fontFamily:"'Space Mono',monospace",fontSize:"10px",letterSpacing:"0.1em",display:"block",marginBottom:"6px"}}>{label}</label>}<input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{background:"#08182A",border:`1px solid ${f?"#00B4FF55":"#1A3050"}`,borderRadius:"6px",padding:"10px 14px",color:"#B8D4E8",fontFamily:"'Space Mono',monospace",fontSize:"11px",width:"100%",outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}/></div>; }

// ── AI Analysis (ERP shipments) ───────────────────────────────────────────────
function AIAnalysis({shipment,risks}){
  const [text,setText]=useState(""); const [loading,setLoading]=useState(false); const [done,setDone]=useState(false);
  async function run(){
    setLoading(true); setText(""); setDone(false);
    const rs=risks.map(r=>`[${r.type.toUpperCase()}] ${r.location} — ${r.title}: ${r.detail}`).join("\n");
    const p=`You are a senior logistics risk analyst. Shipment ${shipment.id} carries ${shipment.cargo||"general cargo"} by ${shipment.mode==="sea"?"vessel":shipment.mode==="air"?"air cargo":"road truck"} from ${shipment.origin} to ${shipment.destination}, transiting through ${shipment.transit.join(", ")}.\n\nRisk signals:\n${rs}\n${shipment.mode==="road"?"\nFor road: consider dispatcher actions such as rerouting, holding, or adjusting departure time.":""}\n\nProvide a concise executive risk briefing (4–6 sentences): overall risk posture, most critical issue and operational impact, 2–3 specific mitigations, and a clear recommendation (proceed/reroute/delay/escalate). Prose only.`;
    try {
      const res=await fetch("/api/assess",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:p}]})});
      const d=await res.json(); const full=d.content?.map(c=>c.text||"").join("")||"Unable to generate.";
      let i=0; const iv=setInterval(()=>{setText(full.slice(0,i));i+=3;if(i>full.length){setText(full);clearInterval(iv);setDone(true);}},18);
    } catch(e){setText("Error connecting to AI engine.");setDone(true);}
    setLoading(false);
  }
  return (
    <div style={{background:"rgba(0,180,255,0.04)",border:"1px solid rgba(0,180,255,0.18)",borderRadius:"8px",padding:"20px",marginTop:"20px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}><div style={{width:"26px",height:"26px",borderRadius:"50%",background:"linear-gradient(135deg,#00B4FF,#0066FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px"}}>✦</div><span style={{color:"#00B4FF",fontFamily:"'Space Mono',monospace",fontSize:"11px",letterSpacing:"0.1em"}}>AI RISK BRIEFING</span></div>
        {!loading&&<button onClick={run} style={{background:"rgba(0,180,255,0.08)",border:"1px solid #00B4FF44",borderRadius:"6px",color:"#00B4FF",padding:"6px 14px",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:"10px",letterSpacing:"0.08em"}}>{done?"↻ REGENERATE":"▶ RUN ANALYSIS"}</button>}
      </div>
      {loading&&!text&&<div style={{display:"flex",gap:"6px",alignItems:"center",padding:"8px 0"}}>{[0,1,2].map(i=><div key={i} style={{width:"6px",height:"6px",borderRadius:"50%",background:"#00B4FF",animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}<span style={{color:"#3A6080",fontFamily:"'Space Mono',monospace",fontSize:"11px",marginLeft:"8px"}}>Analyzing route intelligence...</span></div>}
      {text&&<p style={{color:"#B8D4E8",fontSize:"13px",lineHeight:"1.8",fontFamily:"'IBM Plex Sans',sans-serif",margin:0,borderLeft:"2px solid #00B4FF33",paddingLeft:"16px"}}>{text}{!done&&<span style={{animation:"blink 1s step-end infinite",color:"#00B4FF"}}>█</span>}</p>}
      {!text&&!loading&&<p style={{color:"#2A4060",fontFamily:"'Space Mono',monospace",fontSize:"11px",margin:0}}>Click RUN ANALYSIS to generate an AI-powered risk briefing.</p>}
    </div>
  );
}

// ── Shipment Detail ───────────────────────────────────────────────────────────
function ShipmentDetail({shipment,onBack}){
  const risks=getRisks(shipment); const score=overallScore(risks);
  return (
    <div style={{animation:"slideIn 0.3s ease"}}>
      <button onClick={onBack} style={{background:"none",border:"1px solid #1A3050",borderRadius:"6px",color:"#4A7090",padding:"6px 14px",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:"10px",marginBottom:"24px",letterSpacing:"0.08em"}}>← BACK TO SHIPMENTS</button>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"12px",marginBottom:"8px"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"6px",flexWrap:"wrap"}}>
            <h2 style={{color:"#E8F4FF",fontFamily:"'Space Mono',monospace",fontSize:"20px",margin:0}}>{shipment.id}</h2>
            <RiskBadge level={score}/> <ModePill mode={shipment.mode}/>
            {shipment.cargo&&<span style={{background:"#0D2035",border:"1px solid #1A3050",borderRadius:"4px",padding:"2px 8px",fontSize:"10px",color:"#4A7090",fontFamily:"'Space Mono',monospace"}}>{shipment.cargo}</span>}
          </div>
          <p style={{color:"#2A5070",fontFamily:"'Space Mono',monospace",fontSize:"11px",margin:0}}>{shipment.origin} → {shipment.destination}</p>
        </div>
        <div style={{background:RISK_BG[score],border:`1px solid ${RISK_COLORS[score]}44`,borderRadius:"8px",padding:"12px 20px",textAlign:"center"}}>
          <div style={{color:RISK_COLORS[score],fontSize:"28px",fontFamily:"'Space Mono',monospace",fontWeight:"bold"}}>{risks.length}</div>
          <div style={{color:RISK_COLORS[score],fontSize:"9px",fontFamily:"'Space Mono',monospace",letterSpacing:"0.12em"}}>RISK SIGNALS</div>
        </div>
      </div>
      <RouteVisual shipment={shipment}/>
      {shipment.mode==="road"&&<div style={{background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:"6px",padding:"10px 14px",marginBottom:"16px",display:"flex",alignItems:"center",gap:"10px"}}><span style={{fontSize:"14px"}}>🛣</span><span style={{color:"#34D399",fontFamily:"'Space Mono',monospace",fontSize:"10px",letterSpacing:"0.08em"}}>ROAD MODE — Corridor risk assessed along highway segments. Real-time rerouting available.</span></div>}
      <div style={{color:"#2A4A6A",fontFamily:"'Space Mono',monospace",fontSize:"10px",letterSpacing:"0.12em",marginBottom:"12px",marginTop:"8px"}}>── RISK SIGNALS BY WAYPOINT</div>
      <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
        {risks.map((risk,i)=>(
          <div key={i} style={{background:RISK_BG[risk.type],border:`1px solid ${RISK_COLORS[risk.type]}2A`,borderLeft:`3px solid ${RISK_COLORS[risk.type]}`,borderRadius:"8px",padding:"16px",animation:`slideIn 0.3s ease ${i*0.05}s both`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"8px",marginBottom:"8px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <span style={{fontSize:"16px"}}>{CAT_ICONS[risk.category]||"⚠"}</span>
                <div><div style={{color:"#E8F4FF",fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:"600",fontSize:"13px"}}>{risk.title}</div><div style={{color:"#3A6080",fontFamily:"'Space Mono',monospace",fontSize:"10px",marginTop:"2px"}}>{risk.location} · {risk.category}</div></div>
              </div>
              <RiskBadge level={risk.type}/>
            </div>
            <p style={{color:"#7A9AB8",fontSize:"12px",margin:0,fontFamily:"'IBM Plex Sans',sans-serif",lineHeight:"1.7",paddingLeft:"26px"}}>{risk.detail}</p>
          </div>
        ))}
      </div>
      <AIAnalysis shipment={shipment} risks={risks}/>
    </div>
  );
}

// ── Shipment Card ─────────────────────────────────────────────────────────────
function ShipmentCard({shipment,onClick}){
  const risks=getRisks(shipment); const score=overallScore(risks);
  const cc=risks.filter(r=>r.type==="critical").length, hc=risks.filter(r=>r.type==="high").length;
  return (
    <div onClick={onClick} style={{background:"#0A1E30",border:`1px solid ${RISK_COLORS[score]}1A`,borderLeft:`3px solid ${RISK_COLORS[score]}`,borderRadius:"10px",padding:"18px 20px",cursor:"pointer",transition:"all 0.2s"}}
      onMouseEnter={e=>{e.currentTarget.style.background="#0D2438";e.currentTarget.style.transform="translateY(-1px)";}}
      onMouseLeave={e=>{e.currentTarget.style.background="#0A1E30";e.currentTarget.style.transform="translateY(0)";}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"6px",flexWrap:"wrap"}}>
            <span style={{color:"#E8F4FF",fontFamily:"'Space Mono',monospace",fontWeight:"bold",fontSize:"14px"}}>{shipment.id}</span>
            <RiskBadge level={score}/> <ModePill mode={shipment.mode}/>
          </div>
          <div style={{color:"#3A6080",fontFamily:"'Space Mono',monospace",fontSize:"10px",marginBottom:"10px"}}>{shipment.origin} → {shipment.destination}</div>
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
            {shipment.transit.map((t,i)=><span key={i} style={{background:"#0D2035",border:"1px solid #1A3050",borderRadius:"4px",padding:"2px 8px",color:"#4A7090",fontSize:"10px",fontFamily:"'Space Mono',monospace"}}>via {t}</span>)}
            {shipment.cargo&&<span style={{background:"#0D2035",border:"1px solid #1A3050",borderRadius:"4px",padding:"2px 8px",color:"#3A6080",fontSize:"10px",fontFamily:"'Space Mono',monospace"}}>{shipment.cargo}</span>}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0,marginLeft:"12px"}}>
          {cc>0&&<div style={{color:RISK_COLORS.critical,fontFamily:"'Space Mono',monospace",fontSize:"11px",marginBottom:"4px"}}>{cc} CRITICAL</div>}
          {hc>0&&<div style={{color:RISK_COLORS.high,fontFamily:"'Space Mono',monospace",fontSize:"11px",marginBottom:"4px"}}>{hc} HIGH</div>}
          <div style={{color:"#2A4A6A",fontSize:"10px",fontFamily:"'Space Mono',monospace",marginTop:"8px"}}>{risks.length} signals →</div>
        </div>
      </div>
    </div>
  );
}

// ── Live Route Assessment ─────────────────────────────────────────────────────
function LiveRouteAssessment({query,onReset}){
  const [phase,setPhase]=useState("loading"); const [result,setResult]=useState(null);
  const [bt,setBt]=useState(""); const [bd,setBd]=useState(false);
  useEffect(()=>{run();},[]);

  async function run(){
    setPhase("loading"); setResult(null); setBt(""); setBd(false);
    const md=query.mode==="sea"?"Sea (vessel)":query.mode==="air"?"Air (cargo)":"Road (truck)";
    const roadX=query.mode==="road"?"\nFor road: assess highway corridor risks (accidents, closures, weather), border crossing wait times, and HOS compliance. Corridor risk is as important as node risk for road freight.":"";
    const p=`Risk analyst. Mode:${md} Origin:${query.origin} Dest:${query.destination} Transit:${query.transit||"none"} Cargo:${query.cargo||"general"}${query.mode==="road"?" Include highway/border risks.":""}\nReturn ONLY JSON: {"overallRisk":"critical|high|medium|low","summary":"1-2 sentences","recommendation":"proceed|reroute|delay|escalate","recommendationDetail":"1 sentence","estimatedDelayDays":0,"risks":[{"location":"","type":"critical|high|medium|low","category":"Security|Congestion|Weather|Regulatory|Geopolitical|Sanctions|Highway|Border","title":"","detail":"1 sentence"}],"mitigations":[{"action":"","detail":"1 sentence"}]}\n3-4 risks, 2-3 mitigations.`;
    try {
      const res=await fetch("/api/assess",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:800,messages:[{role:"user",content:p}]})});
      const data=await res.json();
      const raw=data.content?.map(c=>c.text||"").join("").trim()||"";
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setResult(parsed); setPhase("result");
      const full=`${parsed.summary} ${parsed.recommendationDetail}`;
      let i=0; const iv=setInterval(()=>{setBt(full.slice(0,i));i+=3;if(i>full.length){setBt(full);clearInterval(iv);setBd(true);}},18);
    } catch(e){ setPhase("error"); }
  }

  const RC={proceed:"#00E676",reroute:"#FF8C00",delay:"#FFD600",escalate:"#FF3B3B"};
  const RI={proceed:"✓",reroute:"↺",delay:"⏸",escalate:"⚠"};

  if(phase==="loading") return <div style={{padding:"60px 0",textAlign:"center"}}><div style={{display:"flex",justifyContent:"center",gap:"8px",marginBottom:"24px"}}>{[0,1,2,3,4].map(i=><div key={i} style={{width:"8px",height:"8px",borderRadius:"50%",background:"#00B4FF",animation:`pulse 1.4s ease-in-out ${i*0.15}s infinite`}}/>)}</div><div style={{color:"#2A5070",fontFamily:"'Space Mono',monospace",fontSize:"11px",letterSpacing:"0.15em",marginBottom:"10px"}}>RUNNING ROUTE INTELLIGENCE ASSESSMENT</div><div style={{color:"#1A3050",fontFamily:"'Space Mono',monospace",fontSize:"10px"}}>{query.origin} ──▶ {query.destination}</div><div style={{color:"#1A3050",fontFamily:"'Space Mono',monospace",fontSize:"9px",marginTop:"6px"}}>{query.mode==="road"?"Scanning highway corridors, border crossings & weather...":"Scanning geopolitical, weather, regulatory & congestion signals..."}</div></div>;
  if(phase==="error") return <div style={{padding:"30px",textAlign:"center"}}><div style={{color:"#FF3B3B",fontFamily:"'Space Mono',monospace",fontSize:"13px",marginBottom:"16px"}}>⚠ Assessment failed</div><div style={{display:"flex",gap:"10px",justifyContent:"center"}}><button onClick={run} style={{background:"rgba(255,59,59,0.1)",border:"1px solid #FF3B3B44",borderRadius:"6px",color:"#FF3B3B",padding:"8px 20px",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:"11px"}}>↻ RETRY</button><button onClick={onReset} style={{background:"none",border:"1px solid #1A3050",borderRadius:"6px",color:"#4A7090",padding:"8px 20px",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:"11px"}}>← NEW QUERY</button></div></div>;
  if(!result) return null;

  const rc=RC[result.recommendation]||"#00B4FF";
  return (
    <div style={{animation:"slideIn 0.4s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"22px",flexWrap:"wrap",gap:"12px"}}>
        <button onClick={onReset} style={{background:"none",border:"1px solid #1A3050",borderRadius:"6px",color:"#4A7090",padding:"6px 14px",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:"10px",letterSpacing:"0.08em"}}>← NEW QUERY</button>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}><ModePill mode={query.mode}/><span style={{color:"#2A5070",fontFamily:"'Space Mono',monospace",fontSize:"10px"}}>OVERALL RISK</span><RiskBadge level={result.overallRisk} large/></div>
      </div>
      <div style={{background:"#0A1E30",border:"1px solid #0D2A3F",borderRadius:"10px",padding:"18px 20px",marginBottom:"16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:query.transit?"10px":"0",flexWrap:"wrap"}}>
          <span style={{color:"#E8F4FF",fontFamily:"'Space Mono',monospace",fontSize:"14px",fontWeight:"bold"}}>{MODE_ICON[query.mode]} {query.origin}</span>
          <span style={{color:"#1E3A52",fontSize:"13px"}}>──▶</span>
          <span style={{color:"#E8F4FF",fontFamily:"'Space Mono',monospace",fontSize:"14px",fontWeight:"bold"}}>{query.destination}</span>
          {query.cargo&&<span style={{color:"#2A5070",fontFamily:"'Space Mono',monospace",fontSize:"10px",background:"#0D2035",border:"1px solid #1A3050",borderRadius:"4px",padding:"2px 8px"}}>{query.cargo}</span>}
        </div>
        {query.transit&&<div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}><span style={{color:"#2A4A6A",fontFamily:"'Space Mono',monospace",fontSize:"9px",letterSpacing:"0.1em"}}>VIA</span>{query.transit.split(",").map((t,i)=><span key={i} style={{background:"#0D2035",border:"1px solid #1A3050",borderRadius:"4px",padding:"2px 8px",color:"#4A7090",fontSize:"10px",fontFamily:"'Space Mono',monospace"}}>{t.trim()}</span>)}</div>}
      </div>
      <div style={{background:`${rc}0D`,border:`1px solid ${rc}33`,borderLeft:`3px solid ${rc}`,borderRadius:"8px",padding:"16px 18px",marginBottom:"22px",display:"flex",alignItems:"flex-start",gap:"14px"}}>
        <div style={{width:"34px",height:"34px",borderRadius:"50%",background:`${rc}1A`,border:`1px solid ${rc}`,display:"flex",alignItems:"center",justifyContent:"center",color:rc,fontSize:"16px",flexShrink:0,marginTop:"2px"}}>{RI[result.recommendation]}</div>
        <div>
          <div style={{color:rc,fontFamily:"'Space Mono',monospace",fontSize:"11px",letterSpacing:"0.12em",marginBottom:"6px"}}>RECOMMENDATION: {result.recommendation?.toUpperCase()}{result.estimatedDelayDays&&<span style={{color:"#4A7090",marginLeft:"14px",fontWeight:"normal"}}>EST. DELAY +{result.estimatedDelayDays} DAYS</span>}</div>
          <p style={{color:"#B8D4E8",fontSize:"13px",lineHeight:"1.75",fontFamily:"'IBM Plex Sans',sans-serif",margin:0}}>{bt}{!bd&&<span style={{animation:"blink 1s step-end infinite",color:"#00B4FF"}}>█</span>}</p>
        </div>
      </div>
      <div style={{color:"#2A4A6A",fontFamily:"'Space Mono',monospace",fontSize:"10px",letterSpacing:"0.12em",marginBottom:"12px"}}>── RISK SIGNALS · {result.risks?.length||0} IDENTIFIED</div>
      <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"26px"}}>
        {(result.risks||[]).map((risk,i)=>(
          <div key={i} style={{background:RISK_BG[risk.type],border:`1px solid ${RISK_COLORS[risk.type]}2A`,borderLeft:`3px solid ${RISK_COLORS[risk.type]}`,borderRadius:"8px",padding:"16px",animation:`slideIn 0.35s ease ${i*0.07}s both`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"8px",marginBottom:"8px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}><span style={{fontSize:"16px"}}>{CAT_ICONS[risk.category]||"⚠"}</span><div><div style={{color:"#E8F4FF",fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:"600",fontSize:"13px"}}>{risk.title}</div><div style={{color:"#3A6080",fontFamily:"'Space Mono',monospace",fontSize:"10px",marginTop:"2px"}}>{risk.location} · {risk.category}</div></div></div>
              <RiskBadge level={risk.type}/>
            </div>
            <p style={{color:"#7A9AB8",fontSize:"12px",margin:0,fontFamily:"'IBM Plex Sans',sans-serif",lineHeight:"1.7",paddingLeft:"26px"}}>{risk.detail}</p>
          </div>
        ))}
      </div>
      {result.mitigations?.length>0&&<><div style={{color:"#2A4A6A",fontFamily:"'Space Mono',monospace",fontSize:"10px",letterSpacing:"0.12em",marginBottom:"12px"}}>── RECOMMENDED MITIGATIONS</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"10px"}}>{result.mitigations.map((m,i)=><div key={i} style={{background:"rgba(0,180,255,0.04)",border:"1px solid rgba(0,180,255,0.14)",borderRadius:"8px",padding:"14px 16px"}}><div style={{color:"#00B4FF",fontFamily:"'Space Mono',monospace",fontSize:"11px",marginBottom:"6px"}}>{String(i+1).padStart(2,"0")} {m.action}</div><div style={{color:"#4A7090",fontFamily:"'IBM Plex Sans',sans-serif",fontSize:"12px",lineHeight:"1.5"}}>{m.detail}</div></div>)}</div></>}
    </div>
  );
}


// ── Dashboard Data ────────────────────────────────────────────────────────────
const DASH_SHIPMENTS = [
  // CRITICAL
  { id:"OF-2841", ref:"PO-CN-8821", origin:"Shanghai",    dest:"Rotterdam",    mode:"sea",  carrier:"COSCO",     eta:"12 Mar", cargo:"Electronics",       risk:"critical", signal:"Suez canal vessel queuing — 4.2 day avg delay. Sanctions entity detected on vessel crew manifest." },
  { id:"OF-2856", ref:"PO-SG-0044", origin:"Singapore",   dest:"Los Angeles",  mode:"sea",  carrier:"MSC",       eta:"18 Mar", cargo:"Auto Parts",         risk:"critical", signal:"Tropical Cyclone Nora (Cat 3) tracking across transit route. Rerouting via south recommended." },
  { id:"OF-2863", ref:"PO-DXB-112", origin:"Dubai",       dest:"Hamburg",      mode:"air",  carrier:"Emirates",  eta:"9 Mar",  cargo:"Pharmaceuticals",    risk:"critical", signal:"OFAC SDN list match on consignee subsidiary. Legal review required before clearance." },
  // MODERATE
  { id:"OF-2847", ref:"PO-UK-3310", origin:"London",      dest:"Chicago",      mode:"air",  carrier:"BA Cargo",  eta:"10 Mar", cargo:"Medical Devices",    risk:"moderate", signal:"ATC strike action announced at Heathrow — 20–40% probability of 6h+ delay on 10 Mar." },
  { id:"OF-2851", ref:"PO-MX-0077", origin:"Mexico City", dest:"Toronto",      mode:"road", carrier:"XPO",       eta:"11 Mar", cargo:"Consumer Goods",     risk:"moderate", signal:"I-35 corridor congestion +38% above baseline. Winter weather advisory active in Texas panhandle." },
  { id:"OF-2858", ref:"PO-IN-2290", origin:"Mumbai",      dest:"Felixstowe",   mode:"sea",  carrier:"Maersk",    eta:"24 Mar", cargo:"Textiles",           risk:"moderate", signal:"Port of Felixstowe dwell time elevated to 4.8 days (norm 2.1). Berth congestion from diverted Suez traffic." },
  { id:"OF-2864", ref:"PO-KR-0551", origin:"Busan",       dest:"Vancouver",    mode:"sea",  carrier:"HMM",       eta:"21 Mar", cargo:"Machinery",          risk:"moderate", signal:"North Pacific weather system generating 8–10m swells. Route deviation likely adds 18h transit." },
  // LOW
  { id:"OF-2838", ref:"PO-DE-4401", origin:"Frankfurt",   dest:"New York",     mode:"air",  carrier:"Lufthansa", eta:"9 Mar",  cargo:"Optical Equipment",  risk:"low",      signal:"No active signals. Standard transit conditions. Last assessed 4h ago." },
  { id:"OF-2843", ref:"PO-AU-0882", origin:"Sydney",      dest:"Singapore",    mode:"sea",  carrier:"ANL",       eta:"15 Mar", cargo:"Mining Equipment",   risk:"low",      signal:"No active signals. Favourable weather window through Coral Sea corridor." },
  { id:"OF-2849", ref:"PO-US-1177", origin:"Dallas",      dest:"Miami",        mode:"road", carrier:"Werner",    eta:"10 Mar", cargo:"Retail Goods",       risk:"low",      signal:"Minor I-10 construction delay (est. +45 min). No weather or regulatory flags." },
  { id:"OF-2853", ref:"PO-NL-0033", origin:"Amsterdam",   dest:"Gdansk",       mode:"road", carrier:"DB Schenker",eta:"11 Mar",cargo:"Chemical Inputs",    risk:"low",      signal:"No active signals. All border crossings operating at normal throughput." },
  { id:"OF-2860", ref:"PO-JP-7723", origin:"Yokohama",    dest:"Seattle",      mode:"sea",  carrier:"NYK",       eta:"19 Mar", cargo:"Consumer Electronics",risk:"low",     signal:"Vessel on schedule. North Pacific routing clear. No sanctions or advisory flags." },
];

const TREND_DATA = [
  {day:"Feb 9",  critical:2,moderate:4,low:6},{day:"Feb 12",critical:1,moderate:3,low:8},
  {day:"Feb 15",critical:0,moderate:5,low:7},{day:"Feb 18",critical:2,moderate:3,low:7},
  {day:"Feb 21",critical:1,moderate:4,low:6},{day:"Feb 24",critical:3,moderate:3,low:6},
  {day:"Feb 27",critical:2,moderate:5,low:5},{day:"Mar 2", critical:2,moderate:4,low:6},
  {day:"Mar 5", critical:3,moderate:4,low:5},{day:"Mar 7", critical:3,moderate:4,low:5},
];
const MODE_RISK_DATA = [
  {mode:"Sea",  critical:2,moderate:2,low:2},
  {mode:"Air",  critical:1,moderate:1,low:1},
  {mode:"Road", critical:0,moderate:1,low:2},
];
const LANE_DATA = [
  {lane:"Asia → Europe",       score:82,count:4},
  {lane:"Middle East → Europe",score:88,count:1},
  {lane:"Asia → N.America",    score:61,count:3},
  {lane:"Europe → N.America",  score:44,count:2},
  {lane:"Domestic N.America",  score:28,count:2},
];
const RISK_DIST = [{name:"Critical",value:3,color:"#E53935"},{name:"Moderate",value:4,color:"#F59E0B"},{name:"Low",value:5,color:"#10B981"}];

function DashChartTip({active,payload,label}){
  if(!active||!payload?.length) return null;
  return <div style={{background:"#0A1E30",border:"1px solid #1A3050",borderRadius:"6px",padding:"10px 14px",fontFamily:"'Space Mono',monospace",fontSize:"10px"}}>
    <div style={{color:"#4A7090",marginBottom:"5px"}}>{label}</div>
    {payload.map(p=><div key={p.name} style={{color:p.color,marginBottom:"2px"}}>{p.name}: <strong>{p.value}</strong></div>)}
  </div>;
}

function DashRiskPill({risk}){
  const cfg={critical:{bg:"#3D0A0A",color:"#E53935",label:"CRITICAL"},moderate:{bg:"#2D1E00",color:"#F59E0B",label:"MODERATE"},low:{bg:"#041A0F",color:"#10B981",label:"LOW"}}[risk];
  return <span style={{background:cfg.bg,color:cfg.color,fontSize:"9px",fontWeight:"700",letterSpacing:"0.08em",padding:"2px 8px",borderRadius:"3px",border:`1px solid ${cfg.color}33`,fontFamily:"'Space Mono',monospace"}}>{cfg.label}</span>;
}

function DashShipRow({s,accent}){
  const modeIcon={sea:"🚢",air:"✈",road:"🚛"}[s.mode];
  return <div style={{background:"#0A1E30",border:`1px solid ${accent}22`,borderLeft:`3px solid ${accent}`,borderRadius:"6px",padding:"12px 16px",display:"grid",gridTemplateColumns:"auto 1fr auto",gap:"0 14px",alignItems:"start",cursor:"pointer",transition:"background 0.15s"}}
    onMouseEnter={e=>e.currentTarget.style.background="#0D2A3F"}
    onMouseLeave={e=>e.currentTarget.style.background="#0A1E30"}>
    <div style={{paddingTop:"2px",fontSize:"13px"}}>{modeIcon}</div>
    <div style={{minWidth:0}}>
      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px",flexWrap:"wrap"}}>
        <span style={{color:"#E8F4FF",fontWeight:"600",fontSize:"12px",fontFamily:"'Space Mono',monospace"}}>{s.id}</span>
        <span style={{color:"#2A5070",fontSize:"10px",fontFamily:"'Space Mono',monospace"}}>{s.ref}</span>
        <DashRiskPill risk={s.risk}/>
      </div>
      <div style={{color:"#4A7090",fontSize:"11px",marginBottom:"5px",fontFamily:"'IBM Plex Sans',sans-serif"}}>
        <span style={{color:"#00B4FF"}}>{s.origin}</span>
        <span style={{color:"#1A3050",margin:"0 6px"}}>→</span>
        <span style={{color:"#00B4FF"}}>{s.dest}</span>
        <span style={{color:"#1A3050",marginLeft:"10px",marginRight:"4px"}}>via</span>
        <span style={{color:"#4A7090"}}>{s.carrier}</span>
        <span style={{color:"#1A3050",marginLeft:"10px"}}>ETA {s.eta}</span>
      </div>
      <div style={{color:"#2A5070",fontSize:"11px",lineHeight:"1.5",background:`${accent}0A`,borderRadius:"4px",padding:"6px 10px",borderLeft:`2px solid ${accent}44`,fontFamily:"'IBM Plex Sans',sans-serif"}}>{s.signal}</div>
    </div>
    <div style={{textAlign:"right",fontSize:"10px",color:"#2A5070",fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap"}}>
      <div>{s.cargo}</div><div style={{marginTop:"4px",color:"#1A4060"}}>{s.mode.toUpperCase()}</div>
    </div>
  </div>;
}

function DashSection({title,count,accent,icon,shipments,defaultOpen=false}){
  const [open,setOpen]=useState(defaultOpen);
  return <div style={{marginBottom:"20px"}}>
    <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:"10px",cursor:"pointer",padding:"10px 16px",borderRadius:"6px",background:open?`${accent}12`:`${accent}08`,border:`1px solid ${accent}30`,marginBottom:open?"10px":"0",userSelect:"none"}}
      onMouseEnter={e=>e.currentTarget.style.background=`${accent}18`}
      onMouseLeave={e=>e.currentTarget.style.background=open?`${accent}12`:`${accent}08`}>
      <span style={{fontSize:"14px"}}>{icon}</span>
      <span style={{color:accent,fontWeight:"700",fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'Space Mono',monospace"}}>{title}</span>
      <span style={{background:`${accent}22`,color:accent,fontSize:"10px",fontWeight:"700",padding:"1px 8px",borderRadius:"10px",fontFamily:"'Space Mono',monospace"}}>{count}</span>
      <span style={{flex:1}}/>
      <span style={{color:"#2A5070",fontSize:"10px",fontFamily:"'Space Mono',monospace"}}>{open?"▲ collapse":"▼ expand"}</span>
    </div>
    {open&&<div style={{display:"flex",flexDirection:"column",gap:"8px"}}>{shipments.map(s=><DashShipRow key={s.id} s={s} accent={accent}/>)}</div>}
  </div>;
}

function DashboardTab(){
  const critical=DASH_SHIPMENTS.filter(s=>s.risk==="critical");
  const moderate=DASH_SHIPMENTS.filter(s=>s.risk==="moderate");
  const low=DASH_SHIPMENTS.filter(s=>s.risk==="low");
  const laneColor=score=>score>=75?"#E53935":score>=50?"#F59E0B":"#10B981";

  return <div style={{animation:"slideIn 0.3s ease"}}>
    {/* KPI row */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"20px"}}>
      {[{label:"TOTAL ACTIVE",value:DASH_SHIPMENTS.length,color:"#00B4FF",icon:"📦"},{label:"CRITICAL",value:critical.length,color:"#E53935",icon:"🔴"},{label:"MODERATE",value:moderate.length,color:"#F59E0B",icon:"🟡"},{label:"LOW RISK",value:low.length,color:"#10B981",icon:"🟢"}].map(k=>(
        <div key={k.label} style={{background:"#0A1E30",border:`1px solid ${k.color}22`,borderTop:`2px solid ${k.color}`,borderRadius:"8px",padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:"9px",color:"#2A5070",fontFamily:"'Space Mono',monospace",letterSpacing:"0.1em",marginBottom:"6px"}}>{k.label}</div>
              <div style={{fontSize:"30px",fontWeight:"700",color:k.color,lineHeight:"1",fontFamily:"'Space Mono',monospace"}}>{k.value}</div>
            </div>
            <span style={{fontSize:"18px"}}>{k.icon}</span>
          </div>
        </div>
      ))}
    </div>

    {/* Charts row 1 */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:"14px",marginBottom:"14px"}}>
      {/* Donut */}
      <div style={{background:"#0A1E30",border:"1px solid #0D2A3F",borderRadius:"8px",padding:"18px 14px"}}>
        <div style={{fontSize:"9px",fontWeight:"600",color:"#2A5070",fontFamily:"'Space Mono',monospace",letterSpacing:"0.1em",marginBottom:"14px"}}>── RISK DISTRIBUTION</div>
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie data={RISK_DIST} cx="50%" cy="50%" innerRadius={44} outerRadius={66} paddingAngle={3} dataKey="value" strokeWidth={0}>
              {RISK_DIST.map((d,i)=><Cell key={i} fill={d.color}/>)}
            </Pie>
            <Tooltip content={<DashChartTip/>}/>
          </PieChart>
        </ResponsiveContainer>
        <div style={{display:"flex",justifyContent:"center",gap:"12px",marginTop:"6px"}}>
          {RISK_DIST.map(d=><div key={d.name} style={{display:"flex",alignItems:"center",gap:"4px",fontSize:"9px",color:"#2A5070",fontFamily:"'Space Mono',monospace"}}>
            <span style={{width:"7px",height:"7px",borderRadius:"50%",background:d.color,display:"inline-block"}}/>
            {d.name} ({d.value})
          </div>)}
        </div>
      </div>
      {/* Trend line */}
      <div style={{background:"#0A1E30",border:"1px solid #0D2A3F",borderRadius:"8px",padding:"18px 18px 10px"}}>
        <div style={{fontSize:"9px",fontWeight:"600",color:"#2A5070",fontFamily:"'Space Mono',monospace",letterSpacing:"0.1em",marginBottom:"14px"}}>── PORTFOLIO RISK TREND — LAST 30 DAYS</div>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={TREND_DATA} margin={{top:4,right:4,left:-24,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0D2035"/>
            <XAxis dataKey="day" tick={{fill:"#2A5070",fontSize:9,fontFamily:"Space Mono"}} tickLine={false} axisLine={false} interval={2}/>
            <YAxis tick={{fill:"#2A5070",fontSize:9}} tickLine={false} axisLine={false}/>
            <Tooltip content={<DashChartTip/>}/>
            <Line type="monotone" dataKey="critical" stroke="#E53935" strokeWidth={2} dot={false} name="Critical"/>
            <Line type="monotone" dataKey="moderate"  stroke="#F59E0B" strokeWidth={2} dot={false} name="Moderate"/>
            <Line type="monotone" dataKey="low"       stroke="#10B981" strokeWidth={2} dot={false} name="Low"/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Charts row 2 */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"28px"}}>
      {/* Stacked bar by mode */}
      <div style={{background:"#0A1E30",border:"1px solid #0D2A3F",borderRadius:"8px",padding:"18px 18px 10px"}}>
        <div style={{fontSize:"9px",fontWeight:"600",color:"#2A5070",fontFamily:"'Space Mono',monospace",letterSpacing:"0.1em",marginBottom:"14px"}}>── RISK BY TRANSPORT MODE</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={MODE_RISK_DATA} margin={{top:4,right:4,left:-24,bottom:0}} barSize={24}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0D2035" vertical={false}/>
            <XAxis dataKey="mode" tick={{fill:"#2A5070",fontSize:10,fontFamily:"Space Mono"}} tickLine={false} axisLine={false}/>
            <YAxis tick={{fill:"#2A5070",fontSize:9}} tickLine={false} axisLine={false}/>
            <Tooltip content={<DashChartTip/>}/>
            <Bar dataKey="critical" stackId="a" fill="#E53935" name="Critical"/>
            <Bar dataKey="moderate" stackId="a" fill="#F59E0B" name="Moderate"/>
            <Bar dataKey="low"      stackId="a" fill="#10B981" name="Low" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Trade lane risk bars */}
      <div style={{background:"#0A1E30",border:"1px solid #0D2A3F",borderRadius:"8px",padding:"18px 20px"}}>
        <div style={{fontSize:"9px",fontWeight:"600",color:"#2A5070",fontFamily:"'Space Mono',monospace",letterSpacing:"0.1em",marginBottom:"16px"}}>── TRADE LANE RISK SCORE</div>
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          {[...LANE_DATA].sort((a,b)=>b.score-a.score).map(l=>(
            <div key={l.lane}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",fontFamily:"'Space Mono',monospace",marginBottom:"4px"}}>
                <span style={{color:"#4A7090"}}>{l.lane}</span>
                <span style={{color:laneColor(l.score),fontWeight:"700"}}>{l.score}</span>
              </div>
              <div style={{height:"6px",background:"#0D2035",borderRadius:"4px",overflow:"hidden"}}>
                <div style={{width:`${l.score}%`,height:"100%",background:`linear-gradient(90deg,${laneColor(l.score)}88,${laneColor(l.score)})`,borderRadius:"4px",transition:"width 0.6s ease"}}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{marginTop:"12px",fontSize:"9px",color:"#1A3050",fontFamily:"'Space Mono',monospace"}}>SCORE 0–100 · 75+ CRITICAL · 50–74 MODERATE · &lt;50 LOW</div>
      </div>
    </div>

    {/* Divider */}
    <div style={{borderTop:"1px solid #0D2035",marginBottom:"20px"}}/>
    <div style={{fontSize:"9px",fontWeight:"700",color:"#2A5070",fontFamily:"'Space Mono',monospace",letterSpacing:"0.12em",marginBottom:"16px"}}>── ACTIVE SHIPMENTS BY RISK LEVEL</div>

    {/* Risk sections */}
    <DashSection title="Critical"  count={critical.length} accent="#E53935" icon="🔴" shipments={critical} defaultOpen={true}/>
    <DashSection title="Moderate"  count={moderate.length} accent="#F59E0B" icon="🟡" shipments={moderate} defaultOpen={true}/>
    <DashSection title="Low Risk"  count={low.length}      accent="#10B981" icon="🟢" shipments={low}       defaultOpen={false}/>
  </div>;
}


// ── App ───────────────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("dashboard");
  const [sel,setSel]=useState(null);
  const [origin,setOrigin]=useState(""); const [dest,setDest]=useState("");
  const [transit,setTransit]=useState(""); const [cargo,setCargo]=useState("");
  const [mode,setMode]=useState("sea"); const [aq,setAq]=useState(null);

  const EXAMPLES=[
    {origin:"Busan, South Korea",  dest:"Felixstowe, UK",      transit:"Suez Canal",                        cargo:"Electronics",      mode:"sea"},
    {origin:"Hong Kong",           dest:"Los Angeles, USA",     transit:"Pacific Ocean",                     cargo:"Consumer Goods",   mode:"sea"},
    {origin:"Mumbai, India",       dest:"Chicago, USA",         transit:"Frankfurt, Germany",                cargo:"Textiles",         mode:"air"},
    {origin:"Toronto, Canada",     dest:"Mexico City, Mexico",  transit:"Detroit-Windsor, I-75, I-69",       cargo:"Automotive Parts", mode:"road"},
    {origin:"Hamburg, Germany",    dest:"Warsaw, Poland",       transit:"A2 Autobahn, Frankfurt Oder",       cargo:"Machinery",        mode:"road"},
  ];

  const tabs=[{key:"dashboard",label:"📊  DASHBOARD"},{key:"shipments",label:"📦  ERP SHIPMENTS"},{key:"query",label:"🔍  ROUTE RISK QUERY"},{key:"benchmarks",label:"📈  FREIGHT BENCHMARKS"}];

  return (
    <div style={{minHeight:"100vh",background:"#060F1C",backgroundImage:"radial-gradient(ellipse at 15% 15%,rgba(0,50,120,0.18) 0%,transparent 55%),radial-gradient(ellipse at 85% 85%,rgba(0,25,70,0.2) 0%,transparent 55%)",color:"#E8F4FF"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=IBM+Plex+Sans:wght@300;400;600&display=swap');
        @keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#060F1C} ::-webkit-scrollbar-thumb{background:#1A3050;border-radius:2px}
      `}</style>

      {/* Header */}
      <div style={{borderBottom:"1px solid #0D2035",padding:"14px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(6,15,28,0.95)",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(10px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
          <div style={{width:"32px",height:"32px",background:"linear-gradient(135deg,#00B4FF,#0044CC)",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px"}}>◈</div>
          <div>
            <div style={{fontFamily:"'Space Mono',monospace",fontWeight:"bold",fontSize:"13px",letterSpacing:"0.1em"}}>ORACLE FREIGHT</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:"9px",color:"#2A5070",letterSpacing:"0.15em"}}>PREDICTIVE SHIPMENT INTELLIGENCE · SEA · AIR · ROAD</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"6px"}}><div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#00E676",boxShadow:"0 0 8px #00E676",animation:"pulse 2s ease-in-out infinite"}}/><span style={{color:"#2A6040",fontFamily:"'Space Mono',monospace",fontSize:"9px",letterSpacing:"0.1em"}}>LIVE FEED</span></div>
          <div style={{color:"#1A3050",fontFamily:"'Space Mono',monospace",fontSize:"9px"}}>{new Date().toUTCString().slice(0,25)} UTC</div>
        </div>
      </div>

      <div style={{maxWidth:"960px",margin:"0 auto",padding:"28px 24px"}}>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"24px"}}>
          {[{label:"ACTIVE SHIPMENTS",value:"3",color:"#00B4FF"},{label:"CRITICAL ALERTS",value:"2",color:"#FF3B3B"},{label:"INDICES TRACKED",value:"15",color:"#A78BFA"},{label:"MODES COVERED",value:"3",color:"#34D399"}].map((s,i)=>(
            <div key={i} style={{background:"#0A1E30",border:"1px solid #0D2A3F",borderRadius:"8px",padding:"14px 16px",borderTop:`2px solid ${s.color}33`}}>
              <div style={{color:s.color,fontFamily:"'Space Mono',monospace",fontSize:"22px",fontWeight:"bold"}}>{s.value}</div>
              <div style={{color:"#1E4060",fontFamily:"'Space Mono',monospace",fontSize:"9px",letterSpacing:"0.12em",marginTop:"4px"}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:0,marginBottom:"24px",borderBottom:"1px solid #0D2035"}}>
          {tabs.map(t=>(
            <button key={t.key} onClick={()=>{setTab(t.key);setSel(null);setAq(null);}} style={{background:"none",border:"none",borderBottom:`2px solid ${tab===t.key?"#00B4FF":"transparent"}`,color:tab===t.key?"#00B4FF":"#2A5070",padding:"10px 20px",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:"10px",letterSpacing:"0.1em",transition:"all 0.2s"}}>{t.label}</button>
          ))}
        </div>

        {/* ERP Shipments */}
        {tab==="shipments"&&!sel&&<div style={{animation:"slideIn 0.3s ease"}}><div style={{color:"#2A4A6A",fontFamily:"'Space Mono',monospace",fontSize:"10px",letterSpacing:"0.12em",marginBottom:"16px"}}>── LIVE FROM ERP / FREIGHT FORWARDING SYSTEM · {mockShipments.length} ACTIVE · ALL MODES</div><div style={{display:"flex",flexDirection:"column",gap:"12px"}}>{mockShipments.map((s,i)=><ShipmentCard key={i} shipment={s} onClick={()=>setSel(s)}/>)}</div></div>}
        {tab==="shipments"&&sel&&<ShipmentDetail shipment={sel} onBack={()=>setSel(null)}/>}

        {/* Route Query */}
        {tab==="query"&&!aq&&(
          <div style={{animation:"slideIn 0.3s ease"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"28px",alignItems:"start"}}>
              <div>
                <div style={{color:"#2A4A6A",fontFamily:"'Space Mono',monospace",fontSize:"10px",letterSpacing:"0.12em",marginBottom:"20px"}}>── MANUAL ROUTE ASSESSMENT</div>
                <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
                  <TxtIn value={origin} onChange={setOrigin} placeholder="e.g. Busan, South Korea" label="ORIGIN PORT / AIRPORT / DEPOT"/>
                  <TxtIn value={dest}   onChange={setDest}   placeholder="e.g. Hamburg, Germany"   label="DESTINATION"/>
                  <TxtIn value={transit} onChange={setTransit} placeholder="e.g. Suez Canal  or  I-90, Detroit" label="TRANSIT POINTS / CORRIDORS (optional)"/>
                  <TxtIn value={cargo}  onChange={setCargo}  placeholder="e.g. Lithium batteries, Chemicals" label="CARGO TYPE (optional)"/>
                  <div>
                    <label style={{color:"#3A6080",fontFamily:"'Space Mono',monospace",fontSize:"10px",letterSpacing:"0.1em",display:"block",marginBottom:"8px"}}>TRANSPORT MODE</label>
                    <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                      {[{key:"sea",label:"🚢 Vessel"},{key:"air",label:"✈ Air Cargo"},{key:"road",label:"🚛 Road"}].map(m=>(
                        <button key={m.key} onClick={()=>setMode(m.key)} style={{background:mode===m.key?`${MODE_COLOR[m.key]}18`:"#08182A",border:`1px solid ${mode===m.key?MODE_COLOR[m.key]:"#1A3050"}`,borderRadius:"6px",color:mode===m.key?MODE_COLOR[m.key]:"#2A5070",padding:"9px 20px",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:"11px",transition:"all 0.2s"}}>{m.label}</button>
                      ))}
                    </div>
                  </div>
                  {mode==="road"&&<div style={{background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:"6px",padding:"10px 14px",display:"flex",alignItems:"flex-start",gap:"8px"}}><span style={{fontSize:"13px",marginTop:"1px"}}>🛣</span><span style={{color:"#34D399",fontFamily:"'Space Mono',monospace",fontSize:"9px",lineHeight:"1.6",letterSpacing:"0.05em"}}>Road mode assesses highway corridor risks, border crossing wait times, weather closures, and driver hours compliance.</span></div>}
                  <div>
                    <div style={{color:"#2A4A6A",fontFamily:"'Space Mono',monospace",fontSize:"9px",letterSpacing:"0.1em",marginBottom:"8px"}}>TRY AN EXAMPLE ROUTE</div>
                    <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
                      {EXAMPLES.map((ex,i)=><button key={i} onClick={()=>{setOrigin(ex.origin);setDest(ex.dest);setTransit(ex.transit);setCargo(ex.cargo);setMode(ex.mode);}} style={{background:"#08182A",border:"1px solid #1A3050",borderRadius:"6px",color:"#3A6080",padding:"7px 12px",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:"10px",textAlign:"left",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#2A5070";e.currentTarget.style.color="#5A8AA8";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#1A3050";e.currentTarget.style.color="#3A6080";}}>{MODE_ICON[ex.mode]} {ex.origin} → {ex.dest} <span style={{color:"#1A3050",marginLeft:"6px"}}>({ex.cargo})</span></button>)}
                    </div>
                  </div>
                  <button onClick={()=>{if(origin&&dest)setAq({origin,destination:dest,transit,cargo,mode});}} disabled={!origin||!dest} style={{background:origin&&dest?"linear-gradient(135deg,rgba(0,180,255,0.15),rgba(0,68,204,0.15))":"#0A1E30",border:`1px solid ${origin&&dest?"#00B4FF":"#1A3050"}`,borderRadius:"8px",color:origin&&dest?"#00B4FF":"#1A3050",padding:"13px",cursor:origin&&dest?"pointer":"not-allowed",fontFamily:"'Space Mono',monospace",fontSize:"11px",letterSpacing:"0.1em",marginTop:"4px",transition:"all 0.2s"}}>▶ ASSESS ROUTE RISKS</button>
                </div>
              </div>
              <div style={{background:"#0A1E30",border:"1px solid #0D2A3F",borderRadius:"10px",padding:"22px"}}>
                <div style={{color:"#2A5070",fontFamily:"'Space Mono',monospace",fontSize:"10px",letterSpacing:"0.12em",marginBottom:"18px"}}>── INTELLIGENCE COVERAGE</div>
                {[{icon:"🛡",label:"Security & Piracy",desc:"High-risk corridors, conflict zones, militant activity near trade routes"},{icon:"🌩",label:"Weather & Environment",desc:"Storms, cyclones, monsoons, ice storms, road weather warnings"},{icon:"📋",label:"Regulatory & Customs",desc:"Export controls, sanctions, documentation, border inspection regimes"},{icon:"⚓",label:"Port & Airport Congestion",desc:"Berth availability, vessel queues, ATC delays, cargo dwell times"},{icon:"🛣",label:"Highway Incidents",desc:"Real-time accidents, road closures, construction, flood impacts on corridors"},{icon:"🚧",label:"Border Crossing Wait Times",desc:"Live CBSA, US CBP, and EU border crossing delays for commercial vehicles"},{icon:"🌐",label:"Geopolitical Tensions",desc:"Trade restrictions, diplomatic incidents, canal closures, disputes"},{icon:"🚫",label:"Sanctions Exposure",desc:"OFAC, EU, UN sanctions affecting origin, destination or transit"},].map((item,i)=>(
                  <div key={i} style={{display:"flex",gap:"12px",marginBottom:"13px",alignItems:"flex-start"}}>
                    <span style={{fontSize:"14px",marginTop:"1px",flexShrink:0}}>{item.icon}</span>
                    <div><div style={{color:"#7AB0CC",fontFamily:"'Space Mono',monospace",fontSize:"11px",marginBottom:"2px"}}>{item.label}</div><div style={{color:"#2A4A6A",fontFamily:"'IBM Plex Sans',sans-serif",fontSize:"11px",lineHeight:"1.5"}}>{item.desc}</div></div>
                  </div>
                ))}
                <div style={{borderTop:"1px solid #0D2035",paddingTop:"14px",marginTop:"4px",display:"flex",alignItems:"center",gap:"8px"}}><div style={{width:"20px",height:"20px",borderRadius:"50%",background:"linear-gradient(135deg,#00B4FF,#0066FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",flexShrink:0}}>✦</div><span style={{color:"#2A5070",fontFamily:"'Space Mono',monospace",fontSize:"9px",lineHeight:"1.5"}}>AI-powered assessment using real-world intelligence across all three transport modes</span></div>
              </div>
            </div>
          </div>
        )}
        {tab==="query"&&aq&&<LiveRouteAssessment query={aq} onReset={()=>setAq(null)}/>}

        {/* Dashboard */}
        {tab==="dashboard"&&<DashboardTab/>}

        {/* Benchmarks */}
        {tab==="benchmarks"&&<BenchmarksTab/>}
      </div>
    </div>
  );
}
