// Quine–McCluskey minimisation with don't-cares and an exact minimum cover search.
const popcount = x => { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; };

/** Implicant: { value, mask, covers }. A 1 bit in `mask` means "don't care" for that variable. */
export function primeImplicants(n, minterms, dontcares = []) {
  const all = [...new Set([...minterms, ...dontcares])].sort((a, b) => a - b);
  let level = new Map(all.map(m => [`0:${m}`, { value: m, mask: 0, covers: [m] }]));
  const primes = [];
  while (level.size) {
    const items = [...level.values()], used = new Set(), next = new Map();
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.mask !== b.mask) continue;
      const diff = a.value ^ b.value;
      if (diff && (diff & (diff - 1)) === 0) {
        used.add(i); used.add(j);
        const value = a.value & ~diff, mask = a.mask | diff, key = `${mask}:${value}`;
        if (!next.has(key)) next.set(key, { value, mask, covers: [...new Set([...a.covers, ...b.covers])].sort((x, y) => x - y) });
      }
    }
    items.forEach((it, i) => { if (!used.has(i)) primes.push(it); });
    level = next;
  }
  return primes;
}

const literals = (imp, n) => n - popcount(imp.mask);

/** Exact minimum cover: fewest terms, then fewest literals. Falls back to greedy for very large searches. */
function minimumCover(n, required, primes) {
  const essential = [], remaining = new Set(required);
  const covering = m => primes.filter(p => p.covers.includes(m));
  for (const m of required) { const c = covering(m); if (c.length === 1 && !essential.includes(c[0])) essential.push(c[0]); }
  essential.forEach(p => p.covers.forEach(m => remaining.delete(m)));
  const pool = primes.filter(p => !essential.includes(p) && p.covers.some(m => remaining.has(m)));
  let best = null, nodes = 0;
  const cost = set => [set.length, set.reduce((s, p) => s + literals(p, n), 0)];
  const better = (a, b) => !b || a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  const search = (unc, chosen) => {
    if (++nodes > 50000) return;
    if (!unc.size) { if (better(cost(chosen), best && cost(best))) best = [...chosen]; return; }
    if (best && chosen.length >= best.length) return;
    let pick = null, opts = null;
    for (const m of unc) { const o = pool.filter(p => p.covers.includes(m)); if (!opts || o.length < opts.length) { pick = m; opts = o; } }
    for (const p of opts) { const nu = new Set(unc); p.covers.forEach(m => nu.delete(m)); search(nu, [...chosen, p]); }
  };
  search(remaining, []);
  if (!best) { // greedy fallback
    best = []; const unc = new Set(remaining);
    while (unc.size) { const p = pool.reduce((a, b) => (b.covers.filter(m => unc.has(m)).length > a.covers.filter(m => unc.has(m)).length ? b : a)); best.push(p); p.covers.forEach(m => unc.delete(m)); }
  }
  return { essential, extra: best };
}

export const implicantTerm = (imp, vars) => {
  const n = vars.length, parts = [];
  vars.forEach((v, i) => { const bit = n - 1 - i; if (!((imp.mask >> bit) & 1)) parts.push(((imp.value >> bit) & 1) ? v : `${v}'`); });
  return parts;
};
export const implicantAsProduct = (imp, vars) => { const p = implicantTerm(imp, vars); return p.length ? p.join(vars.every(v => v.length === 1) ? "" : "·") : "1"; };
export const implicantAsSum = (imp, vars) => {
  // For a cover of F' (zeros): clause is the complement of each literal.
  const n = vars.length, parts = [];
  vars.forEach((v, i) => { const bit = n - 1 - i; if (!((imp.mask >> bit) & 1)) parts.push(((imp.value >> bit) & 1) ? `${v}'` : v); });
  return parts.length ? `(${parts.join(" + ")})` : "0";
};

export function minimize(n, minterms, dontcares = []) {
  const ones = [...new Set(minterms)].sort((a, b) => a - b), dcs = [...new Set(dontcares)].filter(d => !ones.includes(d)).sort((a, b) => a - b);
  if (n < 1 || n > 8) throw new Error("Minimisation supports 1 to 8 variables.");
  const max = 2 ** n;
  if ([...ones, ...dcs].some(m => !Number.isInteger(m) || m < 0 || m >= max)) throw new Error("Minterm out of range.");
  if (!ones.length) return { primes: [], essential: [], cover: [], minterms: ones, dontcares: dcs, constant: 0 };
  const primes = primeImplicants(n, ones, dcs);
  const { essential, extra } = minimumCover(n, ones, primes);
  const cover = [...essential, ...extra];
  return { primes, essential, cover, minterms: ones, dontcares: dcs, constant: cover.some(c => c.mask === max - 1) ? 1 : null };
}

/** Full SOP/POS result for a function given as minterms (ones) and don't-cares. */
export function minimizeBoth(vars, minterms, dontcares = []) {
  const n = vars.length, max = 2 ** n;
  const dcSet = new Set(dontcares), oneSet = new Set(minterms);
  const zeros = Array.from({ length: max }, (_, i) => i).filter(i => !oneSet.has(i) && !dcSet.has(i));
  const sop = minimize(n, minterms, dontcares), pos = minimize(n, zeros, dontcares);
  const sopText = sop.constant === 0 ? "0" : sop.constant === 1 ? "1" : sop.cover.map(c => implicantAsProduct(c, vars)).sort().join(" + ");
  const posText = pos.constant === 0 ? "1" : pos.constant === 1 ? "0" : pos.cover.map(c => implicantAsSum(c, vars)).sort().join("");
  return { sop, pos, sopText, posText };
}

export const canonicalSOP = (vars, minterms) => minterms.length ? minterms.map(m => vars.map((v, i) => ((m >> (vars.length - 1 - i)) & 1 ? v : `${v}'`)).join(vars.every(v => v.length === 1) ? "" : "·")).join(" + ") : "0";
export const canonicalPOS = (vars, maxterms) => maxterms.length ? maxterms.map(m => `(${vars.map((v, i) => ((m >> (vars.length - 1 - i)) & 1 ? `${v}'` : v)).join(" + ")})`).join("") : "1";
