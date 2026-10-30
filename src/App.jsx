import React, { useMemo, useState } from "react";
import { Activity, ArrowDownUp, BookOpen, Check, ChevronDown, CircleHelp, Clock3, Cpu, Download, GitBranch, Lightbulb, Plus, RotateCcw, Sparkles, Table2, ToggleLeft, Trash2, Zap } from "lucide-react";
import { evaluateCircuit, gateSpecs, makeTruthTable } from "./logic";

const starter = [
  { id:"a", type:"INPUT", name:"A", value:0, inputs:[] },
  { id:"b", type:"INPUT", name:"B", value:1, inputs:[] },
  { id:"g1", type:"AND", name:"AND 1", inputs:["a","b"] },
  { id:"out", type:"OUTPUT", name:"Output", inputs:["g1"] }
];
const uid = () => `n${Math.random().toString(36).slice(2,8)}`;
const short = id => id?.toUpperCase() || "—";

function App() {
  const [nodes,setNodes] = useState(starter);
  const [selected,setSelected] = useState("g1");
  const [tab, setTab] = useState("builder");
  const [clock,setClock] = useState(0);
  const [notice,setNotice] = useState("");
  const result = useMemo(() => {
    try { return { values:evaluateCircuit(nodes), error:"" }; }
    catch(e) { return { values:new Map(), error:e.message }; }
  },[nodes,clock]);
  const truth = useMemo(() => {
    try { return { data:makeTruthTable(nodes), error:"" }; }
    catch(e) { return { data:null, error:e.message }; }
  },[nodes]);
  const inputs = nodes.filter(n=>n.type==="INPUT");
  const outputs = nodes.filter(n=>n.type==="OUTPUT");
  const selectedNode = nodes.find(n=>n.id===selected);
  const update = (id,patch) => setNodes(old=>old.map(n=>n.id===id?{...n,...patch}:n));
  const addNode = type => {
    const id=uid(), count=nodes.filter(n=>n.type===type).length+1;
    const node={id,type,name:type==="INPUT"?`Input ${count}`:type==="OUTPUT"?`Output ${count}`:type==="DFF"?`D Flip-Flop ${count}`:`${type} ${count}`,value:0,q:0,inputs:Array(type==="NOT"||type==="OUTPUT"||type==="DFF"?1:type==="INPUT"?0:2).fill("")};
    setNodes(old=>[...old,node]); setSelected(id); setNotice(`${node.name} added`);
  };
  const removeNode = id => {
    setNodes(old=>old.filter(n=>n.id!==id).map(n=>({...n,inputs:(n.inputs||[]).map(x=>x===id?"":x)})));
    if(selected===id)setSelected(""); setNotice("Component removed");
  };
  const setConnection = (id,index,source) => update(id,{inputs:(nodes.find(n=>n.id===id).inputs||[]).map((x,i)=>i===index?source:x)});
  const toggleInput = id => update(id,{value: nodes.find(n=>n.id===id).value?0:1});
  const pulseClock = () => {
    // Positive-edge D flip-flop: capture D on a clock pulse. All D inputs are sampled together.
    let sampled;
    try { sampled=evaluateCircuit(nodes); }
    catch(e) { setNotice(e.message); return; }
    setNodes(old=>old.map(n=>n.type==="DFF"?{...n,q:Number(sampled.get(n.inputs?.[0])??0)}:n));
    setClock(c=>c+1); setNotice("Rising clock edge: flip-flop state captured");
  };
  const reset = () => {setNodes(starter);setSelected("g1");setClock(0);setNotice("Starter circuit restored");};
  const exportCSV = () => {
    if(!truth.data){setNotice(truth.error);return;}
    const {inputs:ins,outputs:outs,rows}=truth.data;
    const lines=[[...ins.map(n=>n.name),...outs.map(n=>n.name)].join(","),...rows.map(r=>[...r.inputs,...r.outputs].join(","))];
    const blob=new Blob([lines.join("\n")],{type:"text/csv"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="logiclab-truth-table.csv";a.click();URL.revokeObjectURL(url);
  };
  const valueOf = id => result.values.get(id) ?? 0;
  const sources = nodes.filter(n=>n.type!=="OUTPUT");
  const renderNode = n => {
    const isOn=n.type==="INPUT"?n.value:n.type==="DFF"?n.q:valueOf(n.id);
    return <button key={n.id} className={`component ${selected===n.id?"selected":""}`} onClick={()=>setSelected(n.id)}>
      <span className={`node-icon ${isOn?"on":""}`}>{n.type==="INPUT"?<ToggleLeft size={17}/>:n.type==="OUTPUT"?<Zap size={17}/>:n.type==="DFF"?<Clock3 size={17}/>:<Cpu size={17}/>}</span>
      <span className="node-main"><b>{n.name}</b><small>{n.type==="INPUT"?"Manual input":n.type==="OUTPUT"?"Circuit output":n.type==="DFF"?"Edge-triggered memory":"Logic gate"}</small></span>
      <span className={`value-pill ${isOn?"high":""}`}>{isOn?"HIGH · 1":"LOW · 0"}</span>
    </button>;
  };
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Activity size={21}/></div><div><strong>LogicLab</strong><span>DIGITAL LOGIC STUDIO</span></div></div>
      <div className="side-label">WORKSPACE</div>
      <button
        className={`side-link ${tab === "builder" ? "active" : ""}`}
        onClick={() => setTab("builder")}
      >
        <GitBranch size={17} /> Circuit builder <span className="live-dot" />
      </button>

      <button
        className={`side-link ${tab === "truth" ? "active" : ""}`}
        onClick={() => setTab("truth")}
      >
        <Table2 size={17} /> Truth table
      </button>

      <button
        className={`side-link ${tab === "learn" ? "active" : ""}`}
        onClick={() => setTab("learn")}
      >
        <BookOpen size={17} /> Learning guide
      </button>
      <div className="side-bottom"><div className="help-card"><div className="help-icon"><Lightbulb size={17}/></div><b>Learn by building</b><p>Connect logic gates, change inputs, and watch Boolean expressions come to life.</p><button onClick={()=>setTab("learn")}>Explore guide <span>↗</span></button></div><div className="version">LOGICLAB <span>v1.0.0</span></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <b>Untitled circuit</b></div><div className="top-actions"><span className="saved"><i/> Local workspace</span><button className="icon-btn" title="Reset circuit" onClick={reset}><RotateCcw size={16}/></button><button className="primary small" onClick={exportCSV}><Download size={15}/> Export table</button></div></header>
      <div className="page">
        <div className="page-heading"><div><div className="eyebrow"><span/> INTERACTIVE SIMULATOR</div><h1>Digital Logic <em>Workbench</em></h1><p>Design, connect, and test digital circuits in real time.</p></div><div className="status-card"><div className="status-icon"><Zap size={18}/></div><div><small>SIMULATION STATUS</small><b>{result.error?"Needs attention":"Running"}</b></div><span className={`status-dot ${result.error?"bad":""}`}/></div></div>
        {tab === "builder" && (
          <>
            <div className="stats-row"><div className="stat"><span>COMPONENTS</span><b>{nodes.length.toString().padStart(2,"0")}</b><small>In this circuit</small></div><div className="stat"><span>INPUT SIGNALS</span><b>{inputs.length.toString().padStart(2,"0")}</b><small>Controllable variables</small></div><div className="stat"><span>OUTPUT SIGNALS</span><b>{outputs.length.toString().padStart(2,"0")}</b><small>Observed results</small></div><div className="stat"><span>CLOCK CYCLES</span><b>{clock.toString().padStart(2,"0")}</b><small>Rising edges applied</small></div></div>
                    <div className="workspace-grid">
                      <section className="panel builder-panel">
                        <div className="panel-head"><div><div className="panel-kicker">01 / DESIGN</div><h2>Circuit components</h2><p>Add components, then configure their connections.</p></div><span className="tag"><span/> LIVE</span></div>
                        <div className="toolbar"><span>ADD COMPONENT</span><div className="tool-buttons">{["INPUT","AND","OR","NOT","XOR","DFF","OUTPUT"].map(t=><button key={t} className={`tool ${t==="INPUT"||t==="OUTPUT"?"tool-special":""}`} onClick={()=>addNode(t)}><Plus size={13}/>{t==="DFF"?"D-FF":t}</button>)}</div></div>
                        <div className="component-list-head"><b>YOUR CIRCUIT</b><span>{nodes.length} nodes · select to edit</span></div>
                        <div className="component-list">{nodes.map(renderNode)}{nodes.length===0&&<div className="empty">Your circuit is empty. Add an input, a gate, and an output to begin.</div>}</div>
                        {result.error&&<div className="error-box"><CircleHelp size={16}/>{result.error}</div>}
                        <div className="panel-foot"><span><i className="legend-low"/> LOW (0)</span><span><i className="legend-high"/> HIGH (1)</span><span className="foot-note">Signals update automatically</span></div>
                      </section>
                      <section className="panel inspector-panel">
                        <div className="panel-head"><div><div className="panel-kicker">02 / INSPECT</div><h2>Component inspector</h2><p>Configure the selected component.</p></div><div className="inspector-symbol"><Cpu size={19}/></div></div>
                        {selectedNode?<div className="inspector-content">
                          <div className="selected-name"><div className="selected-type">{selectedNode.type==="DFF"?"D FLIP-FLOP":selectedNode.type}</div><h3>{selectedNode.name}</h3><span className={`value-pill ${(selectedNode.type==="INPUT"?selectedNode.value:selectedNode.type==="DFF"?selectedNode.q:valueOf(selectedNode.id))?"high":""}`}>{(selectedNode.type==="INPUT"?selectedNode.value:selectedNode.type==="DFF"?selectedNode.q:valueOf(selectedNode.id))?"HIGH · 1":"LOW · 0"}</span></div>
                          <label className="field-label">COMPONENT LABEL</label><input className="text-input" value={selectedNode.name} onChange={e=>update(selectedNode.id,{name:e.target.value})}/>
                          {selectedNode.type==="INPUT"?<><label className="field-label spaced">INPUT STATE</label><button className={`toggle-row ${selectedNode.value?"enabled":""}`} onClick={()=>toggleInput(selectedNode.id)}><span><b>Signal {selectedNode.value?"HIGH":"LOW"}</b><small>Click to toggle this input</small></span><span className="switch"><i/></span></button></>:selectedNode.type==="OUTPUT"?<><label className="field-label spaced">SIGNAL SOURCE</label><select className="text-input" value={selectedNode.inputs?.[0]||""} onChange={e=>setConnection(selectedNode.id,0,e.target.value)}><option value="">Select a source…</option>{sources.filter(n=>n.id!==selectedNode.id).map(n=><option key={n.id} value={n.id}>{n.name} ({n.type})</option>)}</select></>:<>{(selectedNode.inputs||[]).map((source,i)=><React.Fragment key={i}><label className="field-label spaced">INPUT {i+1} {selectedNode.type==="DFF"&&i===0?"· D":" "}</label><select className="text-input" value={source||""} onChange={e=>setConnection(selectedNode.id,i,e.target.value)}><option value="">Unconnected (0)</option>{sources.filter(n=>n.id!==selectedNode.id).map(n=><option key={n.id} value={n.id}>{n.name} ({n.type})</option>)}</select></React.Fragment>)}
                          {selectedNode.type==="DFF"&&<div className="dff-note"><Clock3 size={15}/> D flip-flop captures its D input on a rising clock edge. Current Q = <b>{selectedNode.q??0}</b>.</div>}</>}
                          <div className="inspector-divider"/><div className="inspector-actions"><button className="danger-btn" onClick={()=>removeNode(selectedNode.id)}><Trash2 size={15}/> Remove component</button></div>
                        </div>:<div className="empty inspector-empty">Select a component from the circuit list to inspect its settings.</div>}
                        {nodes.some(n=>n.type==="DFF")&&<div className="clock-card"><div><span className="panel-kicker">SEQUENTIAL CONTROL</span><b>Clock signal</b><small>Apply a rising edge to capture D → Q.</small></div><button className="clock-btn" onClick={pulseClock}><Clock3 size={15}/> Pulse clock</button></div>}
                      </section>
                    </div>
          </>
        )}
        {tab === "truth" && (
          <section className="panel lower-panel">
            <div className="lower-tabs"><div className="lower-tab-title"><Table2 size={16}/> Truth table</div><div className="tab-spacer"/><span><i/> AUTO-GENERATED</span></div>
            <div className="truth-content"></div><div className="truth-heading"><div><h2>Truth table</h2><p>All possible input combinations and their corresponding output values.</p></div>{truth.data&&<span className="row-count">{truth.data.rows.length} combinations</span>}</div>
                        {truth.error?<div className="notice"><CircleHelp size={17}/><div><b>Truth table unavailable</b><p>{truth.error}</p></div></div>:truth.data.rows.length===0?<div className="empty">Add at least one input and one output to generate a truth table.</div>:<div className="table-wrap"><table><thead><tr><th colSpan={truth.data.inputs.length||1}>INPUT VARIABLES</th><th colSpan={truth.data.outputs.length||1} className="output-head">OUTPUT VARIABLES</th></tr><tr>{truth.data.inputs.map(n=><th key={n.id}>{n.name}</th>)}{truth.data.outputs.map(n=><th className="output-col" key={n.id}>{n.name}</th>)}</tr></thead><tbody>{truth.data.rows.map((r,i)=><tr key={i}>{r.inputs.map((v,j)=><td key={j}><span className={`bit ${v?"one":""}`}>{v}</span></td>)}{r.outputs.map((v,j)=><td key={j}><span className={`bit output-bit ${v?"one":""}`}>{v}</span></td>)}</tr>)}</tbody></table></div>}
          </section>
          )}
        {tab === "learn" && (
          <section className="panel lower-panel">
            <div className="lower-tabs"><div className="lower-tab-title"><BookOpen size={16}/> Learning guide</div></div>
            <div className="guide-content"><div className="truth-heading"><div><h2>Logic gate reference</h2><p>Boolean operators used to build combinational logic.</p></div></div><div className="gate-grid">{Object.entries(gateSpecs).map(([key,s])=><div className="gate-card" key={key}><b>{key}</b><span>{s.description}</span><code>{key==="AND"?"Y = A · B":key==="OR"?"Y = A + B":key==="NOT"?"Y = ¬A":"Y = A ⊕ B"}</code></div>)}<div className="gate-card"><b>D FLIP-FLOP</b><span>Stores one bit; updates Q to D on a rising clock edge.</span><code>Q(next) = D (on ↑CLK)</code></div></div><div className="guide-tip"><Sparkles size={17}/><p><b>Try this:</b> Build A XOR B and inspect its truth table. XOR is HIGH only when exactly one input is HIGH.</p></div></div>
          </section>
        )}
        <footer><span>LogicLab <b>·</b> Built for learning digital logic</span><span>BOOLEAN ALGEBRA <b>·</b> CIRCUIT SIMULATION <b>·</b> CORE CS</span></footer>
      </div>
    </main>
    {notice&&<div className="toast"><Check size={15}/>{notice}<button onClick={()=>setNotice("")}>×</button></div>}
  </div>;
}
export default App;
