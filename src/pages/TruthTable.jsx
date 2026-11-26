import React, { useMemo, useState } from "react";
import { useWorkspace } from "../state/WorkspaceContext.jsx";
import { makeTruthTable, makeStateTable, isSequentialCircuit, MAX_TABLE_INPUTS } from "../engine/truthTable.js";
import TruthTableView from "../components/truth-table/TruthTableView.jsx";
import { EmptyState } from "../components/common/Overlays.jsx";
import { navigate } from "../hooks/useHashRoute.js";

export default function TruthTable() {
  const { circuit, toast } = useWorkspace();
  const [max, setMax] = useState(8);
  const seq = isSequentialCircuit(circuit);
  const table = useMemo(() => (seq ? makeStateTable(circuit) : makeTruthTable(circuit, max)), [circuit, seq, max]);
  return <div className="page">
    <div className="page-head"><div><h1>{seq ? "State-transition table" : "Truth table"}</h1><p>{seq ? "This circuit contains memory, so a plain truth table would be misleading. Each row shows the present state, the inputs, and the next state after one rising clock edge." : "Generated automatically by simulating every combination of your circuit's switches."}</p></div>
      {!seq && <label className="field inline"><span>Max inputs</span><select className="input" value={max} onChange={e => setMax(+e.target.value)}>{[4, 6, 8, 10].filter(n => n <= MAX_TABLE_INPUTS).map(n => <option key={n} value={n}>{n} ({2 ** n} rows)</option>)}</select></label>}</div>
    <section className="panel">
      <p className="muted small">Circuit: <b>{circuit.name}</b> · Inputs are the switches, outputs are LEDs and displays.</p>
      {table.ok ? <TruthTableView table={table} name={`${circuit.name}-${seq ? "states" : "truth-table"}`} toast={toast} />
        : <EmptyState title="No table available" action={<button className="btn primary" onClick={() => navigate("builder")}>Open Circuit Builder</button>}>{table.error}</EmptyState>}
    </section>
  </div>;
}
