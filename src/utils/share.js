// Share links keep the circuit inside the URL hash, so nothing is ever uploaded.
import { exportCircuit, importCircuitJson } from "../engine/circuit.js";
const toB64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));
export const MAX_SHARE_LENGTH = 12000;
export function makeShareLink(circuit) {
  const json = JSON.stringify(JSON.parse(exportCircuit(circuit)));
  const code = toB64(json);
  if (code.length > MAX_SHARE_LENGTH) return { ok: false, error: "This circuit is too large for a link. Export it as a JSON file instead." };
  return { ok: true, url: `${location.origin}${location.pathname}#/builder?c=${code}` };
}
export function parseShared(code) {
  try { return importCircuitJson(fromB64(code)); } catch { return { ok: false, errors: ["The shared link is damaged."], circuit: null }; }
}
