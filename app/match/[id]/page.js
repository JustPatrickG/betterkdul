'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

function statusLabel(s) {
  return { confirmed: 'Confirmed', pending: 'No score yet', nodata: 'No score yet', settled: 'Final' }[s] || 'No score yet';
}
function statusClass(s) {
  return { confirmed: 'status-confirmed', pending: 'status-nodata', nodata: 'status-nodata', settled: 'status-settled' }[s] || 'status-nodata';
}

const ELIGIBILITY_MESSAGES = {
  signin: 'Sign in from the Account tab to submit a report.',
  'no-account': 'Sign in to submit a report.',
  settled: 'This match is settled — the final result is locked and reporting is closed.',
  suspended: "Your account is suspended pending verification, so you can't submit reports right now. Check the Account tab for details.",
  'not-player': 'Only player accounts can submit match reports — fans can browse and search, but reporting is limited to players from the two clubs playing.',
  'wrong-team': "You can only submit reports for your own team's fixtures.",
  already: "You've already submitted a report for this fixture. One report per account per match — thanks for helping keep the record straight.",
};

const SUBMIT_ERROR_MESSAGES = {
  signin: 'Sign in to submit a report.',
  settled: 'This match is settled — reporting is closed.',
  suspended: 'Your account is suspended pending verification.',
  'not-player': 'Only player accounts can submit match reports.',
  'wrong-team': "You can only submit reports for your own team's fixtures.",
  already: "You've already reported this match.",
  'weekly-limit': "You've reached your limit of 2 reports this week — try again next week.",
  'invalid-score': 'Scores must be whole numbers between 0 and 50.',
};

/* One goal's entry row: a search-as-you-type box against that club's
   roster, falling back to "add a new player" if nothing matches. Picking
   an existing name sets playerId (full trust weight); typing a brand-new
   one leaves playerId null (counts at reduced weight until someone else
   independently uses the same name — see lib/algorithm.js). */
function GoalRow({ index, club, ageGroup, tier, value, onChange }) {
  const [query, setQuery] = useState(value.name || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  function search(q) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/players/search?q=${encodeURIComponent(q)}&club=${encodeURIComponent(club)}&ageGroup=${encodeURIComponent(ageGroup)}&tier=${encodeURIComponent(tier)}`)
        .then((r) => r.json())
        .then(setResults)
        .catch(() => setResults([]));
    }, 200);
  }

  function handleQueryChange(v) {
    setQuery(v);
    onChange({ ...value, name: v, playerId: null }); // typing clears any previous pick
    setOpen(true);
    search(v);
  }

  function pick(p) {
    setQuery(p.name);
    onChange({ ...value, name: p.name, playerId: p.id });
    setOpen(false);
  }

  return (
    <div className="card" style={{ position: 'relative' }}>
      <div className="field-hint" style={{ marginBottom: 4 }}>Goal {index + 1}</div>
      <div className="field">
        <label>Player</label>
        <input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => { setOpen(true); search(query); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Start typing a name…"
          autoComplete="off"
        />
        {open && results.length > 0 && (
          <div style={{ position: 'absolute', zIndex: 5, background: 'var(--paper)', border: '1px solid var(--rule)', width: '100%', maxHeight: 160, overflowY: 'auto' }}>
            {results.map((p) => (
              <div
                key={p.id}
                onMouseDown={() => pick(p)}
                style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--rule)' }}
              >
                {p.name}{!p.confirmed && <span className="field-hint"> · unconfirmed</span>}
              </div>
            ))}
          </div>
        )}
        {query && !value.playerId && (
          <div className="field-hint" style={{ marginTop: 2 }}>No match picked — this will be added as a new player and count at reduced weight until someone else confirms them.</div>
        )}
      </div>
      <div className="row2">
        <div className="field">
          <label>Minute (optional)</label>
          <input type="number" min="0" max="130" value={value.minute ?? ''} onChange={(e) => onChange({ ...value, minute: e.target.value === '' ? '' : Number(e.target.value) })} />
        </div>
        <div className="field">
          <label>Half</label>
          <select value={value.half || ''} onChange={(e) => onChange({ ...value, half: e.target.value })}>
            <option value="">—</option>
            <option value="1st">1st half</option>
            <option value="2nd">2nd half</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function GoalEntryList({ label, count, club, ageGroup, tier, goals, setGoals }) {
  useEffect(() => {
    // Grow or shrink the goal row list to match the score just typed in.
    setGoals((prev) => {
      const n = Number(count) || 0;
      if (n === prev.length) return prev;
      if (n < prev.length) return prev.slice(0, n);
      return [...prev, ...Array.from({ length: n - prev.length }, () => ({ name: '', playerId: null, minute: '', half: '' }))];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  if (!goals.length) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div className="field-hint" style={{ textTransform: 'uppercase', fontWeight: 600, margin: '10px 0 4px' }}>{label} goalscorers (optional)</div>
      {goals.map((g, i) => (
        <GoalRow
          key={i}
          index={i}
          club={club}
          ageGroup={ageGroup}
          tier={tier}
          value={g}
          onChange={(v) => setGoals((prev) => prev.map((x, idx) => (idx === i ? v : x)))}
        />
      ))}
    </div>
  );
}

function MatchPage({ params }) {
  const [match, setMatch] = useState(null);
  const [form, setForm] = useState({ homeScore: '', awayScore: '', motm: '', yellowCards: '', redCards: '' });
  const [homeGoals, setHomeGoals] = useState([]);
  const [awayGoals, setAwayGoals] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function load() {
    fetch(`/api/matches/${params.id}`).then((r) => r.json()).then(setMatch);
  }

  useEffect(() => { load(); }, [params.id]);

  if (!match) return <div className="empty-state">Loading…</div>;
  if (match.error) return <div className="empty-state">Match not found.</div>;

  const c = match.consensus;

  async function submitReport(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    const body = {
      ...form,
      homeGoals: homeGoals.map((g) => ({ name: g.name, playerId: g.playerId, minute: g.minute === '' ? null : g.minute, half: g.half || null })),
      awayGoals: awayGoals.map((g) => ({ name: g.name, playerId: g.playerId, minute: g.minute === '' ? null : g.minute, half: g.half || null })),
    };
    const res = await fetch(`/api/matches/${params.id}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(SUBMIT_ERROR_MESSAGES[data.error] || "Couldn't submit that report.");
      return;
    }
    setSuccess('Report submitted — thanks!');
    setForm({ homeScore: '', awayScore: '', motm: '', yellowCards: '', redCards: '' });
    setHomeGoals([]);
    setAwayGoals([]);
    load();
  }

  return (
    <div>
      <Link href="/" className="field-hint" style={{ display: 'inline-block', marginBottom: 10 }}>← Back to fixtures</Link>
      <h2 style={{ fontFamily: 'var(--disp)', fontSize: 22, margin: '4px 0' }}>{match.home} vs {match.away}</h2>
      <div className="field-hint" style={{ marginBottom: 10 }}>
        {match.league} {match.tier} · {match.date ? new Date(match.date).toLocaleString('en-IE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'TBC'} · REF: {match.refName || 'TBC'}
      </div>

      <span className={`status-pill ${statusClass(c.status)}`}>{statusLabel(c.status)}</span>
      {c.homeScore !== null && (
        <div style={{ margin: '10px 0' }}>
          <div className="scoreboard" style={{ display: 'inline-flex' }}>
            <div className="digit">{c.homeScore}</div>
            <div className="sep">·</div>
            <div className="digit">{c.awayScore}</div>
          </div>
        </div>
      )}
      {c.homeScorers && <div className="field-hint">{match.home} scorers: {c.homeScorers}</div>}
      {c.awayScorers && <div className="field-hint">{match.away} scorers: {c.awayScorers}</div>}
      {c.motm && <div className="field-hint">🏅 Community MOTM pick: {c.motm} ({c.motmVotes} vote{c.motmVotes !== 1 ? 's' : ''} — a fan opinion, not a fact, doesn't affect anyone's trust)</div>}

      <div className="section-title">Official Result</div>
      {match.officialHome !== null ? (
        <div className="card">
          <div className="field-hint">{match.refName} {match.officialSource === 'kdul-scrape' ? '· FROM KDUL.IE' : '· MANUAL'}</div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15 }}>{match.officialHome} – {match.officialAway}</div>
          {match.officialHomeScorers && <div className="field-hint">⚽ {match.home}: {match.officialHomeScorers}</div>}
          {match.officialAwayScorers && <div className="field-hint">⚽ {match.away}: {match.officialAwayScorers}</div>}
        </div>
      ) : (
        <div className="empty-state">No official result yet.</div>
      )}

      <div className="field-hint" style={{ margin: '10px 0' }}>{match.reportCount} report{match.reportCount !== 1 ? 's' : ''} submitted so far — the current score above reflects the weighted result of all of them.</div>

      <div className="section-title">Submit a Report</div>
      {!match.eligibility.ok ? (
        <div className="empty-state">{ELIGIBILITY_MESSAGES[match.eligibility.reason] || "Reporting isn't available for this fixture."}</div>
      ) : (
        <form onSubmit={submitReport}>
          <div className="notice-box">
            One report per account per fixture — you won&apos;t be able to submit another for this match. Score, goalscorers, and cards become part of the permanent public record and count toward your trust score once the match settles 24 hours after kick-off. Your Man of the Match pick is just your opinion — it's shown as a fan vote and never affects anyone's trust either way.
          </div>
          <div className="row2">
            <div className="field">
              <label>{match.home}</label>
              <input type="number" min="0" max="50" required value={form.homeScore} onChange={(e) => setForm({ ...form, homeScore: e.target.value })} />
            </div>
            <div className="field">
              <label>{match.away}</label>
              <input type="number" min="0" max="50" required value={form.awayScore} onChange={(e) => setForm({ ...form, awayScore: e.target.value })} />
            </div>
          </div>

          <GoalEntryList label={match.home} count={form.homeScore} club={match.home} ageGroup={match.league} tier={match.tier} goals={homeGoals} setGoals={setHomeGoals} />
          <GoalEntryList label={match.away} count={form.awayScore} club={match.away} ageGroup={match.league} tier={match.tier} goals={awayGoals} setGoals={setAwayGoals} />

          <div className="field">
            <label>Your man of the match (optional)</label>
            <input type="text" placeholder="Your own pick — this is an opinion, not scored" value={form.motm} onChange={(e) => setForm({ ...form, motm: e.target.value })} />
          </div>
          <div className="field">
            <label>Yellow cards (optional)</label>
            <input type="text" value={form.yellowCards} onChange={(e) => setForm({ ...form, yellowCards: e.target.value })} />
          </div>
          <div className="field">
            <label>Red cards (optional)</label>
            <input type="text" value={form.redCards} onChange={(e) => setForm({ ...form, redCards: e.target.value })} />
          </div>
          {error && <div className="error-text">{error}</div>}
          {success && <div className="field-hint" style={{ color: 'var(--navy)', fontWeight: 600 }}>{success}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>
        </form>
      )}
    </div>
  );
}

export default MatchPage;
