import React from "react";
import { Copy, Download } from "lucide-react";
import { tableToCSV } from "../../engine/truthTable.js";
import { copyText, downloadFile, safeFilename } from "../../utils/download.js";

const Bit = ({ v, out }) => <span className={`bit ${v === null ? "x" : v ? "one" : "zero"} ${out ? "out" : ""}`}>{v === null ? "X" : v}</span>;
export function tableToText(t) {
  const rows = t.kind === "sequential" ? [[...t.memory.map(m => `${m}`), ...t.inputs, ...t.outputs, ...t.memory.map(m => `${m}+`)], ...t.rows.map(r => [...r.state, ...r.inputs, ...r.outputs.map(v => v ?? "X"), ...r.next.map(v => v ?? "X")])]
    : [[...t.inputs, ...t.outputs], ...t.rows.map(r => [...r.inputs, ...r.outputs.map(v => v ?? "X")])];
  return rows.map(r => r.join("\t")).join("\n");
}
export default function TruthTableView({ table, name = "logiclab-table", toast, extra }) {
  const seq = table.kind === "sequential";
  return <div className="tt">
    <div className="tt-actions"><span className="muted small">{table.rows.length} row{table.rows.length === 1 ? "" : "s"}</span>
      <button className="btn small" onClick={async () => toast((await copyText(tableToText(table))) ? "Table copied (tab-separated, paste into a spreadsheet)." : "Copy failed.", "info")}><Copy size={14} /> Copy</button>
      <button className="btn small" onClick={() => downloadFile(safeFilename(name, "csv"), tableToCSV(table), "text/csv")}><Download size={14} /> Export CSV</button>{extra}</div>
    <div className="table-wrap"><table className="truth" aria-label={seq ? "State transition table" : "Truth table"}>
      <thead>
        <tr>{seq && <th colSpan={table.memory.length} className="grp">Present state</th>}<th colSpan={Math.max(1, table.inputs.length)} className="grp">Inputs</th><th colSpan={Math.max(1, table.outputs.length)} className="grp out">Outputs</th>{seq && <th colSpan={table.memory.length} className="grp out">Next state</th>}</tr>
        <tr>{seq && table.memory.map(m => <th key={`p${m}`} scope="col">{m}</th>)}{table.inputs.map(n => <th key={n} scope="col">{n}</th>)}{table.outputs.map(n => <th key={n} scope="col" className="out">{n}</th>)}{seq && table.memory.map(m => <th key={`n${m}`} scope="col" className="out">{m}⁺</th>)}</tr>
      </thead>
      <tbody>{table.rows.map((r, i) => <tr key={i}>{seq && r.state.map((v, j) => <td key={`s${j}`}><Bit v={v} /></td>)}{r.inputs.map((v, j) => <td key={j}><Bit v={v} /></td>)}{r.outputs.map((v, j) => <td key={`o${j}`}><Bit v={v} out /></td>)}{seq && r.next.map((v, j) => <td key={`x${j}`}><Bit v={v} out /></td>)}</tr>)}</tbody>
    </table></div>
    {table.hasUnknown && <p className="alert warn small">Some outputs are X (unknown) because an input is not connected. Unknown values are shown as X, never as 0.</p>}
  </div>;
}
export { Bit };
