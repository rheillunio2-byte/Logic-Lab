import React from "react";

const STEP = 26, ROW = 30, LABEL = 118, PAD = 10;
export default function TimingDiagram({ trace, onClear }) {
  const { names, samples } = trace;
  if (!names.length) return <div className="timing"><div className="panel-title">Timing diagram</div><p className="muted small">Add switches, LEDs, a clock or memory elements to see their signals over time.</p></div>;
  const width = LABEL + Math.max(samples.length, 8) * STEP + PAD, height = names.length * ROW + 24;
  return <div className="timing">
    <div className="sim-head"><div className="panel-title">Timing diagram</div><button className="btn small" onClick={onClear} disabled={!samples.length}>Clear</button></div>
    <p className="muted small">Each column is one simulation step (clock toggle, pulse or input change). Newest on the right.</p>
    <div className="timing-scroll"><svg width={width} height={height} role="img" aria-label={`Timing diagram with ${names.length} signals over ${samples.length} steps`}>
      {samples.map((_, k) => <line key={k} className="t-grid" x1={LABEL + k * STEP} x2={LABEL + k * STEP} y1={0} y2={height - 18} />)}
      {names.map((name, r) => {
        const y0 = r * ROW + 6, hi = y0 + 4, lo = y0 + ROW - 10, mid = (hi + lo) / 2; let d = ""; const unk = [];
        samples.forEach((s, k) => {
          const v = s[r], x1 = LABEL + k * STEP, x2 = x1 + STEP, y = v === 1 ? hi : v === 0 ? lo : mid, prev = k > 0 ? samples[k - 1][r] : undefined;
          if (v === null) { unk.push(<rect key={k} className="t-unk" x={x1} y={hi} width={STEP} height={lo - hi} />); d += ` M${x1},${mid} L${x2},${mid}`; return; }
          d += prev === undefined || prev === null ? ` M${x1},${y} L${x2},${y}` : ` L${x1},${y} L${x2},${y}`;
        });
        return <g key={r}><text className="t-label" x={LABEL - 8} y={mid + 4} textAnchor="end">{name}</text><line className="t-axis" x1={LABEL} x2={width - PAD} y1={lo + 5} y2={lo + 5} />{unk}<path className="t-wave" d={d.trim()} /></g>;
      })}
      {samples.map((_, k) => <text key={k} className="t-idx" x={LABEL + k * STEP + STEP / 2} y={height - 5} textAnchor="middle">{k}</text>)}
    </svg></div>
  </div>;
}
