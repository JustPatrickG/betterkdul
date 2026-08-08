'use client';
import { useState, useEffect } from 'react';
import PasswordInput from '../PasswordInput';

const LEAGUES = ['U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18'];
const TIERS = ['Premier', 'Major', 'Major 1'];
const CLUBS = ['Naas Town', 'Sallins Rovers', 'Athy Celtic', 'Newbridge Town', 'Kildare Town AFC',
  'Clane United', 'Monasterevin FC', 'Kilcullen Athletic', 'Leixlip United', 'Celbridge Town',
  'Maynooth Town', 'Confey FC', 'Rathangan Rovers', 'Ballymore Eustace', 'Two Mile House'];

function timeAgo(iso) {
  if (!iso) return 'never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
function isOnline(a) {
  return a.lastActiveAt && (Date.now() - new Date(a.lastActiveAt).getTime()) < 5 * 60 * 1000;
}

function AccountEditor({ a, onSaved, onDeleted }) {
  const [f, setF] = useState({
    displayName: a.displayName, email: a.email, type: a.type,
    ageGroup: a.ageGroup || '', league: a.league || '', club: a.club || '',
    fanClubs: a.fanClubs || [], verificationStatus: a.verificationStatus,
    trust: a.trust, isAdmin: a.isAdmin, newPassword: '',
  });
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  function toggleFanClub(c) {
    setF((prev) => ({ ...prev, fanClubs: prev.fanClubs.includes(c) ? prev.fanClubs.filter((x) => x !== c) : [...prev.fanClubs, c] }));
  }

  async function save() {
    setBusy(true);
    setError('');
    const body = { ...f, trust: Number(f.trust) };
    if (!body.newPassword) delete body.newPassword;
    const res = await fetch(`/api/admin/accounts/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || `Save failed (status ${res.status}).`);
      return;
    }
    setF((prev) => ({ ...prev, newPassword: '' }));
    onSaved();
  }

  async function del() {
    if (!confirm(`Delete account "${a.displayName}"? This deletes their reports too and can't be undone.`)) return;
    await fetch(`/api/admin/accounts/${a.id}`, { method: 'DELETE' });
    onDeleted();
  }

  async function signInAs() {
    if (!confirm(`Sign in as "${a.displayName}"? This replaces your current session in this browser — you'll need to log back in as admin afterward.`)) return;
    await fetch(`/api/admin/accounts/${a.id}/impersonate`, { method: 'POST' });
    window.location.href = '/account';
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <span style={{ fontWeight: 700 }}>{isOnline(a) ? '🟢 ' : ''}{a.displayName} <span className="field-hint">({a.username})</span></span>
        <span className="field-hint">{a.verificationStatus.replace('_', ' ')}{a.isAdmin ? ' · ADMIN' : ''}</span>
      </div>
      {!open ? (
        <div className="field-hint">{a.email} · {a.type === 'player' ? `${a.ageGroup || '—'} ${a.league || ''} · ${a.club || ''}` : `FAN`} · TRUST {a.trust} · LAST ACTIVE {timeAgo(a.lastActiveAt).toUpperCase()}</div>
      ) : (
        <>
          <div className="field-hint" style={{ marginBottom: 8 }}>Last active: {timeAgo(a.lastActiveAt)}</div>
          <button type="button" className="btn-small" onClick={signInAs} style={{ marginBottom: 10 }}>Sign in as this user</button>
          <div className="row2">
            <div className="field"><label>Display name</label><input value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} /></div>
            <div className="field"><label>Email</label><input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          </div>
          <div className="field">
            <label>Type</label>
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              <option value="player">player</option>
              <option value="fan">fan</option>
            </select>
          </div>
          {f.type === 'player' && (
            <div className="row2">
              <div className="field">
                <label>Age group</label>
                <select value={f.ageGroup} onChange={(e) => setF({ ...f, ageGroup: e.target.value })}>
                  <option value="">—</option>
                  {LEAGUES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Division</label>
                <select value={f.league} onChange={(e) => setF({ ...f, league: e.target.value })}>
                  <option value="">—</option>
                  {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}
          {f.type === 'player' && (
            <div className="field">
              <label>Club</label>
              <select value={f.club} onChange={(e) => setF({ ...f, club: e.target.value })}>
                <option value="">—</option>
                {CLUBS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {f.type === 'fan' && (
            <div className="field">
              <label>Follows</label>
              <div className="tier-row">
                {CLUBS.map((c) => (
                  <button type="button" key={c} className={`tier-btn ${f.fanClubs.includes(c) ? 'active' : ''}`} onClick={() => toggleFanClub(c)}>{c}</button>
                ))}
              </div>
            </div>
          )}
          <div className="row2">
            <div className="field">
              <label>Status</label>
              <select value={f.verificationStatus} onChange={(e) => setF({ ...f, verificationStatus: e.target.value })}>
                <option value="pending_review">pending_review</option>
                <option value="verified">verified</option>
                <option value="suspended">suspended</option>
              </select>
            </div>
            <div className="field"><label>Trust</label><input type="number" value={f.trust} onChange={(e) => setF({ ...f, trust: e.target.value })} /></div>
          </div>
          <div className="field">
            <label><input type="checkbox" checked={f.isAdmin} onChange={(e) => setF({ ...f, isAdmin: e.target.checked })} style={{ width: 'auto', marginRight: 6 }} />Admin access</label>
          </div>
          <div className="field"><label>Reset password (optional)</label><PasswordInput placeholder="Leave blank to keep current password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} /></div>
          {error && <div className="error-text" style={{ marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-small" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button className="btn-small" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={del}>Delete account</button>
          </div>
        </>
      )}
    </div>
  );
}

function NewAccountForm({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ username: '', email: '', password: '', type: 'player', ageGroup: '', league: '', club: '', verificationStatus: 'verified' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true); setError('');
    const res = await fetch('/api/admin/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error); return; }
    setF({ username: '', email: '', password: '', type: 'player', ageGroup: '', league: '', club: '', verificationStatus: 'verified' });
    setOpen(false);
    onCreated();
  }

  if (!open) return <button className="btn-small" onClick={() => setOpen(true)} style={{ marginBottom: 12 }}>+ New account</button>;

  return (
    <div className="card">
      <div className="row2">
        <div className="field"><label>Username</label><input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></div>
        <div className="field"><label>Email</label><input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      </div>
      <div className="field"><label>Password</label><PasswordInput value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
      <div className="field">
        <label>Type</label>
        <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
          <option value="player">player</option>
          <option value="fan">fan</option>
        </select>
      </div>
      {f.type === 'player' && (
        <div className="row2">
          <div className="field">
            <label>Age group</label>
            <select value={f.ageGroup} onChange={(e) => setF({ ...f, ageGroup: e.target.value })}>
              <option value="">—</option>
              {LEAGUES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Division</label>
            <select value={f.league} onChange={(e) => setF({ ...f, league: e.target.value })}>
              <option value="">—</option>
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      )}
      {f.type === 'player' && (
        <div className="field">
          <label>Club</label>
          <select value={f.club} onChange={(e) => setF({ ...f, club: e.target.value })}>
            <option value="">—</option>
            {CLUBS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
      {error && <div className="error-text">{error}</div>}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-small" onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>
        <button className="btn-small" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

function AccountsPanel() {
  const [accounts, setAccounts] = useState(null);

  function load() {
    fetch('/api/admin/accounts').then((r) => r.json()).then(setAccounts);
  }
  useEffect(load, []);
  // Auto-refresh so "online now" stays roughly current without a manual reload.
  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const online = accounts ? accounts.filter(isOnline) : [];

  return (
    <div>
      <div className="section-title">Online Now ({online.length})</div>
      {!accounts ? <div className="empty-state">Loading…</div> : online.length === 0 ? (
        <div className="empty-state">No one active in the last 5 minutes.</div>
      ) : online.map((a) => (
        <div className="card" key={a.id}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>🟢 {a.displayName} <span className="field-hint">({a.username})</span></div>
          <div className="field-hint">{a.type === 'player' ? `${a.ageGroup || '—'} ${a.league || ''} · ${a.club || ''}` : 'FAN'} · active {timeAgo(a.lastActiveAt)}</div>
        </div>
      ))}

      <div className="section-title">All Accounts</div>
      <NewAccountForm onCreated={load} />
      {!accounts ? <div className="empty-state">Loading…</div> : accounts.map((a) => (
        <AccountEditor key={a.id} a={a} onSaved={load} onDeleted={load} />
      ))}
    </div>
  );
}

export default AccountsPanel;
