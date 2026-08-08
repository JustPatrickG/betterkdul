'use client';
import { useEffect, useState, useRef } from 'react';
import PasswordInput from '../../components/PasswordInput';

const LEAGUES = ['U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18'];
const TIERS = ['Premier', 'Major', 'Major 1'];
const CLUBS = ['Naas Town', 'Sallins Rovers', 'Athy Celtic', 'Newbridge Town', 'Kildare Town AFC',
  'Clane United', 'Monasterevin FC', 'Kilcullen Athletic', 'Leixlip United', 'Celbridge Town',
  'Maynooth Town', 'Confey FC', 'Rathangan Rovers', 'Ballymore Eustace', 'Two Mile House'];

function LoginForm({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error || 'Login failed.'); return; }
    onLoggedIn(data.account);
  }

  return (
    <form onSubmit={submit} className="card">
      <div className="field"><label>Username</label><input value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
      <div className="field"><label>Password</label><PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
      {error && <div className="error-text">{error}</div>}
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

/* Search-as-you-type against the shared player roster (same data, same
   search endpoint as goal-scoring on a match report). Picking an
   existing entry links the new account straight to that Player record;
   typing a name that doesn't match anything just submits as-is, and the
   signup route creates a fresh (unconfirmed) Player for it — same rule
   as an unrecognized goalscorer name. */
function PlayerNameSearch({ club, ageGroup, tier, value, onChange, onPick }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  function search(q) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const hints = club && ageGroup && tier ? `&club=${encodeURIComponent(club)}&ageGroup=${encodeURIComponent(ageGroup)}&tier=${encodeURIComponent(tier)}` : '';
      fetch(`/api/players/search?q=${encodeURIComponent(q)}${hints}`)
        .then((r) => r.json())
        .then(setResults)
        .catch(() => setResults([]));
    }, 200);
  }

  function handleChange(v) {
    onChange(v);
    onPick(null); // typing clears any previous pick
    setOpen(true);
    search(v);
  }

  return (
    <div className="field" style={{ position: 'relative' }}>
      <label>Display name (your real name — this is how teammates and reporters will find you)</label>
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { setOpen(true); search(value); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Start typing your name…"
        autoComplete="off"
        required
      />
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 5, background: 'var(--paper)', border: '1px solid var(--rule)', width: '100%', maxHeight: 220, overflowY: 'auto' }}>
          {results.map((p) => (
            <div
              key={p.id}
              onMouseDown={() => { onChange(p.name); onPick(p.id); setOpen(false); }}
              style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--rule)' }}
            >
              <div>{p.name}{p.matchesHint && <span className="field-hint"> · already known at {club}, {ageGroup} {tier}</span>}</div>
              {p.affiliations.length > 0 && (
                <div className="field-hint">
                  {p.affiliations.map((a, i) => `${a.club} ${a.ageGroup} ${a.tier}${a.confirmed ? '' : ' (unconfirmed)'}`).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {value && (
        <div className="field-hint" style={{ marginTop: 2 }}>
          No match picked yet — submitting will add you as a new player{club && ageGroup && tier ? ` on the ${club} ${ageGroup} ${tier} roster` : ''}.
        </div>
      )}
    </div>
  );
}

function SignupForm({ onLoggedIn }) {
  const [type, setType] = useState('player');
  const [displayName, setDisplayName] = useState('');
  const [playerId, setPlayerId] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [league, setLeague] = useState('');
  const [club, setClub] = useState('');
  const [fanClubs, setFanClubs] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function toggleFanClub(c) {
    setFanClubs((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const body = { type, displayName, email, password };
    if (type === 'player') Object.assign(body, { ageGroup, league, club, playerId });
    else body.fanClubs = fanClubs;

    const res = await fetch('/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error || 'Signup failed.'); return; }
    onLoggedIn(data.account);
  }

  return (
    <form onSubmit={submit} className="card">
      <div className="field">
        <label>I am a…</label>
        <div className="tier-row" style={{ margin: '4px 0 0' }}>
          <button type="button" className={`tier-btn ${type === 'player' ? 'active' : ''}`} onClick={() => setType('player')}>Player</button>
          <button type="button" className={`tier-btn ${type === 'fan' ? 'active' : ''}`} onClick={() => setType('fan')}>Fan</button>
        </div>
      </div>

      {type === 'player' && (
        <>
          <div className="field">
            <label>Age group</label>
            <select value={ageGroup} onChange={(e) => { setAgeGroup(e.target.value); setPlayerId(null); }} required>
              <option value="" disabled>Select…</option>
              {LEAGUES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Division</label>
            <select value={league} onChange={(e) => { setLeague(e.target.value); setPlayerId(null); }} required>
              <option value="" disabled>Select…</option>
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Club</label>
            <select value={club} onChange={(e) => { setClub(e.target.value); setPlayerId(null); }} required>
              <option value="" disabled>Select…</option>
              {CLUBS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field-hint" style={{ marginBottom: 12 }}>
            We'll check this against the roster to verify you — your account works right away either way, this just flags it for review.
          </div>
        </>
      )}

      {type === 'fan' && (
        <div className="field">
          <label>Which club(s) do you follow?</label>
          <div className="tier-row">
            {CLUBS.map((c) => (
              <button type="button" key={c} className={`tier-btn ${fanClubs.includes(c) ? 'active' : ''}`} onClick={() => toggleFanClub(c)}>{c}</button>
            ))}
          </div>
        </div>
      )}

      {type === 'player' ? (
        <PlayerNameSearch club={club} ageGroup={ageGroup} tier={league} value={displayName} onChange={setDisplayName} onPick={setPlayerId} />
      ) : (
        <div className="field"><label>Display name</label><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required /></div>
      )}
      <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <div className="field"><label>Password (min 8 characters)</label><PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
      {error && <div className="error-text">{error}</div>}
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
    </form>
  );
}

function Profile({ account, onSignedOut }) {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    setBusy(false);
    onSignedOut();
  }

  return (
    <div>
      {account.type === 'player' && account.verificationStatus === 'suspended' && (
        <div className="notice-box" style={{ background: 'var(--red-dim)', borderColor: 'var(--red)', color: 'var(--red)' }}>
          Account suspended pending verification. You can still browse, but can&apos;t submit reports until this is resolved.
        </div>
      )}
      {account.type === 'player' && account.verificationStatus === 'pending_review' && (
        <div className="notice-box">Player account — pending verification against the club roster. You can use the app normally in the meantime.</div>
      )}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 16 }}>Signed in as {account.displayName}</div>
        <div className="field-hint">
          {account.type === 'player'
            ? `${account.ageGroup || '—'} ${account.league || ''} · ${account.club || ''} · TRUST ${account.trust}`
            : `FAN · ${(account.fanClubs || []).join(', ') || '—'}`}
        </div>
        <button className="btn btn-outline btn-block" style={{ marginTop: 12 }} onClick={signOut} disabled={busy}>
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
      {account.isAdmin && (
        <a href="/admin" className="btn btn-outline btn-block" style={{ marginTop: 4 }}>Admin dashboard</a>
      )}
    </div>
  );
}

function AccountPage() {
  const [account, setAccount] = useState(undefined); // undefined = loading, null = signed out
  const [mode, setMode] = useState('login');

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setAccount(d.account));
  }, []);

  if (account === undefined) return <div className="empty-state">Loading…</div>;
  if (account) return <Profile account={account} onSignedOut={() => setAccount(null)} />;

  return (
    <div>
      <div className="tier-row" style={{ marginBottom: 4 }}>
        <button className={`tier-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Sign in</button>
        <button className={`tier-btn ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')}>Create account</button>
      </div>
      {mode === 'login' ? <LoginForm onLoggedIn={setAccount} /> : <SignupForm onLoggedIn={setAccount} />}
    </div>
  );
}

export default AccountPage;
