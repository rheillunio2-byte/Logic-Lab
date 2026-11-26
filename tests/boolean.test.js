import test from "node:test";
import assert from "node:assert/strict";
import { parse, tryParse, toExpression, truthTableOf, equivalent, variablesOf, evaluateAst } from "../src/engine/booleanParser.js";
import { minimize, minimizeBoth, primeImplicants } from "../src/engine/minimizer.js";
import { simplify, algebraicSteps, expressionFromTruthTable } from "../src/engine/simplifier.js";
import { kmapLayout, solveKMap, isValidGroup, groupCells } from "../src/engine/karnaugh.js";

const val = (src, env) => evaluateAst(parse(src), env);
test("parser: operators, notations and precedence", () => {
  assert.equal(val("A + B C", { A: 0, B: 1, C: 1 }), 1);
  assert.equal(val("A + BC", { A: 0, B: 1, C: 0 }), 0);          // AND binds tighter than OR
  assert.equal(val("A'", { A: 0 }), 1); assert.equal(val("!A", { A: 1 }), 0); assert.equal(val("NOT A", { A: 1 }), 0);
  assert.equal(val("A''", { A: 1 }), 1);
  assert.equal(val("A ^ B", { A: 1, B: 0 }), 1); assert.equal(val("A XOR B", { A: 1, B: 1 }), 0);
  assert.equal(val("A NAND B", { A: 1, B: 1 }), 0); assert.equal(val("A NOR B", { A: 0, B: 0 }), 1);
  assert.equal(val("A XNOR B", { A: 1, B: 1 }), 1);
  assert.equal(val("A & B | C", { A: 1, B: 0, C: 1 }), 1);
  assert.equal(val("(A + B)' C", { A: 0, B: 0, C: 1 }), 1);
  assert.equal(val("A1 + B_2", { A1: 0, B_2: 1 }), 1);
  assert.deepEqual(variablesOf(parse("AB + A'C")), ["A", "B", "C"]);
  assert.equal(val("1 + A", { A: 0 }), 1); assert.equal(val("0 A", { A: 1 }), 0);
  assert.equal(val("¬A ∧ B ∨ C", { A: 0, B: 1, C: 0 }), 1);
});
test("parser: precedence NOT > AND > XOR > OR", () => {
  const ast = parse("A + B ^ C D");   // A + (B ^ (C·D))
  for (let m = 0; m < 16; m++) { const [A, B, C, D] = [8, 4, 2, 1].map(b => +!!(m & b)); assert.equal(evaluateAst(ast, { A, B, C, D }), A | (B ^ (C & D))); }
});
test("parser: invalid input gives positioned, readable errors; never evals", () => {
  for (const bad of ["", "   ", "A +", "+ A", "(A + B", "A + B)", "A $ B", "A ++ B", "()", "NOT", "alert(1)", "process.exit()", "A ** B"]) {
    const r = tryParse(bad);
    if (bad === "alert(1)" || bad === "process.exit()") { assert.ok(r.ok || r.error); continue; }   // parsed as plain AND of variables, never executed
    assert.equal(r.ok, false, bad); assert.ok(typeof r.error === "string" && r.error.length > 5);
  }
  assert.match(tryParse("A + B)").error, /Unexpected “\)”/);
  assert.match(tryParse("(A + B").error, /Missing closing/);
  assert.equal(tryParse("A".repeat(500)).ok, false);
  assert.equal(tryParse("(".repeat(60) + "A" + ")".repeat(60)).ok, false);
});
test("toExpression round-trips through the parser", () => {
  for (const src of ["A'B + AB'", "(A + B)'C", "A NAND B", "(A ⊕ B) ⊕ C", "A + B(C + D)", "((A NOR B) XNOR C)'"]) {
    const a = parse(src), again = parse(toExpression(a));
    assert.ok(equivalent(a, again).equal, `${src} -> ${toExpression(a)}`);
  }
});
test("truth table of an expression", () => {
  const t = truthTableOf(parse("A XOR B"));
  assert.deepEqual(t.rows.map(r => r.output), [0, 1, 1, 0]); assert.deepEqual(t.minterms, [1, 2]);
  assert.throws(() => truthTableOf(parse("ABCDEFGHIJK")), /Too many variables/);
});
test("equivalence checker finds counterexamples (De Morgan / absorption)", () => {
  assert.ok(equivalent("(A B)'", "A' + B'").equal); assert.ok(equivalent("A + A B", "A").equal);
  const r = equivalent("A + B", "A B"); assert.equal(r.equal, false); assert.ok(r.counterexample);
});

test("Quine–McCluskey: known functions", () => {
  const v = ["A", "B", "C"];
  assert.equal(minimizeBoth(v, [1, 3, 5, 7]).sopText, "C");
  assert.equal(minimizeBoth(["A", "B"], [1, 2]).sopText.replace(/ /g, ""), "A'B+AB'");
  assert.equal(minimizeBoth(["A", "B"], []).sopText, "0"); assert.equal(minimizeBoth(["A", "B"], [0, 1, 2, 3]).sopText, "1");
  assert.equal(minimizeBoth(["A", "B"], [0, 1, 2, 3]).posText, "1"); assert.equal(minimizeBoth(["A", "B"], []).posText, "0");
  // Classic textbook F(A,B,C,D) = Σm(0,1,2,5,6,7,8,9,10,14) -> B'D' + B'C' + A'CD'... verified by equivalence below
  const m = [0, 1, 2, 5, 6, 7, 8, 9, 10, 14], vars = ["A", "B", "C", "D"], b = minimizeBoth(vars, m);
  const target = truthTableOf(parse("A'B'C'D' + A'B'C'D + A'B'CD' + A'BC'D + A'BCD' + A'BCD + AB'C'D' + AB'C'D + AB'CD' + ABCD'"), vars);
  assert.deepEqual(target.minterms, m);
  assert.ok(equivalent(b.sopText, parse("A'B'C'D' + A'B'C'D + A'B'CD' + A'BC'D + A'BCD' + A'BCD + AB'C'D' + AB'C'D + AB'CD' + ABCD'")).equal);
  assert.ok(equivalent(b.posText, b.sopText).equal);
});
test("Quine–McCluskey: don't-cares are used but never required", () => {
  const r = minimize(4, [4, 8, 10, 11, 12, 15], [9, 14]);
  const covered = new Set(r.cover.flatMap(c => c.covers));
  for (const m of [4, 8, 10, 11, 12, 15]) assert.ok(covered.has(m));
  const b = minimizeBoth(["A", "B", "C", "D"], [4, 8, 10, 11, 12, 15], [9, 14]);
  assert.equal(b.sop.cover.length, 3);
});
test("QM property test: SOP and POS equal the original function for random functions (n = 2..6)", () => {
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let trial = 0; trial < 120; trial++) {
    const n = 2 + (trial % 5), vars = "ABCDEF".slice(0, n).split(""), size = 2 ** n;
    const cells = Array.from({ length: size }, () => { const x = rnd(); return x < 0.4 ? 1 : x < 0.55 ? "X" : 0; });
    const ones = cells.flatMap((v, i) => (v === 1 ? [i] : [])), dcs = cells.flatMap((v, i) => (v === "X" ? [i] : []));
    const b = minimizeBoth(vars, ones, dcs);
    for (const [name, text] of [["sop", b.sopText], ["pos", b.posText]]) {
      const t = truthTableOf(parse(text), vars);
      t.rows.forEach((row, i) => { if (cells[i] === 1) assert.equal(row.output, 1, `${name} must be 1 at ${i}: ${text}`); if (cells[i] === 0) assert.equal(row.output, 0, `${name} must be 0 at ${i}: ${text}`); });
    }
  }
});

test("simplifier: every recorded step is logically equivalent to the original", () => {
  const exprs = ["A + A'B", "AB + AB'", "(A + B)(A + B')", "A XOR B XOR A", "(A NAND B)'", "A(A + B)", "A + A", "A A'", "A + A'", "A'B + AB' + AB", "((A + B)' + C)'", "AB + A'C + BC", "1 + A", "0 B", "A (B + C)' + A B", "A XNOR B", "(A NOR B) + (A NAND B)", "A B C + A B C' + A B' C"];
  for (const e of exprs) {
    const ast = parse(e), { steps, result } = algebraicSteps(ast);
    for (const s of steps) assert.ok(equivalent(ast, s.expression).equal, `${e}: step "${s.rule}" -> ${s.expression}`);
    assert.ok(equivalent(ast, result).equal, e);
    const rep = simplify(e);
    assert.ok(equivalent(ast, rep.sop).equal, `${e} sop ${rep.sop}`); assert.ok(equivalent(ast, rep.pos).equal, `${e} pos ${rep.pos}`);
  }
});
test("simplifier: expected simplifications", () => {
  assert.equal(simplify("A + A'B").algebraic.replace(/ /g, ""), "A+B");
  assert.equal(simplify("AB + AB'").algebraic, "A");
  assert.equal(simplify("(A + B)(A + B')").algebraic, "A");
  assert.equal(simplify("A + AB").algebraic, "A");
  assert.equal(simplify("A A'").algebraic, "0"); assert.equal(simplify("A + A'").algebraic, "1");
  assert.equal(simplify("(AB)'").algebraic.replace(/ /g, ""), "A'+B'");
  assert.equal(simplify("A XOR A").sop, "0");
  assert.equal(simplify("1 + 0").sop, "1");
  assert.ok(simplify("A + A'B").steps.some(s => /Redundancy/.test(s.rule)));
  assert.ok(simplify("A NAND B").steps[0].rule.includes("Rewrite"));
});
test("simplifier: randomised expressions stay equivalent", () => {
  let seed = 99; const rnd = n => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n;
  const gen = d => { if (d === 0 || rnd(5) === 0) return "ABCD"[rnd(4)] + (rnd(3) === 0 ? "'" : ""); const ops = [" + ", " · ", " ^ ", " NAND ", " NOR ", " XNOR "]; return `(${gen(d - 1)}${ops[rnd(ops.length)]}${gen(d - 1)})`; };
  for (let i = 0; i < 150; i++) {
    const e = gen(3), ast = parse(e), { steps } = algebraicSteps(ast);
    for (const s of steps) assert.ok(equivalent(ast, s.expression).equal, `${e}: ${s.rule} -> ${s.expression}`);
    const rep = simplify(e); assert.ok(equivalent(ast, rep.sop).equal && equivalent(ast, rep.pos).equal, e);
  }
});
test("truth table → expression conversion", () => {
  const r = expressionFromTruthTable(["A", "B"], [0, 1, 1, 0]);
  assert.equal(r.canonicalSOP, "A'B + AB'"); assert.equal(r.canonicalPOS, "(A + B)(A' + B')");
  assert.ok(equivalent(r.sop, "A XOR B").equal); assert.ok(equivalent(r.pos, "A XOR B").equal);
  const dc = expressionFromTruthTable(["A", "B"], [0, "X", 1, 1]);
  assert.equal(dc.sop, "A");
});

// ---- Karnaugh maps ----
test("K-map layouts use Gray code and the right minterm numbers", () => {
  const l4 = kmapLayout(4);
  assert.deepEqual(l4.rowLabels, ["00", "01", "11", "10"]); assert.deepEqual(l4.colLabels, ["00", "01", "11", "10"]);
  assert.deepEqual(l4.cells, [[0, 1, 3, 2], [4, 5, 7, 6], [12, 13, 15, 14], [8, 9, 11, 10]]);
  assert.deepEqual(kmapLayout(3).cells, [[0, 1, 3, 2], [4, 5, 7, 6]]);
  assert.deepEqual(kmapLayout(2).cells, [[0, 1], [2, 3]]);
  // adjacent cells (including wrap-around) differ by exactly one bit
  for (const n of [2, 3, 4]) {
    const L = kmapLayout(n), R = L.cells.length, C = L.cells[0].length, one = (a, b) => { const x = a ^ b; return x && !(x & (x - 1)); };
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (C > 1) assert.ok(one(L.cells[r][c], L.cells[r][(c + 1) % C]));
      if (R > 1) assert.ok(one(L.cells[r][c], L.cells[(r + 1) % R][c]));
    }
  }
  assert.throws(() => kmapLayout(5));
});
test("K-map groups are valid rectangles (with wrap-around) and cover every 1", () => {
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let t = 0; t < 200; t++) {
    const n = 2 + (t % 3), size = 2 ** n;
    const vals = Array.from({ length: size }, () => { const x = rnd(); return x < 0.45 ? 1 : x < 0.6 ? "X" : 0; });
    const sol = solveKMap(n, vals);
    for (const key of ["sopGroups", "posGroups"]) {
      const target = key === "sopGroups" ? 1 : 0, covered = new Set();
      for (const g of sol[key]) {
        assert.ok(isValidGroup(sol.layout, g.cells), `${key} invalid group ${g.term} ${JSON.stringify(vals)}`);
        for (const c of g.cells) { assert.notEqual(vals[c.m], 1 - target, "group contains a cell of the opposite value"); covered.add(c.m); }
      }
      vals.forEach((v, i) => { if (v === target) assert.ok(covered.has(i), `${key}: cell ${i} not covered ${JSON.stringify(vals)}`); });
    }
    const vars = sol.layout.vars;
    for (const [text] of [[sol.sop], [sol.pos]]) { const tt = truthTableOf(parse(text), vars); tt.rows.forEach((r, i) => { if (vals[i] === 1) assert.equal(r.output, 1); if (vals[i] === 0) assert.equal(r.output, 0); }); }
  }
});
test("K-map: classic worked examples", () => {
  const s = solveKMap(4, [1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1]);  // wraps around the left/right edge
  assert.ok(s.sopGroups.every(g => isValidGroup(s.layout, g.cells)));
  assert.ok(equivalentToVals(s.sop, s.layout.vars, [1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1]));
  const four = solveKMap(4, Array(16).fill(1)); assert.equal(four.sop, "1"); assert.equal(four.sopGroups[0].cells.length, 16);
  const corners = solveKMap(4, Array.from({ length: 16 }, (_, i) => ([0, 2, 8, 10].includes(i) ? 1 : 0)));
  assert.equal(corners.sop, "B'D'"); assert.equal(corners.sopGroups.length, 1);
  assert.ok(isValidGroup(corners.layout, corners.sopGroups[0].cells), "four corners form one wrapped group");
  assert.equal(solveKMap(3, [0, 0, 0, 0, 0, 0, 0, 0]).sop, "0");
  assert.equal(solveKMap(2, [0, 1, 1, 0]).sopGroups.length, 2);
  assert.throws(() => solveKMap(3, [1, 0]));
  // a made-up non-rectangular set of cells is rejected by the validator
  const L = kmapLayout(3); assert.equal(isValidGroup(L, [L.cells[0][0], L.cells[0][1], L.cells[1][3]].map((_, i) => [{ r: 0, c: 0, m: 0 }, { r: 0, c: 1, m: 1 }, { r: 1, c: 3, m: 6 }][i])), false);
});
function equivalentToVals(text, vars, vals) { const tt = truthTableOf(parse(text), vars); return tt.rows.every((r, i) => r.output === vals[i]); }
