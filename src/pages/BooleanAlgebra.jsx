import React, { useMemo, useState } from "react";
import { tryParse, truthTableOf, equivalent, variablesOf, toExpression, MAX_VARS } from "../engine/booleanParser.js";
import { simplify, expressionFromTruthTable } from "../engine/simplifier.js";
import { useWorkspace } from "../state/WorkspaceContext.jsx";
import TruthTableView from "../components/truth-table/TruthTableView.jsx";
import { copyText } from "../utils/download.js";
import { parseHash } from "../hooks/useHashRoute.js";

const EXAMPLES = ["A'B + AB'", "A + A'B", "(A + B)(A + B')", "(A NAND B) NOR C", "AB + A'C + BC", "A ^ B ^ C"];
const Err = ({ r }) => <div className="alert error" role="alert">{r.error}{r.pos !== undefined && <pre className="caret">{r.src}{"\n"}{" ".repeat(Math.min(r.pos, r.src.length))}^</pre>}</div>;

function Simplify({ initial }) {
  const { toast } = useWorkspace();
  const [src, setSrc] = useState(initial || "A'B + AB' + AB");
  const parsed = useMemo(() => { const p = tryParse(src); return p.ok ? p : { ...p, src }; }, [src]);
  const report = useMemo(() => { if (!parsed.ok) return null; try { return { ok: true, ...simplify(parsed.ast) }; } catch (e) { return { ok: false, error: e.message }; } }, [parsed]);
  const table = useMemo(() => { if (!parsed.ok) return null; try { const t = truthTableOf(parsed.ast); return { ok: true, kind: "combinational", inputs: t.vars.length ? t.vars : ["—"], outputs: ["F"], rows: t.rows.map(r => ({ inputs: t.vars.length ? r.inputs : [0], outputs: [r.output] })) }; } catch (e) { return { ok: false, error: e.message }; } }, [parsed]);
  return <>
    <section className="panel">
      <label className="field"><span>Boolean expression</span><input className="input mono big" value={src} onChange={e => setSrc(e.target.value)} spellCheck={false} aria-describedby="notation" aria-invalid={!parsed.ok} /></label>
      <div className="chips">{EXAMPLES.map(e => <button key={e} className="chip" onClick={() => setSrc(e)}>{e}</button>)}</div>
      <details className="notation" id="notation"><summary>Notation guide</summary><ul>
        <li><b>NOT:</b> <code>A'</code>, <code>!A</code>, <code>~A</code>, <code>NOT A</code></li><li><b>AND:</b> <code>AB</code>, <code>A·B</code>, <code>A&amp;B</code>, <code>A*B</code>, <code>A AND B</code></li>
        <li><b>OR:</b> <code>A+B</code>, <code>A|B</code>, <code>A OR B</code></li><li><b>XOR:</b> <code>A^B</code>, <code>A⊕B</code>, <code>A XOR B</code> · <b>NAND / NOR / XNOR:</b> keywords <code>NAND</code>, <code>NOR</code>, <code>XNOR</code></li>
        <li>Precedence: NOT, then AND/NAND, then XOR/XNOR, then OR/NOR. NAND/NOR/XNOR chains group left to right. Constants: 0 and 1.</li>
        <li>Variables are single letters or a letter followed by digits/underscores (<code>A1</code>). Adjacent letters mean AND, so <code>AB</code> is A·B. Up to {MAX_VARS} variables.</li></ul></details>
      {!parsed.ok && <Err r={parsed} />}
    </section>
    {report && !report.ok && <div className="alert error">{report.error}</div>}
    {report?.ok && <>
      <section className="panel"><h2>Result</h2>
        <dl className="results"><dt>Parsed as</dt><dd className="mono">{report.original}</dd><dt>Algebraic simplification</dt><dd className="mono strong">F = {report.algebraic}</dd>
          {report.sop !== undefined && <><dt>Minimal sum of products</dt><dd className="mono strong">F = {report.sop}</dd><dt>Minimal product of sums</dt><dd className="mono strong">F = {report.pos}</dd><dt>Canonical SOP (minterms)</dt><dd className="mono">{report.canonicalSOP ?? "—"}</dd></>}</dl>
        {report.note && <p className="alert warn">{report.note}</p>}
        <button className="btn small" onClick={async () => toast((await copyText(report.sop ?? report.algebraic)) ? "Result copied" : "Copy failed", "info")}>Copy minimal SOP</button>
      </section>
      <section className="panel"><h2>Step-by-step simplification</h2>
        {report.steps.length === 0 ? <p className="muted">The expression is already in simplest algebraic form (no laws apply).</p> : <ol className="steps">{report.steps.map((s, i) => <li key={i}><span className="rule">{s.rule}</span><code>{s.expression}</code></li>)}</ol>}
        {!report.complete && <p className="alert warn">Stopped after 200 steps; the exact minimal forms above are still correct.</p>}
        {report.qm && <><h3>Exact minimisation (Quine–McCluskey)</h3><ul className="plain">{report.qm.map((l, i) => <li key={i}>{l}</li>)}</ul></>}
        <p className="muted small">Each algebraic step is checked against the original truth table; the minimal forms are verified to be equivalent before being shown.</p>
      </section>
      {table?.ok && <section className="panel"><h2>Truth table</h2><TruthTableView table={table} name="expression-truth-table" toast={toast} /></section>}
      {table && !table.ok && <div className="alert error">{table.error}</div>}
    </>}
  </>;
}

function Compare() {
  const [a, setA] = useState("A + A'B"), [b, setB] = useState("A + B");
  const pa = useMemo(() => { const p = tryParse(a); return p.ok ? p : { ...p, src: a }; }, [a]), pb = useMemo(() => { const p = tryParse(b); return p.ok ? p : { ...p, src: b }; }, [b]);
  const eq = pa.ok && pb.ok ? (() => { try { return equivalent(pa.ast, pb.ast); } catch (e) { return { error: e.message }; } })() : null;
  return <section className="panel"><h2>Are two expressions equivalent?</h2>
    <label className="field"><span>Expression 1</span><input className="input mono" value={a} onChange={e => setA(e.target.value)} /></label>{!pa.ok && <Err r={pa} />}
    <label className="field"><span>Expression 2</span><input className="input mono" value={b} onChange={e => setB(e.target.value)} /></label>{!pb.ok && <Err r={pb} />}
    {eq?.error && <div className="alert error">{eq.error}</div>}
    {eq && !eq.error && (eq.equal ? <div className="alert ok" role="status">Equivalent: they give the same output for all {2 ** eq.vars.length} input combinations of {eq.vars.join(", ") || "(no variables)"}.</div>
      : <div className="alert error" role="status">Not equivalent. Counterexample: {Object.entries(eq.counterexample).map(([k, v]) => `${k}=${v}`).join(", ")}, where expression 1 gives {evalOne(pa.ast, eq.counterexample)} and expression 2 gives {evalOne(pb.ast, eq.counterexample)}.</div>)}
  </section>;
}
import { evaluateAst } from "../engine/booleanParser.js";
const evalOne = (ast, env) => evaluateAst(ast, env);

function FromTable() {
  const [n, setN] = useState(3), [cells, setCells] = useState(() => Array(8).fill(0).map((_, i) => ([1, 2, 4, 7].includes(i) ? 1 : 0)));
  const vars = "ABCDE".slice(0, n).split("");
  const resize = k => { setN(k); setCells(Array.from({ length: 2 ** k }, (_, i) => cells[i] ?? 0)); };
  const cycle = i => setCells(c => c.map((v, j) => (j === i ? (v === 0 ? 1 : v === 1 ? "X" : 0) : v)));
  const r = useMemo(() => expressionFromTruthTable(vars, cells), [vars.join(""), cells]);
  return <section className="panel"><h2>Truth table → Boolean expression</h2>
    <label className="field inline"><span>Variables</span><select className="input" value={n} onChange={e => resize(+e.target.value)}>{[1, 2, 3, 4, 5].map(k => <option key={k}>{k}</option>)}</select></label>
    <p className="muted small">Click an output cell to cycle 0 → 1 → X (don't care).</p>
    <div className="table-wrap"><table className="truth"><thead><tr>{vars.map(v => <th key={v}>{v}</th>)}<th className="out">F</th></tr></thead><tbody>{cells.map((v, i) => <tr key={i}>{vars.map((_, j) => <td key={j}><span className="bit zero">{(i >> (n - 1 - j)) & 1}</span></td>)}<td><button className={`bit btn-bit ${v === "X" ? "x" : v ? "one" : "zero"}`} onClick={() => cycle(i)} aria-label={`Output for row ${i}: ${v}. Click to change.`}>{v}</button></td></tr>)}</tbody></table></div>
    <dl className="results"><dt>Canonical SOP</dt><dd className="mono">F = {r.canonicalSOP}</dd><dt>Canonical POS</dt><dd className="mono">F = {r.canonicalPOS}</dd><dt>Minimal SOP</dt><dd className="mono strong">F = {r.sop}</dd><dt>Minimal POS</dt><dd className="mono strong">F = {r.pos}</dd></dl>
  </section>;
}

export default function BooleanAlgebra() {
  const [tab, setTab] = useState("simplify"), init = parseHash().params.get("e") || "";
  return <div className="page"><div className="page-head"><div><h1>Boolean Algebra</h1><p>Parse, evaluate and simplify Boolean expressions, compare them, or derive them from a truth table. Expressions are parsed by a safe parser; nothing is ever executed.</p></div></div>
    <div className="tabs" role="tablist">{[["simplify", "Simplify & evaluate"], ["compare", "Compare expressions"], ["table", "From truth table"]].map(([id, l]) => <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{l}</button>)}</div>
    {tab === "simplify" && <Simplify initial={init} />}{tab === "compare" && <Compare />}{tab === "table" && <FromTable />}</div>;
}
