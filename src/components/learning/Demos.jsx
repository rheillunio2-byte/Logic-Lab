import React, { useMemo, useState } from "react";
import { createState, settle, pulseClock, pinKey, inputValue, syncState } from "../../engine/simulator.js";
import { getExample } from "../../data/examples.js";
import { Bit } from "../truth-table/TruthTableView.jsx";

export function BinaryDemo() {
  const [bits, setBits] = useState([1, 0, 1, 1]);
  const n = bits.reduce((a, b) => a * 2 + b, 0);
  return <div className="demo" aria-label="Binary to decimal converter"><div className="bits">{bits.map((b, i) => <button key={i} className={`bit-toggle ${b ? "on" : ""}`} aria-pressed={!!b} aria-label={`Bit ${3 - i}, value ${2 ** (3 - i)}`} onClick={() => setBits(x => x.map((v, j) => (j === i ? 1 - v : v)))}><small>{2 ** (3 - i)}</small>{b}</button>)}</div>
    <p className="demo-out">Binary <b className="mono">{bits.join("")}</b> = decimal <b>{n}</b> = hex <b className="mono">{n.toString(16).toUpperCase()}</b></p></div>;
}
/** Interactive copy of an example circuit: toggle switches, pulse the clock, read LEDs. */
export function MiniCircuit({ exampleId, note }) {
  const ex = getExample(exampleId);
  const [circuit, setCircuit] = useState(ex.circuit), [st, setSt] = useState(() => settle(ex.circuit, createState(ex.circuit)));
  const hasClock = circuit.components.some(c => c.type === "CLOCK");
  const toggle = id => { const c = { ...circuit, components: circuit.components.map(x => (x.id === id ? { ...x, props: { ...x.props, value: x.props.value ? 0 : 1 } } : x)) }; setCircuit(c); setSt(settle(c, syncState(c, st.state))); };
  const pulse = () => setSt(pulseClock(circuit, st.state));
  const reset = () => setSt(settle(circuit, createState(circuit)));
  const outputs = useMemo(() => circuit.components.filter(c => c.type === "LED").map(l => ({ name: l.name, v: inputValue(circuit, st, l.id, "IN") })), [circuit, st]);
  const bin = circuit.components.find(c => c.type === "BINOUT");
  return <div className="demo"><p className="muted small">{note}</p><div className="demo-row">
    <div><h4>Inputs</h4>{circuit.components.filter(c => c.type === "SWITCH").map(s => <button key={s.id} className={`bit-toggle ${s.props.value ? "on" : ""}`} aria-pressed={!!s.props.value} onClick={() => toggle(s.id)}><small>{s.name}</small>{s.props.value}</button>)}{hasClock && <button className="btn" onClick={pulse}>Pulse clock</button>}{hasClock && <button className="btn" onClick={reset}>Reset</button>}</div>
    <div><h4>Outputs</h4>{outputs.map(o => <span key={o.name} className="out-chip"><small>{o.name}</small><Bit v={o.v} out /></span>)}
      {bin && <span className="out-chip"><small>{bin.name}</small><b>{[0, 1, 2].reduce((a, k) => a | ((inputValue(circuit, st, bin.id, `D${k}`) ?? 0) << k), 0)}</b></span>}</div></div>
    {st.errors.length > 0 && <p className="alert error">{st.errors[0]}</p>}</div>;
}
