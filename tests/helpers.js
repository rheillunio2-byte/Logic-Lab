import { createCircuit, addComponent, connect } from "../src/engine/circuit.js";
export function build(spec) {
  let c = createCircuit("test"); const ids = {};
  for (const [key, type, props, name] of spec.comps) { const r = addComponent(c, type, { x: 0, y: 0 }, props || {}, name ?? key); c = r.circuit; ids[key] = r.id; }
  for (const [a, b] of spec.wires || []) {
    const [ak, ap] = a.split("."), [bk, bp] = b.split(".");
    const r = connect(c, { id: ids[ak], pin: ap }, { id: ids[bk], pin: bp });
    if (!r.ok) throw new Error(`wire ${a}->${b}: ${r.error}`);
    c = r.circuit;
  }
  return { circuit: c, ids };
}
export const setSwitch = (c, id, v) => ({ ...c, components: c.components.map(x => (x.id === id ? { ...x, props: { ...x.props, value: v } } : x)) });
