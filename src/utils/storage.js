// All persistence is local (localStorage). Everything read back is validated before use.
import { validateCircuit } from "../engine/circuit.js";

export const KEYS = { workspace: "logiclab.workspace.v1", library: "logiclab.library.v1", settings: "logiclab.settings.v1" };
const read = key => { try { const t = localStorage.getItem(key); return t ? JSON.parse(t) : null; } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return { ok: true }; } catch (e) { return { ok: false, error: e?.name === "QuotaExceededError" ? "Browser storage is full." : "Browser storage is unavailable." }; } };

export const DEFAULT_SETTINGS = { theme: "dark", snap: true, autosave: true, wireValues: true, reducedMotion: false };
export const loadSettings = () => { const s = read(KEYS.settings); return { ...DEFAULT_SETTINGS, ...(s && typeof s === "object" ? Object.fromEntries(Object.keys(DEFAULT_SETTINGS).filter(k => typeof s[k] === typeof DEFAULT_SETTINGS[k]).map(k => [k, s[k]])) : {}) }; };
export const saveSettings = s => write(KEYS.settings, s);

export function loadWorkspace() { const raw = read(KEYS.workspace); const v = raw && validateCircuit(raw.circuit); return v?.ok ? v.circuit : null; }
export const saveWorkspace = circuit => write(KEYS.workspace, { savedAt: Date.now(), circuit });

export function loadLibrary() {
  const raw = read(KEYS.library);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap(e => { const v = e && typeof e.id === "string" ? validateCircuit(e.circuit) : null; return v?.ok ? [{ id: e.id, name: String(e.name || v.circuit.name).slice(0, 60), updatedAt: Number(e.updatedAt) || 0, circuit: v.circuit }] : []; });
}
export const saveLibrary = list => write(KEYS.library, list);
export const clearAllData = () => { Object.values(KEYS).forEach(k => { try { localStorage.removeItem(k); } catch { /* ignore */ } }); };
export const newId = () => `lib_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
