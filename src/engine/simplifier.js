// Boolean simplification with recorded steps (algebraic laws) plus an exact Quine–McCluskey minimal form.
import { parse, toExpression, truthTableOf, variablesOf, equivalent, MAX_VARS } from "./booleanParser.js";
import { minimizeBoth, canonicalSOP, canonicalPOS, implicantAsProduct, implicantAsSum } from "./minimizer.js";

const V = name => ({ type: "var", name }), C = value => ({ type: "const", value });
const NOT = arg => ({ type: "not", arg });
const key = n => (n.type === "var" ? n.name : n.type === "const" ? String(n.value) : n.type === "not" ? `!${key(n.arg)}` : `${n.type}(${n.args.map(key).sort().join(",")})`);
const isComplement = (a, b) => (a.type === "not" && key(a.arg) === key(b)) || (b.type === "not" && key(b.arg) === key(a));

function normalize(ast) {
  const flat = (type, nodes) => ({ type, args: nodes.flatMap(n => (n.type === type ? n.args : [n])) });
  switch (ast.type) {
    case "var": case "const": return ast;
    case "not": return NOT(normalize(ast.arg));
    case "bin": {
      const l = normalize(ast.left), r = normalize(ast.right);
      switch (ast.op) {
        case "AND": return flat("and", [l, r]);
        case "OR": return flat("or", [l, r]);
        case "NAND": return NOT(flat("and", [l, r]));
        case "NOR": return NOT(flat("or", [l, r]));
        case "XOR": return flat("or", [flat("and", [l, NOT(r)]), flat("and", [NOT(l), r])]);
        case "XNOR": return flat("or", [flat("and", [l, r]), flat("and", [NOT(l), NOT(r)])]);
      }
    }
  }
  throw new Error("Unknown node");
}
const needsExpansion = ast => ast.type === "bin" ? ["NAND", "NOR", "XOR", "XNOR"].includes(ast.op) || needsExpansion(ast.left) || needsExpansion(ast.right) : ast.type === "not" ? needsExpansion(ast.arg) : false;

const build = (type, nodes) => (nodes.length === 0 ? C(type === "and" ? 1 : 0) : nodes.length === 1 ? nodes[0] : { type, args: nodes });

function applyRules(n) {
  if (n.type === "not") {
    const a = n.arg;
    if (a.type === "not") return { node: a.arg, rule: "Double negation: (X')' = X" };
    if (a.type === "const") return { node: C(a.value ? 0 : 1), rule: "Negate a constant: 1' = 0, 0' = 1" };
    if (a.type === "and") return { node: { type: "or", args: a.args.map(NOT) }, rule: "De Morgan's law: (XY)' = X' + Y'" };
    if (a.type === "or") return { node: { type: "and", args: a.args.map(NOT) }, rule: "De Morgan's law: (X + Y)' = X'Y'" };
    return null;
  }
  if (n.type !== "and" && n.type !== "or") return null;
  const isAnd = n.type === "and", dual = isAnd ? "or" : "and", ident = isAnd ? 1 : 0, absorb = isAnd ? 0 : 1;
  const args = n.args;
  if (args.some(a => a.type === n.type)) return { node: build(n.type, args.flatMap(a => (a.type === n.type ? a.args : [a]))), rule: "Associative law: remove redundant grouping" };
  if (args.length < 2) return { node: build(n.type, args), rule: "Remove redundant grouping" };
  if (args.some(a => a.type === "const" && a.value === absorb)) return { node: C(absorb), rule: isAnd ? "Null law: X·0 = 0" : "Null law: X + 1 = 1" };
  if (args.some(a => a.type === "const" && a.value === ident)) return { node: build(n.type, args.filter(a => !(a.type === "const" && a.value === ident))), rule: isAnd ? "Identity law: X·1 = X" : "Identity law: X + 0 = X" };
  const seen = new Set(), uniq = [];
  for (const a of args) { const k = key(a); if (!seen.has(k)) { seen.add(k); uniq.push(a); } }
  if (uniq.length < args.length) return { node: build(n.type, uniq), rule: isAnd ? "Idempotent law: X·X = X" : "Idempotent law: X + X = X" };
  for (let i = 0; i < args.length; i++) for (let j = i + 1; j < args.length; j++)
    if (isComplement(args[i], args[j])) return { node: C(absorb), rule: isAnd ? "Complement law: X·X' = 0" : "Complement law: X + X' = 1" };
  const factors = a => (a.type === dual ? a.args : [a]);
  const fkeys = a => new Set(factors(a).map(key));
  for (let i = 0; i < args.length; i++) for (let j = 0; j < args.length; j++) {
    if (i === j) continue;
    const fi = fkeys(args[i]), fj = fkeys(args[j]);
    if (fi.size < fj.size && [...fi].every(k => fj.has(k))) return { node: build(n.type, args.filter((_, x) => x !== j)), rule: isAnd ? "Absorption law: X(X + Y) = X" : "Absorption law: X + XY = X" };
  }
  for (let i = 0; i < args.length; i++) for (let j = 0; j < args.length; j++) {
    if (i === j || args[i].type === dual) continue;
    const fs = factors(args[j]);
    if (args[j].type !== dual) continue;
    const f = fs.find(x => isComplement(x, args[i]));
    if (f) { const rest = fs.filter(x => x !== f); const next = args.map((a, x) => (x === j ? build(dual, rest) : a)); return { node: build(n.type, next), rule: isAnd ? "Redundancy law: X(X' + Y) = XY" : "Redundancy law: X + X'Y = X + Y" }; }
  }
  for (let i = 0; i < args.length; i++) for (let j = i + 1; j < args.length; j++) {
    const fi = factors(args[i]), fj = factors(args[j]);
    if (fi.length !== fj.length || fi.length < 2) continue;
    const onlyI = fi.filter(x => !fj.some(y => key(x) === key(y))), onlyJ = fj.filter(y => !fi.some(x => key(x) === key(y)));
    if (onlyI.length === 1 && onlyJ.length === 1 && isComplement(onlyI[0], onlyJ[0])) {
      const common = fi.filter(x => x !== onlyI[0]);
      const next = args.filter((_, x) => x !== i && x !== j); next.push(build(dual, common));
      return { node: build(n.type, next), rule: isAnd ? "Combining law: (X + Y)(X + Y') = X" : "Combining law: XY + XY' = X" };
    }
  }
  return null;
}

function rewriteOnce(n) {
  if (n.type === "not") { const r = rewriteOnce(n.arg); if (r) return { node: NOT(r.node), rule: r.rule }; }
  if (n.args) for (let i = 0; i < n.args.length; i++) { const r = rewriteOnce(n.args[i]); if (r) return { node: { ...n, args: n.args.map((a, x) => (x === i ? r.node : a)) }, rule: r.rule }; }
  return applyRules(n);
}

const MAX_STEPS = 200;
/** Returns { steps:[{rule, expression}], result:ast } — every step is logically equivalent to the original. */
export function algebraicSteps(ast) {
  const steps = [];
  let node = normalize(ast);
  if (needsExpansion(ast)) steps.push({ rule: "Rewrite NAND/NOR/XOR/XNOR using AND, OR and NOT", expression: toExpression(node) });
  for (let i = 0; i < MAX_STEPS; i++) {
    const r = rewriteOnce(node);
    if (!r) return { steps, result: node, complete: true };
    node = r.node; steps.push({ rule: r.rule, expression: toExpression(node) });
  }
  return { steps, result: node, complete: false };
}

const sigma = list => `Σm(${list.join(", ") || "—"})`;
/** Full simplification report for an expression string or AST. Throws ParseError for bad input. */
export function simplify(input) {
  const ast = typeof input === "string" ? parse(input) : input;
  const vars = variablesOf(ast);
  const original = toExpression(ast);
  const alg = algebraicSteps(ast);
  const algebraic = toExpression(alg.result);
  if (!equivalent(ast, alg.result).equal) throw new Error("Internal error: algebraic simplification changed the function.");
  const report = { original, vars, steps: alg.steps, algebraic, complete: alg.complete };
  if (vars.length > MAX_VARS) return { ...report, note: `Truth-table based minimisation is limited to ${MAX_VARS} variables.` };
  const table = truthTableOf(ast, vars);
  report.minterms = table.minterms;
  if (!vars.length) { report.sop = report.pos = String(table.rows[0].output); report.qm = ["The expression has no variables, so it is the constant " + report.sop + "."]; return report; }
  if (vars.length > 8) return { ...report, note: "Quine–McCluskey minimisation is limited to 8 variables." };
  const both = minimizeBoth(vars, table.minterms);
  const maxterms = table.rows.filter(r => !r.output).map(r => r.minterm);
  report.sop = both.sopText; report.pos = both.posText;
  report.canonicalSOP = canonicalSOP(vars, table.minterms); report.canonicalPOS = canonicalPOS(vars, maxterms);
  report.qm = [
    `Truth table: F = ${sigma(table.minterms)}.`,
    both.sop.primes.length ? `Prime implicants: ${both.sop.primes.map(p => implicantAsProduct(p, vars)).join(", ")}.` : "No prime implicants (F is always 0).",
    both.sop.essential.length ? `Essential prime implicants: ${both.sop.essential.map(p => implicantAsProduct(p, vars)).join(", ")}.` : "No essential prime implicants.",
    `Minimal sum of products: F = ${both.sopText}.`,
    `Minimal product of sums: F = ${both.posText}.`,
  ];
  for (const [label, text] of [["SOP", both.sopText], ["POS", both.posText]]) if (!equivalent(ast, text).equal) throw new Error(`Internal error: minimal ${label} is not equivalent.`);
  return report;
}

/** Build an expression from a truth-table output column (index = minterm; values 0/1/'X'). */
export function expressionFromTruthTable(vars, outputs) {
  const minterms = [], dcs = [], maxterms = [];
  outputs.forEach((v, i) => { if (v === 1) minterms.push(i); else if (v === "X") dcs.push(i); else maxterms.push(i); });
  const both = minimizeBoth(vars, minterms, dcs);
  return { canonicalSOP: canonicalSOP(vars, minterms), canonicalPOS: canonicalPOS(vars, maxterms), sop: both.sopText, pos: both.posText, minterms, dontcares: dcs, maxterms };
}
export { implicantAsProduct, implicantAsSum };
