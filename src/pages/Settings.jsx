import React from "react";
import { useWorkspace } from "../state/WorkspaceContext.jsx";

const Toggle = ({ label, desc, checked, onChange }) => <label className="setting"><span><b>{label}</b><small>{desc}</small></span><input type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} /></label>;
export default function Settings() {
  const { settings, updateSettings, confirm, resetEverything, toast } = useWorkspace();
  return <div className="page"><div className="page-head"><div><h1>Settings</h1><p>Preferences are stored in this browser only.</p></div></div>
    <section className="panel"><h2>Appearance</h2><div className="seg-control" role="radiogroup" aria-label="Theme">{["dark", "light"].map(t => <button key={t} role="radio" aria-checked={settings.theme === t} className={settings.theme === t ? "active" : ""} onClick={() => updateSettings({ theme: t })}>{t === "dark" ? "Dark" : "Light"}</button>)}</div>
      <Toggle label="Reduce motion" desc="Turns off transitions and animations." checked={settings.reducedMotion} onChange={v => updateSettings({ reducedMotion: v })} /></section>
    <section className="panel"><h2>Circuit editor</h2>
      <Toggle label="Snap to grid" desc="Align components to a 20 px grid when moving or placing them." checked={settings.snap} onChange={v => updateSettings({ snap: v })} />
      <Toggle label="Show wire values" desc="Print 0, 1 or X on each wire." checked={settings.wireValues} onChange={v => updateSettings({ wireValues: v })} />
      <Toggle label="Autosave workspace" desc="Keep the current circuit in this browser so it is restored on your next visit." checked={settings.autosave} onChange={v => updateSettings({ autosave: v })} /></section>
    <section className="panel"><h2>Local data</h2><p className="muted">Workspace, library, challenge progress and settings are kept in your browser's localStorage. Nothing is sent to a server.</p>
      <button className="btn danger" onClick={async () => { if (await confirm({ title: "Erase all LogicLab data?", message: "This deletes your saved circuits, workspace, settings and progress in this browser. Export anything you want to keep first.", confirmLabel: "Erase everything", danger: true })) { resetEverything(); try { ["logiclab.progress.v1", "logiclab.challenges.v1"].forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ } toast("All local data erased", "success"); } }}>Erase all local data</button></section></div>;
}
