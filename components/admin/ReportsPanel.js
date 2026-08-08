'use client';
import { useState, useEffect } from 'react';

function ReportRow({ r, onChanged }) {
  const [f, setF] = useState({
    homeScore: r.homeScore ?? '', awayScore: r.awayScore ?? '',
    homeScorers: r.homeScorers || '', awayScorers: r.awayScorers || '', motm: r.motm || '', yellowCards: r.yellowCards || '', redCards: r.redCards || '',
  });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch(`/api/admin/reports/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    setBusy(false);
    onChanged();
  }
  async function del() {
    if (!confirm(`Delete ${r.reporter}'s report on ${r.match.home} vs ${r.match.away}?`)) return;
    await fetch(`/api/admin/reports/${r.id}`, { method: 'DELETE' });
    onChanged();
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{r.reporter}</span>
        <span className="field-hint">{new Date(r.createdAt).toLocaleDateString('en-IE')}</span>
      </div>
      <div className="field-hint">{r.match.home} vs {r.match.away} · {r.match.league} {r.match.tier} · reported {r.homeScore}–{r.awayScore}</div>
      {open && (
        <>
          <div className="row2">
            <div className="field"><label>Home</label><input type="number" value={f.homeScore} onChange={(e) => setF({ ...f, homeScore: e.target.value })} /></div>
            <div className="field"><label>Away</label><input type="number" value={f.awayScore} onChange={(e) => setF({ ...f, awayScore: e.target.value })} /></div>
          </div>
          <div className="field"><label>{r.match.home} scorers</label><input value={f.homeScorers} onChange={(e) => setF({ ...f, homeScorers: e.target.value })} /></div>
          <div className="field"><label>{r.match.away} scorers</label><input value={f.awayScorers} onChange={(e) => setF({ ...f, awayScorers: e.target.value })} /></div>
          <div className="row2">
            <div className="field"><label>Their MOTM pick</label><input value={f.motm} onChange={(e) => setF({ ...f, motm: e.target.value })} /></div>
            <div className="field"><label>Yellow</label><input value={f.yellowCards} onChange={(e) => setF({ ...f, yellowCards: e.target.value })} /></div>
          </div>
          <div className="field"><label>Red</label><input value={f.redCards} onChange={(e) => setF({ ...f, redCards: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-small" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button className="btn-small" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={del}>Delete</button>
          </div>
        </>
      )}
    </div>
  );
}

function ReportsPanel() {
  const [reports, setReports] = useState(null);
  const [q, setQ] = useState('');

  function load() {
    fetch('/api/admin/reports').then((r) => r.json()).then(setReports);
  }
  useEffect(load, []);

  const filtered = reports && q.trim()
    ? reports.filter((r) => `${r.reporter} ${r.match.home} ${r.match.away}`.toLowerCase().includes(q.toLowerCase()))
    : reports;

  return (
    <div>
      <div className="section-title">All Reports</div>
      <div className="field"><label>Search by reporter or club</label><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. naas_parent_22" /></div>
      {!filtered ? <div className="empty-state">Loading…</div> : filtered.length === 0 ? (
        <div className="empty-state">No reports found.</div>
      ) : filtered.map((r) => <ReportRow key={r.id} r={r} onChanged={load} />)}
    </div>
  );
}

export default ReportsPanel;
