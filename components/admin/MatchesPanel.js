'use client';
import { useState, useEffect } from 'react';
import DropdownOrOther from './DropdownOrOther';

const LEAGUES = ['U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18'];
const TIERS = ['Premier', 'Major', 'Major 1'];
const CLUBS = ['Naas Town', 'Sallins Rovers', 'Athy Celtic', 'Newbridge Town', 'Kildare Town AFC',
  'Clane United', 'Monasterevin FC', 'Kilcullen Athletic', 'Leixlip United', 'Celbridge Town',
  'Maynooth Town', 'Confey FC', 'Rathangan Rovers', 'Ballymore Eustace', 'Two Mile House'];

function ReportRow({ r, onChanged }) {
  const [f, setF] = useState({
    homeScore: r.homeScore ?? '', awayScore: r.awayScore ?? '',
    homeScorers: r.homeScorers || '', awayScorers: r.awayScorers || '', motm: r.motm || '', yellowCards: r.yellowCards || '', redCards: r.redCards || '',
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch(`/api/admin/reports/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    setBusy(false);
    onChanged();
  }
  async function del() {
    if (!confirm(`Delete ${r.reporter}'s report for this match?`)) return;
    await fetch(`/api/admin/reports/${r.id}`, { method: 'DELETE' });
    onChanged();
  }

  return (
    <div className="card" style={{ background: 'var(--paper)' }}>
      <div className="field-hint">{r.reporter} ({r.reporterUsername}) · {new Date(r.createdAt).toLocaleString('en-IE')}</div>
      <div className="row2">
        <div className="field"><label>Home</label><input type="number" value={f.homeScore} onChange={(e) => setF({ ...f, homeScore: e.target.value })} /></div>
        <div className="field"><label>Away</label><input type="number" value={f.awayScore} onChange={(e) => setF({ ...f, awayScore: e.target.value })} /></div>
      </div>
      <div className="field"><label>Home scorers</label><input value={f.homeScorers} onChange={(e) => setF({ ...f, homeScorers: e.target.value })} /></div>
      <div className="field"><label>Away scorers</label><input value={f.awayScorers} onChange={(e) => setF({ ...f, awayScorers: e.target.value })} /></div>
      <div className="row2">
        <div className="field"><label>MOTM</label><input value={f.motm} onChange={(e) => setF({ ...f, motm: e.target.value })} /></div>
        <div className="field"><label>Yellow</label><input value={f.yellowCards} onChange={(e) => setF({ ...f, yellowCards: e.target.value })} /></div>
      </div>
      <div className="field"><label>Red</label><input value={f.redCards} onChange={(e) => setF({ ...f, redCards: e.target.value })} /></div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-small" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button className="btn-small" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={del}>Delete report</button>
      </div>
    </div>
  );
}

function MatchEditor({ m, onChanged, refereeNames }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    league: m.league, tier: m.tier, home: m.home, away: m.away,
    date: m.date ? m.date.slice(0, 16) : '', refName: m.refName || '',
    officialHome: m.officialHome ?? '', officialAway: m.officialAway ?? '', officialHomeScorers: m.officialHomeScorers || '', officialAwayScorers: m.officialAwayScorers || '',
    settled: m.settled, settledHome: m.settledHome ?? '', settledAway: m.settledAway ?? '',
    settledHomeScorers: m.settledHomeScorers || '', settledAwayScorers: m.settledAwayScorers || '', settledMotm: m.settledMotm || '', settledYellow: m.settledYellow || '', settledRed: m.settledRed || '',
  });
  const [reports, setReports] = useState(null);
  const [busy, setBusy] = useState(false);

  function loadReports() {
    fetch(`/api/admin/reports?matchId=${m.id}`).then((r) => r.json()).then(setReports);
  }
  useEffect(() => { if (open && !reports) loadReports(); }, [open]);

  async function save() {
    setBusy(true);
    await fetch(`/api/admin/matches/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    setBusy(false);
    onChanged();
  }
  async function del() {
    if (!confirm(`Delete the fixture ${m.home} vs ${m.away}? This deletes all its reports too.`)) return;
    await fetch(`/api/admin/matches/${m.id}`, { method: 'DELETE' });
    onChanged();
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{m.home} vs {m.away}</span>
        <span className="field-hint">{m.settled ? 'SETTLED' : m.consensus?.status || ''}</span>
      </div>
      <div className="field-hint">{m.league} {m.tier} · {m.date ? new Date(m.date).toLocaleDateString('en-IE') : 'TBC'} · {m.reportCount} reports</div>

      {open && (
        <>
          <div className="row2">
            <div className="field">
              <label>League</label>
              <select value={f.league} onChange={(e) => setF({ ...f, league: e.target.value })}>
                {LEAGUES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Tier</label>
              <select value={f.tier} onChange={(e) => setF({ ...f, tier: e.target.value })}>
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="row2">
            <DropdownOrOther label="Home club" value={f.home} onChange={(v) => setF({ ...f, home: v })} options={CLUBS} />
            <DropdownOrOther label="Away club" value={f.away} onChange={(v) => setF({ ...f, away: v })} options={CLUBS} />
          </div>
          <div className="row2">
            <div className="field"><label>Date &amp; kickoff time</label><input type="datetime-local" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <DropdownOrOther label="Referee" value={f.refName} onChange={(v) => setF({ ...f, refName: v })} options={refereeNames} />
          </div>

          <div className="field-hint" style={{ textTransform: 'uppercase', fontWeight: 600, margin: '10px 0 4px' }}>Official result (from KDUL or manual)</div>
          <div className="row2">
            <div className="field"><label>Home</label><input type="number" value={f.officialHome} onChange={(e) => setF({ ...f, officialHome: e.target.value })} /></div>
            <div className="field"><label>Away</label><input type="number" value={f.officialAway} onChange={(e) => setF({ ...f, officialAway: e.target.value })} /></div>
          </div>
          <div className="field"><label>Official home scorers</label><input value={f.officialHomeScorers} onChange={(e) => setF({ ...f, officialHomeScorers: e.target.value })} /></div>
          <div className="field"><label>Official away scorers</label><input value={f.officialAwayScorers} onChange={(e) => setF({ ...f, officialAwayScorers: e.target.value })} /></div>

          <div className="field-hint" style={{ textTransform: 'uppercase', fontWeight: 600, margin: '10px 0 4px' }}>Locked / settled result (overrides everything publicly)</div>
          <div className="field">
            <label><input type="checkbox" checked={f.settled} onChange={(e) => setF({ ...f, settled: e.target.checked })} style={{ width: 'auto', marginRight: 6 }} />Settled (locks reporting)</label>
          </div>
          <div className="row2">
            <div className="field"><label>Settled home</label><input type="number" value={f.settledHome} onChange={(e) => setF({ ...f, settledHome: e.target.value })} /></div>
            <div className="field"><label>Settled away</label><input type="number" value={f.settledAway} onChange={(e) => setF({ ...f, settledAway: e.target.value })} /></div>
          </div>
          <div className="field"><label>Settled home scorers</label><input value={f.settledHomeScorers} onChange={(e) => setF({ ...f, settledHomeScorers: e.target.value })} /></div>
          <div className="field"><label>Settled away scorers</label><input value={f.settledAwayScorers} onChange={(e) => setF({ ...f, settledAwayScorers: e.target.value })} /></div>
          <div className="row2">
            <div className="field"><label>Settled MOTM</label><input value={f.settledMotm} onChange={(e) => setF({ ...f, settledMotm: e.target.value })} /></div>
            <div className="field"><label>Settled yellow</label><input value={f.settledYellow} onChange={(e) => setF({ ...f, settledYellow: e.target.value })} /></div>
          </div>
          <div className="field"><label>Settled red</label><input value={f.settledRed} onChange={(e) => setF({ ...f, settledRed: e.target.value })} /></div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            <button className="btn-small" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save match'}</button>
            <button className="btn-small" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={del}>Delete match</button>
          </div>

          <div className="field-hint" style={{ textTransform: 'uppercase', fontWeight: 600, margin: '4px 0' }}>Community reports</div>
          {!reports ? <div className="field-hint">Loading reports…</div> : reports.length === 0 ? (
            <div className="field-hint">No reports for this match.</div>
          ) : reports.map((r) => <ReportRow key={r.id} r={r} onChanged={() => { loadReports(); onChanged(); }} />)}
        </>
      )}
    </div>
  );
}

function NewMatchForm({ onCreated, refereeNames }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ league: 'U10', tier: 'Premier', home: '', away: '', date: '', refName: '' });
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    await fetch('/api/admin/matches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    setBusy(false);
    setOpen(false);
    onCreated();
  }

  if (!open) return <button className="btn-small" onClick={() => setOpen(true)} style={{ marginBottom: 12 }}>+ New fixture</button>;

  return (
    <div className="card">
      <div className="row2">
        <div className="field">
          <label>League</label>
          <select value={f.league} onChange={(e) => setF({ ...f, league: e.target.value })}>
            {LEAGUES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Tier</label>
          <select value={f.tier} onChange={(e) => setF({ ...f, tier: e.target.value })}>
            {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="row2">
        <DropdownOrOther label="Home club" value={f.home} onChange={(v) => setF({ ...f, home: v })} options={CLUBS} />
        <DropdownOrOther label="Away club" value={f.away} onChange={(v) => setF({ ...f, away: v })} options={CLUBS} />
      </div>
      <div className="row2">
        <div className="field"><label>Date &amp; kickoff time</label><input type="datetime-local" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
        <DropdownOrOther label="Referee" value={f.refName} onChange={(v) => setF({ ...f, refName: v })} options={refereeNames} />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-small" onClick={create} disabled={busy || !f.home || !f.away}>{busy ? 'Creating…' : 'Create'}</button>
        <button className="btn-small" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

function MatchesPanel() {
  const [league, setLeague] = useState('U10');
  const [tier, setTier] = useState('Premier');
  const [matches, setMatches] = useState(null);
  const [refereeNames, setRefereeNames] = useState([]);

  function load() {
    fetch(`/api/admin/matches?league=${league}&tier=${encodeURIComponent(tier)}`).then((r) => r.json()).then(setMatches);
  }
  useEffect(load, [league, tier]);
  useEffect(() => {
    fetch('/api/admin/referees').then((r) => r.json()).then((refs) => setRefereeNames(refs.map((r) => r.name)));
  }, []);

  return (
    <div>
      <div className="section-title">Fixtures</div>
      <div className="row2">
        <div className="field">
          <label>League</label>
          <select value={league} onChange={(e) => setLeague(e.target.value)}>
            {LEAGUES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Tier</label>
          <select value={tier} onChange={(e) => setTier(e.target.value)}>
            {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <NewMatchForm onCreated={load} refereeNames={refereeNames} />
      {!matches ? <div className="empty-state">Loading…</div> : matches.length === 0 ? (
        <div className="empty-state">No fixtures for this league/tier.</div>
      ) : matches.map((m) => <MatchEditor key={m.id} m={m} onChanged={load} refereeNames={refereeNames} />)}
    </div>
  );
}

export default MatchesPanel;
