import React from "react";
export default function About() {
  return <div className="page"><div className="page-head"><div><h1>About LogicLab</h1><p>An interactive digital logic learning and simulation studio that runs entirely in your browser.</p></div></div>
    <section className="panel"><h2>What it is</h2><p>LogicLab lets students build circuits visually, simulate combinational and sequential logic, generate truth and state tables, simplify Boolean expressions, solve Karnaugh maps, and practise with graded challenges.</p>
      <p>Version 2.0.0 · MIT License · Built with React, Vite and Lucide icons. There is no backend, no account system and no tracking.</p></section>
    <section className="panel"><h2>Developer</h2><p><b>Rheil Evans T. Lunio (RETL)</b> · Computer Science, University of Science and Technology of Southern Philippines (USTP), Cagayan de Oro.</p><p><a href="https://github.com/rheillunio2-byte/Logic-Lab" target="_blank" rel="noreferrer noopener">github.com/rheillunio2-byte/Logic-Lab</a></p></section>
    <section className="panel"><h2>Simulation conventions</h2><ul><li>Signals are 0, 1 or X (unknown). Unconnected required inputs are X, never silently 0.</li><li>Sequential elements power on with Q = 0. Edge-triggered parts update on the rising edge only, all sampling simultaneously.</li><li>Combinational feedback loops are rejected; use a latch or flip-flop for memory.</li></ul></section></div>;
}
