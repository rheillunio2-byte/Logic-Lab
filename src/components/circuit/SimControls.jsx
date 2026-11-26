import React from "react";
import { Pause, Play, RotateCcw, StepForward, Clock3, AlertTriangle } from "lucide-react";

export default function SimControls({ sim, circuit }) {
  const { result, hasClock } = sim, errs = result.errors, warns = result.warnings;
  const sequential = circuit.components.some(c => ["DFF", "JKFF", "TFF", "SR_LATCH", "D_LATCH"].includes(c.type));
  return <div className="sim" role="region" aria-label="Simulation controls">
    <div className="sim-head"><div className="panel-title">Simulation</div><span className={`status ${errs.length ? "bad" : "ok"}`}>{errs.length ? "Needs attention" : "Running"}</span></div>
    {errs.map((e, i) => <div className="alert error" role="alert" key={i}><AlertTriangle size={15} /> {e}</div>)}
    {hasClock ? <div className="sim-row">
      <div className="clock-badge" title="Current clock level"><Clock3 size={14} /> CLK <b className={sim.clock ? "hi" : "lo"}>{sim.clock}</b></div>
      <button className="btn" onClick={sim.step} disabled={!!errs.length || sim.running} title="One full clock cycle (rising then falling edge)"><StepForward size={15} /> Pulse</button>
      <button className="btn" onClick={sim.halfStep} disabled={!!errs.length || sim.running} title="Toggle the clock level once (a LOW→HIGH change is a rising edge)">Toggle</button>
      <button className={`btn ${sim.running ? "active" : ""}`} onClick={() => sim.setRunning(!sim.running)} disabled={!!errs.length}>{sim.running ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Run</>}</button>
      <label className="inline">Speed <select className="input" value={sim.hz} onChange={e => sim.setHz(+e.target.value)} aria-label="Clock speed">{[1, 2, 4, 8].map(h => <option key={h} value={h}>{h} Hz</option>)}</select></label>
      <button className="btn" onClick={sim.reset} title="Reset all memory elements to 0 and clear the timing diagram"><RotateCcw size={15} /> Reset</button>
      <span className="muted small">Cycles: {sim.cycles}</span>
    </div> : <div className="sim-row">{sequential ? <span className="muted small">Add a Clock component to drive flip-flops.</span> : <span className="muted small">Combinational circuit: signals update instantly when you toggle a switch.</span>}{sequential && <button className="btn" onClick={sim.reset}><RotateCcw size={15} /> Reset</button>}</div>}
    {warns.length > 0 && <details className="warnings"><summary>{warns.length} warning{warns.length > 1 ? "s" : ""}</summary><ul>{warns.slice(0, 20).map((w, i) => <li key={i}>{w.message}</li>)}</ul></details>}
  </div>;
}
