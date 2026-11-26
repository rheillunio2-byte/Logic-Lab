import React, { useEffect, useState } from "react";
import { LESSONS } from "../data/lessons.js";
import { useWorkspace } from "../state/WorkspaceContext.jsx";
import { BinaryDemo, MiniCircuit } from "../components/learning/Demos.jsx";
import { navigate, parseHash } from "../hooks/useHashRoute.js";

const PROGRESS_KEY = "logiclab.progress.v1";
const loadProgress = () => { try { const p = JSON.parse(localStorage.getItem(PROGRESS_KEY)); return p && typeof p === "object" ? p : {}; } catch { return {}; } };

function Quiz({ lesson, done, onDone }) {
  const [picked, setPicked] = useState({});
  useEffect(() => setPicked({}), [lesson.id]);
  const allRight = lesson.checks.every((c, i) => picked[i] === c.answer);
  useEffect(() => { if (allRight && !done) onDone(); }, [allRight, done, onDone]);
  return <section className="panel"><h2>Knowledge check</h2>{lesson.checks.map((c, i) => <fieldset key={i} className="quiz"><legend>{i + 1}. {c.q}</legend>
    {c.options.map((o, k) => { const chosen = picked[i] === k, right = k === c.answer; return <label key={k} className={`opt ${chosen ? (right ? "right" : "wrong") : ""}`}><input type="radio" name={`q${i}`} checked={chosen} onChange={() => setPicked(p => ({ ...p, [i]: k }))} /> {o}</label>; })}
    {picked[i] !== undefined && <p className={`feedback ${picked[i] === c.answer ? "ok" : "bad"}`} role="status">{picked[i] === c.answer ? "Correct. " : "Not quite. "}{c.why}</p>}</fieldset>)}</section>;
}

export default function LearningCenter() {
  const { loadCircuit, toast } = useWorkspace();
  const [id, setId] = useState(() => LESSONS.find(l => l.id === parseHash().params.get("lesson"))?.id ?? LESSONS[0].id);
  const [progress, setProgress] = useState(loadProgress);
  const idx = LESSONS.findIndex(l => l.id === id), lesson = LESSONS[idx];
  const markDone = React.useCallback(() => setProgress(p => { const n = { ...p, [lesson.id]: true }; try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(n)); } catch { /* storage unavailable */ } return n; }), [lesson.id]);
  const open = async () => { const { getExample } = await import("../data/examples.js"); const ex = getExample(lesson.example); loadCircuit(ex.circuit); toast(`Loaded “${ex.title}” into the Circuit Builder`, "success"); navigate("builder"); };
  const doneCount = LESSONS.filter(l => progress[l.id]).length;
  return <div className="page learn"><div className="page-head"><div><h1>Learning Center</h1><p>14 short lessons from binary numbers to counters. {doneCount} of {LESSONS.length} knowledge checks completed.</p></div></div>
    <div className="learn-grid">
      <nav className="lesson-list" aria-label="Lessons"><ol>{LESSONS.map((l, i) => <li key={l.id}><button className={`lesson-link ${l.id === id ? "active" : ""}`} aria-current={l.id === id ? "true" : undefined} onClick={() => { setId(l.id); window.scrollTo?.({ top: 0 }); }}><span className="num">{i + 1}</span><span>{l.title}<small>{l.level}</small></span>{progress[l.id] && <span className="done" aria-label="completed">✓</span>}</button></li>)}</ol></nav>
      <article className="lesson">
        <header><span className="badge">{lesson.level}</span><h2>{idx + 1}. {lesson.title}</h2></header>
        <section className="panel"><h3>Learning objectives</h3><ul>{lesson.objectives.map(o => <li key={o}>{o}</li>)}</ul></section>
        <section className="panel"><h3>Explanation</h3>{lesson.body.map((p, i) => <p key={i}>{p}</p>)}
          {lesson.formulas.length > 0 && <div className="formulas">{lesson.formulas.map(f => <code key={f}>{f}</code>)}</div>}
          {lesson.table && <div className="table-wrap"><table className="truth small"><thead><tr>{lesson.table.headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{lesson.table.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table></div>}</section>
        {(lesson.binaryDemo || lesson.example) && <section className="panel"><h3>Try it</h3>{lesson.binaryDemo && <BinaryDemo />}{lesson.example && <><MiniCircuit key={lesson.id} exampleId={lesson.example} note={lesson.demoNote} /><button className="btn" onClick={open}>Open this circuit in the Circuit Builder</button></>}</section>}
        {lesson.link && <p><button className="btn" onClick={() => navigate(lesson.link.route, lesson.link.params)}>{lesson.link.label} →</button></p>}
        <Quiz lesson={lesson} done={!!progress[lesson.id]} onDone={markDone} />
        <section className="panel"><h3>Common mistakes</h3><ul className="mistakes">{lesson.mistakes.map(m => <li key={m}>{m}</li>)}</ul></section>
        <div className="btn-row between"><button className="btn" disabled={idx === 0} onClick={() => setId(LESSONS[idx - 1].id)}>← Previous</button><button className="btn primary" disabled={idx === LESSONS.length - 1} onClick={() => setId(LESSONS[idx + 1].id)}>Next lesson →</button></div>
      </article></div></div>;
}
