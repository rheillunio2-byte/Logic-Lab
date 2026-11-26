import React from "react";
import { useWorkspace } from "../state/WorkspaceContext.jsx";
import CircuitEditor from "../components/circuit/CircuitEditor.jsx";

export default function CircuitBuilder() {
  const w = useWorkspace();
  return <div className="page builder"><CircuitEditor circuit={w.circuit} onChange={w.setCircuit} undo={w.undo} redo={w.redo} canUndo={w.canUndo} canRedo={w.canRedo} settings={w.settings} updateSettings={w.updateSettings} notify={w.toast} confirm={w.confirm} /></div>;
}
