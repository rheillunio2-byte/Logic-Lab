// Karnaugh map layout (Gray-code ordered), group extraction and solving for 2–4 variables.
import { minimizeBoth, implicantAsProduct, implicantAsSum } from "./minimizer.js";

const GRAY = { 1: [0, 1], 2: [0, 1, 3, 2] };
const bin = (v, w) => v.toString(2).padStart(w, "0");

export function kmapLayout(n) {
  if (![2, 3, 4].includes(n)) throw new Error("Karnaugh maps support 2, 3 or 4 variables.");
  const rowBits = n === 4 ? 2 : 1, colBits = n - rowBits;
  const vars = "ABCD".slice(0, n).split("");
  const rowOrder = GRAY[rowBits], colOrder = GRAY[colBits];
  const cells = rowOrder.map(rv => colOrder.map(cv => (rv << colBits) | cv));
  return { n, vars, rowVars: vars.slice(0, rowBits), colVars: vars.slice(rowBits), rowOrder, colOrder,
    rowLabels: rowOrder.map(v => bin(v, rowBits)), colLabels: colOrder.map(v => bin(v, colBits)), cells };
}
const position = layout => { const m = new Map(); layout.cells.forEach((row, r) => row.forEach((mt, c) => m.set(mt, { r, c, m: mt }))); return m; };

/** Map an implicant to its K-map cells (a rectangle that may wrap around the edges). */
export function groupCells(layout, imp) {
  const pos = position(layout), size = 2 ** layout.n, cells = [];
  for (let m = 0; m < size; m++) if ((m & ~imp.mask & (size - 1)) === imp.value) cells.push(pos.get(m));
  return cells;
}
const cyclicRun = (set, length) => {
  const s = [...set], k = s.length;
  if (k === length) return true;
  return Array.from({ length }, (_, st) => st).some(st => Array.from({ length: k }, (_, i) => (st + i) % length).every(x => set.has(x)));
};
const isPow2 = k => k > 0 && (k & (k - 1)) === 0;
/** A valid K-map group has a power-of-two size, is a full rectangle, and its rows/columns are adjacent in Gray order (wrapping allowed). */
export function isValidGroup(layout, cells) {
  const rows = new Set(cells.map(x => x.r)), cols = new Set(cells.map(x => x.c));
  return isPow2(cells.length) && rows.size * cols.size === cells.length && cyclicRun(rows, layout.rowOrder.length) && cyclicRun(cols, layout.colOrder.length);
}

/** values[i] ∈ {0, 1, "X"} for minterm i. */
export function solveKMap(n, values) {
  const layout = kmapLayout(n), size = 2 ** n;
  if (!Array.isArray(values) || values.length !== size) throw new Error(`Expected ${size} cell values.`);
  const minterms = [], dontcares = [], zeros = [];
  values.forEach((v, i) => (v === 1 ? minterms : v === "X" ? dontcares : zeros).push(i));
  const both = minimizeBoth(layout.vars, minterms, dontcares);
  const mk = (res, term) => res.cover.map((imp, i) => ({ id: i, term: term(imp, layout.vars), implicant: imp, cells: groupCells(layout, imp), essential: res.essential.includes(imp) }));
  const sopGroups = mk(both.sop, implicantAsProduct), posGroups = mk(both.pos, implicantAsSum);
  const steps = [];
  steps.push(`Cells marked 1 (minterms): ${minterms.join(", ") || "none"}${dontcares.length ? `; don't-care cells: ${dontcares.join(", ")}` : ""}.`);
  steps.push("Rows and columns follow Gray code (00, 01, 11, 10) so that neighbouring cells, including opposite edges, differ in exactly one variable.");
  if (!minterms.length) steps.push("There are no 1 cells, so F = 0.");
  else {
    steps.push(`Largest groups of 1s/don't-cares (prime implicants): ${both.sop.primes.map(p => implicantAsProduct(p, layout.vars)).join(", ")}.`);
    if (both.sop.essential.length) steps.push(`Essential groups (the only group covering some 1): ${both.sop.essential.map(p => implicantAsProduct(p, layout.vars)).join(", ")}.`);
    sopGroups.forEach(g => steps.push(`Group of ${g.cells.length} cell${g.cells.length > 1 ? "s" : ""} (m${g.cells.map(c => c.m).sort((a, b) => a - b).join(", m")}) → variables that do not change: ${g.term}.`));
    steps.push(`OR the group terms: F = ${both.sopText}.`);
  }
  return { layout, minterms, dontcares, maxterms: zeros, sop: both.sopText, pos: both.posText, sopGroups, posGroups, steps };
}
