export function downloadFile(filename, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const safeFilename = (name, ext) => `${(name || "circuit").replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "circuit"}.${ext}`;
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    try { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok; } catch { return false; }
  }
}
export const readFileText = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("Could not read the file.")); r.readAsText(file); });
