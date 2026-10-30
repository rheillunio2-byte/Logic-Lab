// Pure Boolean evaluation helpers. Values are represented as 0 or 1.
export const gateSpecs = {
  AND: { label: "AND", inputs: 2, description: "1 only when both inputs are 1" },
  OR:  { label: "OR", inputs: 2, description: "1 when at least one input is 1" },
  NOT: { label: "NOT", inputs: 1, description: "Inverts its input" },
  XOR: { label: "XOR", inputs: 2, description: "1 when inputs are different" }
};

export function evaluateGate(type, values) {
  const a = Number(Boolean(values[0]));
  const b = Number(Boolean(values[1]));
  switch (type) {
    case "AND": return a & b;
    case "OR": return a | b;
    case "NOT": return a ? 0 : 1;
    case "XOR": return a ^ b;
    default: throw new Error(`Unsupported gate: ${type}`);
  }
}

/**
 * Evaluates a combinational circuit in dependency order.
 * A node's inputs contain source node IDs. Missing connections are treated as 0.
 * Cycles are detected instead of causing an infinite recursion.
 */
export function evaluateCircuit(nodes, inputOverrides = {}) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const cache = new Map();
  const visiting = new Set();
  const read = id => {
    if (cache.has(id)) return cache.get(id);
    const node = byId.get(id);
    if (!node) return 0;
    if (visiting.has(id)) throw new Error("Feedback loop detected. Combinational circuits must not contain cycles.");
    visiting.add(id);
    let value = 0;
    if (node.type === "INPUT") value = Number(inputOverrides[id] ?? node.value ?? 0);
    else if (node.type === "DFF") value = Number(node.q ?? 0);
    else if (node.type === "OUTPUT") value = read(node.inputs?.[0]);
    else {
      const spec = gateSpecs[node.type];
      value = evaluateGate(node.type, (node.inputs || []).slice(0, spec.inputs).map(read));
    }
    visiting.delete(id);
    cache.set(id, value);
    return value;
  };
  nodes.forEach(n => read(n.id));
  return cache;
}

export function makeTruthTable(nodes) {
  const inputs = nodes.filter(n => n.type === "INPUT");
  const outputs = nodes.filter(n => n.type === "OUTPUT");
  if (inputs.length > 8) throw new Error("Truth tables are limited to 8 inputs (256 rows) for readability.");
  if (nodes.some(n => n.type === "DFF")) throw new Error("Truth tables describe combinational circuits. Remove flip-flops or inspect their state using the clock controls.");
  const rows = [];
  for (let mask = 0; mask < 2 ** inputs.length; mask++) {
    const overrides = {};
    inputs.forEach((input, i) => { overrides[input.id] = (mask >> (inputs.length - 1 - i)) & 1; });
    const values = evaluateCircuit(nodes, overrides);
    rows.push({ inputs: inputs.map(n => overrides[n.id]), outputs: outputs.map(n => values.get(n.id) ?? 0) });
  }
  return { inputs, outputs, rows };
}
