'use client';
import { useEffect, useState } from 'react';
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

function MatchPage({ params }) {
  const [match, setMatch] = useState(null);
  const [form, setForm] = useState({ homeScore: '', awayScore: '', homeScorers: '', awayScorers: '', motm: '', yellowCards: '', redCards: '' });
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
    const res = await fetch(`/api/matches/${params.id}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(SUBMIT_ERROR_MESSAGES[data.error] || "Couldn't submit that report.");
      return;
    }
    setSuccess('Report submitted — thanks!');
    setForm({ homeScore: '', awayScore: '', homeScorers: '', awayScorers: '', motm: '', yellowCards: '', redCards: '' });
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

      <div className="section-title">Community Reports ({match.reports.length})</div>
      {match.reports.length === 0 ? (
        <div className="empty-state">No community reports yet — be the first.</div>
      ) : (
        match.reports.map((r) => (
          <div className="card" key={r.id}>
            <div className="field-hint">{r.reporter} · {new Date(r.createdAt).toLocaleString('en-IE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15 }}>{r.homeScore} – {r.awayScore}</div>
            {r.homeScorers && <div className="field-hint">⚽ {match.home}: {r.homeScorers}</div>}
            {r.awayScorers && <div className="field-hint">⚽ {match.away}: {r.awayScorers}</div>}
            {(r.motm || r.yellowCards || r.redCards) && (
              <div className="field-hint">
                {r.motm && `🏅 Their MOTM pick: ${r.motm} `}
                {r.yellowCards && `🟨 ${r.yellowCards} `}
                {r.redCards && `🟥 ${r.redCards}`}
              </div>
            )}
          </div>
        ))
      )}

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
          <div className="field">
            <label>{match.home} goalscorers (optional, comma separated)</label>
            <textarea placeholder="e.g. J. Murphy x2, L. Kelly" value={form.homeScorers} onChange={(e) => setForm({ ...form, homeScorers: e.target.value })} />
          </div>
          <div className="field">
            <label>{match.away} goalscorers (optional, comma separated)</label>
            <textarea placeholder="e.g. D. Fox, S. Ryan x2" value={form.awayScorers} onChange={(e) => setForm({ ...form, awayScorers: e.target.value })} />
          </div>
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
