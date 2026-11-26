// Component registry. Signals are 0, 1 or null (null = unknown / undriven).
// Unknown values propagate with three-valued logic; they are never silently treated as LOW.
export const not3 = a => (a === null ? null : a ? 0 : 1);
export const and3 = v => (v.includes(0) ? 0 : v.includes(null) ? null : 1);
export const or3 = v => (v.includes(1) ? 1 : v.includes(null) ? null : 0);
export const xor3 = v => (v.includes(null) ? null : v.reduce((a, b) => a ^ b, 0));

const LETTERS = "ABCDEFGH";
export const MAX_GATE_INPUTS = 8;
const seq = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);
const gateInputs = p => Array.from({ length: p.inputCount ?? 2 }, (_, i) => LETTERS[i]);
const gate = (type, label, description, fn, symbol) => ({
  type, label, category: "Logic gates", description, symbol,
  defaultProps: { inputCount: 2 }, variableInputs: true,
  inputs: gateInputs, outputs: () => ["Y"], kind: "comb",
  eval: (ins) => [fn(ins)],
});

export const COMPONENTS = {
  AND: gate("AND", "AND", "Output is 1 only when all inputs are 1.", v => and3(v), "Y = A·B"),
  OR: gate("OR", "OR", "Output is 1 when at least one input is 1.", v => or3(v), "Y = A+B"),
  NAND: gate("NAND", "NAND", "Inverted AND. Universal gate.", v => not3(and3(v)), "Y = (A·B)'"),
  NOR: gate("NOR", "NOR", "Inverted OR. Universal gate.", v => not3(or3(v)), "Y = (A+B)'"),
  XOR: gate("XOR", "XOR", "Output is 1 when an odd number of inputs are 1.", v => xor3(v), "Y = A⊕B"),
  XNOR: gate("XNOR", "XNOR", "Output is 1 when an even number of inputs are 1.", v => not3(xor3(v)), "Y = (A⊕B)'"),
  NOT: { type: "NOT", label: "NOT", category: "Logic gates", description: "Inverts its input.", symbol: "Y = A'",
    defaultProps: {}, inputs: () => ["A"], outputs: () => ["Y"], kind: "comb", eval: ([a]) => [not3(a)] },
  BUFFER: { type: "BUFFER", label: "Buffer", category: "Logic gates", description: "Passes its input unchanged.", symbol: "Y = A",
    defaultProps: {}, inputs: () => ["A"], outputs: () => ["Y"], kind: "comb", eval: ([a]) => [a] },

  SWITCH: { type: "SWITCH", label: "Switch", category: "Inputs", description: "Manual binary input. Click to toggle.",
    defaultProps: { value: 0 }, inputs: () => [], outputs: () => ["Q"], kind: "source", eval: (_i, p) => [p.value ? 1 : 0] },
  HIGH: { type: "HIGH", label: "Constant HIGH", category: "Inputs", description: "Always outputs 1.",
    defaultProps: {}, inputs: () => [], outputs: () => ["Q"], kind: "source", eval: () => [1] },
  LOW: { type: "LOW", label: "Constant LOW", category: "Inputs", description: "Always outputs 0.",
    defaultProps: {}, inputs: () => [], outputs: () => ["Q"], kind: "source", eval: () => [0] },
  CLOCK: { type: "CLOCK", label: "Clock", category: "Inputs", description: "Clock generator. Level is controlled by the simulation clock controls.",
    defaultProps: {}, inputs: () => [], outputs: () => ["CLK"], kind: "clock", eval: (_i, _p, st) => [st?.level ?? 0] },

  LED: { type: "LED", label: "LED", category: "Outputs", description: "Lights up when its input is 1.",
    defaultProps: {}, inputs: () => ["IN"], outputs: () => [], kind: "sink" },
  BINOUT: { type: "BINOUT", label: "Binary output", category: "Outputs", description: "Shows a multi-bit binary and decimal value. D0 is the least significant bit.",
    defaultProps: { bits: 4 }, variableBits: true, inputs: p => seq("D", p.bits ?? 4), outputs: () => [], kind: "sink" },
  HEX: { type: "HEX", label: "Hex display", category: "Outputs", description: "Shows a 4-bit value as a hexadecimal digit (D0 = LSB).",
    defaultProps: {}, inputs: () => seq("D", 4), outputs: () => [], kind: "sink" },
  SEG7: { type: "SEG7", label: "7-segment", category: "Outputs", description: "Seven-segment display driven by a 4-bit hexadecimal value (D0 = LSB).",
    defaultProps: {}, inputs: () => seq("D", 4), outputs: () => [], kind: "sink" },

  SR_LATCH: { type: "SR_LATCH", label: "SR latch", category: "Sequential", description: "Set/reset latch (NOR type). S=R=1 is forbidden; the state is undefined afterwards.",
    defaultProps: {}, inputs: () => ["S", "R"], outputs: () => ["Q", "QN"], kind: "latch",
    initState: () => ({ q: 0, invalid: false }),
    update: ([s, r], st) => {
      if (s === 0 && r === 0) return { q: st.q, invalid: false };
      if (s === 1 && r === 0) return { q: 1, invalid: false };
      if (s === 0 && r === 1) return { q: 0, invalid: false };
      if (s === 1 && r === 1) return { q: null, invalid: true };
      return { q: null, invalid: false };
    },
    out: st => (st.invalid ? [0, 0] : [st.q, not3(st.q)]) },
  D_LATCH: { type: "D_LATCH", label: "D latch", category: "Sequential", description: "Level-sensitive latch: Q follows D while EN = 1, holds while EN = 0.",
    defaultProps: {}, inputs: () => ["D", "EN"], outputs: () => ["Q", "QN"], kind: "latch",
    initState: () => ({ q: 0 }),
    update: ([d, en], st) => (en === 1 ? { q: d } : en === 0 ? { q: st.q } : { q: d === st.q ? st.q : null }),
    out: st => [st.q, not3(st.q)] },
  DFF: { type: "DFF", label: "D flip-flop", category: "Sequential", description: "Captures D on the rising edge of CLK. RST (optional) asynchronously clears Q.",
    defaultProps: {}, inputs: () => ["D", "CLK", "RST"], outputs: () => ["Q", "QN"], kind: "edge", optional: { RST: 0 },
    initState: () => ({ q: 0 }), clockPin: "CLK",
    next: ([d], st) => ({ q: d }), out: st => [st.q, not3(st.q)] },
  JKFF: { type: "JKFF", label: "JK flip-flop", category: "Sequential", description: "J=K=0 hold, J=1 K=0 set, J=0 K=1 reset, J=K=1 toggle (on rising CLK).",
    defaultProps: {}, inputs: () => ["J", "K", "CLK", "RST"], outputs: () => ["Q", "QN"], kind: "edge", optional: { RST: 0 },
    initState: () => ({ q: 0 }), clockPin: "CLK",
    next: ([j, k], st) => {
      if (j === 0 && k === 0) return { q: st.q };
      if (j === 1 && k === 0) return { q: 1 };
      if (j === 0 && k === 1) return { q: 0 };
      if (j === 1 && k === 1) return { q: not3(st.q) };
      return { q: null };
    }, out: st => [st.q, not3(st.q)] },
  TFF: { type: "TFF", label: "T flip-flop", category: "Sequential", description: "Toggles Q on each rising CLK edge while T = 1.",
    defaultProps: {}, inputs: () => ["T", "CLK", "RST"], outputs: () => ["Q", "QN"], kind: "edge", optional: { RST: 0 },
    initState: () => ({ q: 0 }), clockPin: "CLK",
    next: ([t], st) => (t === 0 ? { q: st.q } : t === 1 ? { q: not3(st.q) } : { q: null }), out: st => [st.q, not3(st.q)] },

  MUX: { type: "MUX", label: "Multiplexer", category: "Combinational", description: "Routes the data input chosen by the select lines to Y.",
    defaultProps: { selectBits: 1 }, variableSelect: true,
    inputs: p => [...seq("D", 2 ** (p.selectBits ?? 1)), ...seq("S", p.selectBits ?? 1)], outputs: () => ["Y"], kind: "comb",
    eval: (ins, p) => {
      const n = p.selectBits ?? 1, sel = ins.slice(2 ** n);
      if (sel.includes(null)) return [null];
      return [ins[sel.reduce((a, b, i) => a | (b << i), 0)]];
    } },
  DEMUX: { type: "DEMUX", label: "Demultiplexer", category: "Combinational", description: "Routes D to the output chosen by the select lines; the others are 0.",
    defaultProps: { selectBits: 1 }, variableSelect: true,
    inputs: p => ["D", ...seq("S", p.selectBits ?? 1)], outputs: p => seq("Y", 2 ** (p.selectBits ?? 1)), kind: "comb",
    eval: ([d, ...sel], p) => {
      const n = 2 ** (p.selectBits ?? 1);
      if (sel.includes(null)) return Array(n).fill(null);
      const idx = sel.reduce((a, b, i) => a | (b << i), 0);
      return Array.from({ length: n }, (_, i) => (i === idx ? d : 0));
    } },
  DECODER: { type: "DECODER", label: "Decoder", category: "Combinational", description: "n-to-2ⁿ decoder with optional enable (EN, default 1).",
    defaultProps: { bits: 2 }, variableBits: true, optional: { EN: 1 },
    inputs: p => [...seq("A", p.bits ?? 2), "EN"], outputs: p => seq("Y", 2 ** (p.bits ?? 2)), kind: "comb",
    eval: (ins, p) => {
      const n = p.bits ?? 2, a = ins.slice(0, n), en = ins[n];
      if (a.includes(null) || en === null) return Array(2 ** n).fill(null);
      const idx = a.reduce((x, b, i) => x | (b << i), 0);
      return Array.from({ length: 2 ** n }, (_, i) => (en && i === idx ? 1 : 0));
    } },
  ENCODER: { type: "ENCODER", label: "Priority encoder", category: "Combinational", description: "4-to-2 priority encoder: the highest-numbered active input wins. V = valid.",
    defaultProps: {}, inputs: () => seq("I", 4), outputs: () => ["A0", "A1", "V"], kind: "comb",
    eval: ins => {
      if (ins.includes(null)) return [null, null, null];
      const hi = ins.lastIndexOf(1);
      return hi < 0 ? [0, 0, 0] : [hi & 1, (hi >> 1) & 1, 1];
    } },
  HALF_ADDER: { type: "HALF_ADDER", label: "Half adder", category: "Combinational", description: "Adds two bits: S = A⊕B, C = A·B.",
    defaultProps: {}, inputs: () => ["A", "B"], outputs: () => ["S", "C"], kind: "comb",
    eval: ([a, b]) => [xor3([a, b]), and3([a, b])] },
  FULL_ADDER: { type: "FULL_ADDER", label: "Full adder", category: "Combinational", description: "Adds A + B + CIN. S = A⊕B⊕CIN, COUT = majority(A,B,CIN).",
    defaultProps: {}, inputs: () => ["A", "B", "CIN"], outputs: () => ["S", "COUT"], kind: "comb",
    eval: ([a, b, c]) => [xor3([a, b, c]), or3([and3([a, b]), and3([c, xor3([a, b])])])] },
  COMPARATOR: { type: "COMPARATOR", label: "2-bit comparator", category: "Combinational", description: "Compares A (A1A0) with B (B1B0). Exactly one output is 1.",
    defaultProps: {}, inputs: () => ["A0", "A1", "B0", "B1"], outputs: () => ["AGB", "AEB", "ALB"], kind: "comb",
    eval: ([a0, a1, b0, b1]) => {
      if ([a0, a1, b0, b1].includes(null)) return [null, null, null];
      const a = a0 | (a1 << 1), b = b0 | (b1 << 1);
      return [+(a > b), +(a === b), +(a < b)];
    } },
};

export const CATEGORIES = ["Logic gates", "Inputs", "Outputs", "Sequential", "Combinational"];
export const getDef = type => COMPONENTS[type];
export const inputPins = c => COMPONENTS[c.type].inputs(c.props || {});
export const outputPins = c => COMPONENTS[c.type].outputs(c.props || {});
export const isSequential = c => ["latch", "edge"].includes(COMPONENTS[c.type].kind);

const SEG_TABLE = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x77, 0x7c, 0x39, 0x5e, 0x79, 0x71];
/** Returns segments a..g as 0/1 booleans for a hex digit 0–15. */
export const sevenSegment = n => "abcdefg".split("").map((_, i) => (SEG_TABLE[n] >> i) & 1);
/** Combine bit signals (index 0 = LSB) into a number, or null if any bit is unknown. */
export const bitsToNumber = bits => (bits.includes(null) ? null : bits.reduce((a, b, i) => a | (b << i), 0));
