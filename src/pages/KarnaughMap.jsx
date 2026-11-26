import React, { useMemo, useState } from "react";
import { solveKMap } from "../engine/karnaugh.js";

const COLORS = ["#22d3ee", "#f59e0b", "#a78bfa", "#34d399", "#f472b6", "#60a5fa", "#fb7185", "#facc15"];
export default function KarnaughMap() {
  const [n, setN] = useState(4), [mode, setMode] = useState("min"), [vals, setVals] = useState(() => Array.from({ length: 16 }, (_, i) => ([0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15].includes(i) ? 1 : 0)));
  const resize = k => { setN(k); setVals(v => Array.from({ length: 2 ** k }, (_, i) => v[i] ?? 0)); };
  const sol = useMemo(() => solveKMap(n, vals.slice(0, 2 ** n)), [n, vals]);
  const L = sol.layout, groups = mode === "min" ? sol.sopGroups : sol.posGroups;
  const cycle = m => setVals(v => v.map((x, i) => (i === m ? (mode === "min" ? (x === 0 ? 1 : x === 1 ? "X" : 0) : (x === 1 ? 0 : x === 0 ? "X" : 1)) : x)));
  const shadow = m => { const idx = groups.flatMap((g, gi) => (g.cells.some(c => c.m === m) ? [gi] : [])); return idx.map((gi, k) => `inset 0 0 0 ${2 + k * 3}px ${COLORS[gi % COLORS.length]}`).join(", "); };
  const clear = v => setVals(Array(2 ** n).fill(v));
  const rowLab = L.rowVars.join(""), colLab = L.colVars.join("");
  return <div className="page"><div className="page-head"><div><h1>Karnaugh Map Solver</h1><p>Mark minterms (1), maxterms (0) and don't-cares (X). Rows and columns use Gray code, and groups may wrap around the edges.</p></div></div>
    <section className="panel">
      <div className="controls">
        <label className="field inline"><span>Variables</span><select className="input" value={n} onChange={e => resize(+e.target.value)}>{[2, 3, 4].map(k => <option key={k}>{k}</option>)}</select></label>
        <div className="seg-control" role="radiogroup" aria-label="Selection mode">{[["min", "Minterms (1s) → SOP"], ["max", "Maxterms (0s) → POS"]].map(([id, l]) => <button key={id} role="radio" aria-checked={mode === id} className={mode === id ? "active" : ""} onClick={() => setMode(id)}>{l}</button>)}</div>
        <button className="btn small" onClick={() => clear(0)}>All 0</button><button className="btn small" onClick={() => clear(1)}>All 1</button>
      </div>
      <p className="muted small">Click a cell to cycle {mode === "min" ? "0 → 1 → X" : "1 → 0 → X"}. Cell numbers are minterm indices.</p>
      <div className="kmap-wrap"><table className="kmap" aria-label={`${n}-variable Karnaugh map`}><thead><tr><th className="corner">{rowLab}\{colLab}</th>{L.colLabels.map(l => <th key={l}>{l}</th>)}</tr></thead>
        <tbody>{L.cells.map((row, r) => <tr key={r}><th>{L.rowLabels[r]}</th>{row.map(m => <td key={m}><button className={`kcell v${vals[m]}`} style={{ boxShadow: shadow(m) }} onClick={() => cycle(m)} aria-label={`Minterm ${m}, value ${vals[m]}`}><span className="kv">{vals[m]}</span><span className="km">{m}</span></button></td>)}</tr>)}</tbody></table></div>
    </section>
    <section className="panel"><h2>Simplified expression</h2>
      <dl className="results"><dt>Sum of products (groups of 1s)</dt><dd className={`mono strong ${mode === "min" ? "hl" : ""}`}>F = {sol.sop}</dd><dt>Product of sums (groups of 0s)</dt><dd className={`mono strong ${mode === "max" ? "hl" : ""}`}>F = {sol.pos}</dd></dl>
      <h3>Groups {mode === "min" ? "(of 1s and X)" : "(of 0s and X)"}</h3>
      {groups.length ? <ul className="legend">{groups.map((g, i) => <li key={i}><i style={{ background: COLORS[i % COLORS.length] }} /> <b className="mono">{g.term}</b> <span className="muted">covers m{g.cells.map(c => c.m).sort((a, b) => a - b).join(", m")}{g.essential ? " · essential" : ""}</span></li>)}</ul> : <p className="muted">No groups: the function is constant here.</p>}
      <h3>How it was solved</h3><ol className="plain">{sol.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      <p className="muted small">Groups are computed with Quine–McCluskey and an exact minimum cover; every group is a power-of-two rectangle that may wrap around the map edges.</p>
    </section></div>;
}
