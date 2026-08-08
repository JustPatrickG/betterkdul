'use client';
import { useState, useEffect } from 'react';

const LEAGUES = ['U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18'];
const TIERS = ['Premier', 'Major', 'Major 1'];
const CLUBS = ['Naas Town', 'Sallins Rovers', 'Athy Celtic', 'Newbridge Town', 'Kildare Town AFC',
  'Clane United', 'Monasterevin FC', 'Kilcullen Athletic', 'Leixlip United', 'Celbridge Town',
  'Maynooth Town', 'Confey FC', 'Rathangan Rovers', 'Ballymore Eustace', 'Two Mile House'];

function ClubQuickEdit({ onChanged }) {
  const [club, setClub] = useState(CLUBS[0]);
  const [grounds, setGrounds] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch(`/api/clubs/${encodeURIComponent(club)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grounds }) });
    setBusy(false);
    setGrounds('');
    onChanged();
  }

  return (
    <div className="card">
      <div className="field">
        <label>Club</label>
        <select value={club} onChange={(e) => setClub(e.target.value)}>
          {CLUBS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="field"><label>Grounds</label><input value={grounds} onChange={(e) => setGrounds(e.target.value)} placeholder="e.g. Naas Sportsground, Craddockstown Rd" /></div>
      <button className="btn-small" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </div>
  );
}

function ClubInfoRow({ c, onChanged }) {
  async function del() {
    if (!confirm(`Clear ground info for "${c.club}"?`)) return;
    await fetch(`/api/admin/clubs/${encodeURIComponent(c.club)}`, { method: 'DELETE' });
    onChanged();
  }
  return (
    <div className="card">
      <div style={{ fontWeight: 700, fontSize: 13 }}>{c.club}</div>
      <div className="field-hint">📍 {c.grounds || '—'} {c.updatedBy ? `· last edited by ${c.updatedBy}` : ''}</div>
      <button className="btn-small" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={del}>Clear</button>
    </div>
  );
}

function TeamQuickEdit({ onChanged }) {
  const [club, setClub] = useState(CLUBS[0]);
  const [league, setLeague] = useState(LEAGUES[0]);
  const [tier, setTier] = useState(TIERS[0]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const key = encodeURIComponent(`${club}__${league}__${tier}`);
    await fetch(`/api/teams/${key}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) });
    setBusy(false);
    setNotes('');
    onChanged();
  }

  return (
    <div className="card">
      <div className="row2">
        <div className="field">
          <label>Club</label>
          <select value={club} onChange={(e) => setClub(e.target.value)}>{CLUBS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        </div>
        <div className="field">
          <label>Age group</label>
          <select value={league} onChange={(e) => setLeague(e.target.value)}>{LEAGUES.map((l) => <option key={l} value={l}>{l}</option>)}</select>
        </div>
      </div>
      <div className="field">
        <label>Division</label>
        <select value={tier} onChange={(e) => setTier(e.target.value)}>{TIERS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
      </div>
      <div className="field"><label>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Coach: S. Ryan." /></div>
      <button className="btn-small" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </div>
  );
}

function TeamInfoRow({ t, onChanged }) {
  const [club, league, tier] = t.key.split('|');
  async function del() {
    if (!confirm(`Clear notes for ${club} ${league} ${tier}?`)) return;
    const urlKey = encodeURIComponent(`${club}__${league}__${tier}`);
    await fetch(`/api/admin/teams/${urlKey}`, { method: 'DELETE' });
    onChanged();
  }
  return (
    <div className="card">
      <div style={{ fontWeight: 700, fontSize: 13 }}>{club} · {league} {tier}</div>
      <div className="field-hint">{t.notes || '—'} {t.updatedBy ? `· last edited by ${t.updatedBy}` : ''}</div>
      <button className="btn-small" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={del}>Clear</button>
    </div>
  );
}

function ClubTeamPanel() {
  const [clubs, setClubs] = useState(null);
  const [teams, setTeams] = useState(null);

  function load() {
    fetch('/api/admin/clubs').then((r) => r.json()).then(setClubs);
    fetch('/api/admin/teams').then((r) => r.json()).then(setTeams);
  }
  useEffect(load, []);

  return (
    <div>
      <div className="section-title">Club Grounds</div>
      <ClubQuickEdit onChanged={load} />
      {!clubs ? <div className="empty-state">Loading…</div> : clubs.length === 0 ? (
        <div className="empty-state">No club info submitted yet.</div>
      ) : clubs.map((c) => <ClubInfoRow key={c.club} c={c} onChanged={load} />)}

      <div className="section-title">Team Notes</div>
      <TeamQuickEdit onChanged={load} />
      {!teams ? <div className="empty-state">Loading…</div> : teams.length === 0 ? (
        <div className="empty-state">No team notes submitted yet.</div>
      ) : teams.map((t) => <TeamInfoRow key={t.key} t={t} onChanged={load} />)}
    </div>
  );
}

export default ClubTeamPanel;
