'use client';
import { useState, useEffect } from 'react';

function RefEditor({ referee: r, onChanged }) {
  const [f, setF] = useState({ name: r.name, trust: r.trust, sourceUrl: r.sourceUrl || '' });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch(`/api/admin/referees/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, trust: Number(f.trust) }) });
    setBusy(false);
    onChanged();
  }
  async function del() {
    if (!confirm(`Delete referee "${r.name}"?`)) return;
    await fetch(`/api/admin/referees/${r.id}`, { method: 'DELETE' });
    onChanged();
  }

  return (
    <div className="card">
      <div className="row2">
        <div className="field"><label>Name</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="field"><label>Trust</label><input type="number" value={f.trust} onChange={(e) => setF({ ...f, trust: e.target.value })} /></div>
      </div>
      <div className="field"><label>Source URL (KDUL profile, optional)</label><input value={f.sourceUrl} onChange={(e) => setF({ ...f, sourceUrl: e.target.value })} /></div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-small" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button className="btn-small" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={del}>Delete</button>
      </div>
    </div>
  );
}

function NewRefForm({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [trust, setTrust] = useState(10);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    await fetch('/api/admin/referees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, trust: Number(trust) }) });
    setBusy(false);
    setName('');
    setOpen(false);
    onCreated();
  }

  if (!open) return <button className="btn-small" onClick={() => setOpen(true)} style={{ marginBottom: 12 }}>+ New referee</button>;

  return (
    <div className="card">
      <div className="row2">
        <div className="field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label>Starting trust</label><input type="number" value={trust} onChange={(e) => setTrust(e.target.value)} /></div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-small" onClick={create} disabled={busy || !name}>{busy ? 'Creating…' : 'Create'}</button>
        <button className="btn-small" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

function RefereesPanel() {
  const [refs, setRefs] = useState(null);

  function load() {
    fetch('/api/admin/referees').then((r) => r.json()).then(setRefs);
  }
  useEffect(load, []);

  return (
    <div>
      <div className="section-title">Referees</div>
      <NewRefForm onCreated={load} />
      {!refs ? <div className="empty-state">Loading…</div> : refs.map((r) => <RefEditor key={r.id} referee={r} onChanged={load} />)}
    </div>
  );
}

export default RefereesPanel;
