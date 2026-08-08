'use client';
import { useState, useEffect } from 'react';

const LEAGUES = ['U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18'];
const TIERS = ['Premier', 'Major', 'Major 1'];

function CandidateRow({ c, onChanged }) {
  const [ageGroup, setAgeGroup] = useState(c.ageGroup || '');
  const [tier, setTier] = useState(c.tier || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function resolve(action, extra) {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/admin/import-candidates/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed.');
      return;
    }
    onChanged();
  }

  const hasDupes = c.possibleDuplicateCandidates.length > 0 || c.possibleDuplicatePlayers.length > 0;

  return (
    <div className="card" style={hasDupes ? { borderColor: 'var(--red)' } : undefined}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
      <div className="field-hint">{c.club}{c.sourceNote ? ` · ${c.sourceNote}` : ''}{c.sourceLabel ? ` · ${c.sourceLabel}` : ''}</div>

      {hasDupes && (
        <div className="notice-box" style={{ background: 'var(--red-dim)', borderColor: 'var(--red)', color: 'var(--red)', marginTop: 6 }}>
          Possible duplicate of:
          {c.possibleDuplicatePlayers.map((p) => (
            <div key={p.id}>— {p.name} (already a confirmed player, {p.ageGroup} {p.tier})</div>
          ))}
          {c.possibleDuplicateCandidates.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              — {d.name} (also pending)
              <button className="btn-small" disabled={busy} onClick={() => resolve('merge-into', { targetId: d.id })}>Merge into this one</button>
            </div>
          ))}
        </div>
      )}

      <div className="row2" style={{ marginTop: 8 }}>
        <div className="field">
          <label>Age group</label>
          <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
            <option value="">—</option>
            {LEAGUES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Division</label>
          <select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="">—</option>
            {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      {error && <div className="error-text">{error}</div>}
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button className="btn-small" disabled={busy || !ageGroup || !tier} onClick={() => resolve('confirm', { ageGroup, tier })}>
          {busy ? 'Working…' : 'Confirm as real player'}
        </button>
        <button className="btn-small" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} disabled={busy} onClick={() => resolve('discard')}>Discard</button>
      </div>
    </div>
  );
}

function BulkPasteForm({ onImported }) {
  const [text, setText] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true);
    setError('');
    setResult(null);
    const res = await fetch('/api/admin/import-candidates/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sourceLabel }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error || 'Import failed.'); return; }
    setResult(data);
    setText('');
    onImported();
  }

  return (
    <div className="card">
      <div className="field-hint" style={{ marginBottom: 6 }}>
        Paste club names as headers, followed by a comma-separated list of players for that club. Repeat for as many clubs as you like in one paste.
      </div>
      <div className="field">
        <label>Source label (optional — where this came from)</label>
        <input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} placeholder="e.g. Web research, 2024-2026 match reports" />
      </div>
      <div className="field">
        <label>Paste names</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={'Naas AFC\nJack Murphy, Kelly, Peter McBride\n\nClane United FC\nSean Og Finn, Andrew McCormack'}
        />
      </div>
      {error && <div className="error-text">{error}</div>}
      {result && <div className="field-hint">Parsed {result.parsed}, staged {result.created} new, skipped {result.skipped} already known.</div>}
      <button className="btn-small" disabled={busy || !text.trim()} onClick={submit}>{busy ? 'Importing…' : 'Import'}</button>
    </div>
  );
}

function PlayerImportPanel() {
  const [candidates, setCandidates] = useState(null);

  function load() {
    fetch('/api/admin/import-candidates').then((r) => r.json()).then(setCandidates);
  }
  useEffect(load, []);

  const byClub = {};
  (candidates || []).forEach((c) => {
    byClub[c.club] = byClub[c.club] || [];
    byClub[c.club].push(c);
  });

  return (
    <div>
      <div className="section-title">Bulk Import Players</div>
      <BulkPasteForm onImported={load} />

      <div className="section-title">Review Queue ({candidates ? candidates.length : '…'})</div>
      {!candidates ? (
        <div className="empty-state">Loading…</div>
      ) : candidates.length === 0 ? (
        <div className="empty-state">Nothing pending review.</div>
      ) : (
        Object.entries(byClub).map(([club, list]) => (
          <div key={club}>
            <div className="field-hint" style={{ textTransform: 'uppercase', fontWeight: 600, margin: '10px 0 4px' }}>{club} ({list.length})</div>
            {list.map((c) => <CandidateRow key={c.id} c={c} onChanged={load} />)}
          </div>
        ))
      )}
    </div>
  );
}

export default PlayerImportPanel;
