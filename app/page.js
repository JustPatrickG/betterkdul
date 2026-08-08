'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const LEAGUES = ['U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18'];
const TIERS = ['Premier', 'Major', 'Major 1'];

function statusLabel(s) {
  return { confirmed: 'Confirmed', pending: 'No score yet', nodata: 'No score yet', settled: 'Final' }[s] || 'No score yet';
}
function statusClass(s) {
  return { confirmed: 'status-confirmed', pending: 'status-nodata', nodata: 'status-nodata', settled: 'status-settled' }[s] || 'status-nodata';
}

function Scoreboard({ homeScore, awayScore }) {
  if (homeScore === null || homeScore === undefined) {
    return (
      <div className="scoreboard empty">
        <div className="digit">VS</div>
      </div>
    );
  }
  return (
    <div className="scoreboard">
      <div className="digit">{homeScore}</div>
      <div className="sep">·</div>
      <div className="digit">{awayScore}</div>
    </div>
  );
}

function HomePage() {
  const [league, setLeague] = useState('U12');
  const [tier, setTier] = useState('Premier');
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [headlines, setHeadlines] = useState([]);

  useEffect(() => {
    fetch('/api/headlines').then((r) => r.json()).then(setHeadlines).catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingMatches(true);
    fetch(`/api/matches?league=${league}&tier=${encodeURIComponent(tier)}`)
      .then((r) => r.json())
      .then((data) => { setMatches(data); setLoadingMatches(false); })
      .catch(() => setLoadingMatches(false));
  }, [league, tier]);

  const lead = headlines[0];

  return (
    <div>
      <div className="section-title">
        Headlines
        {headlines.length > 1 && (
          <Link href="/headlines" style={{ marginLeft: 'auto', fontFamily: 'var(--body)', fontWeight: 600, fontSize: '11.5px', color: 'var(--red)', textTransform: 'uppercase' }}>
            Show more
          </Link>
        )}
      </div>
      {lead ? (
        <Link href="/headlines" className="headline-card">
          <div className="h-cat">{lead.pinned ? '📌 PINNED · ' : ''}{lead.category}</div>
          <div className="h-title">{lead.headline}</div>
          <div className="h-teaser">{lead.teaser}</div>
        </Link>
      ) : (
        <div className="empty-state">No headlines yet — the daily sports-desk cron hasn't run.</div>
      )}

      <div className="section-title">{league} Fixtures</div>
      <div className="tab-row">
        {LEAGUES.map((l) => (
          <button key={l} className={`tab ${l === league ? 'active' : ''}`} onClick={() => setLeague(l)}>
            {l}
          </button>
        ))}
      </div>
      <div className="tier-row">
        {TIERS.map((t) => (
          <button key={t} className={`tier-btn ${t === tier ? 'active' : ''}`} onClick={() => setTier(t)}>
            {t}
          </button>
        ))}
      </div>

      {loadingMatches ? (
        <div className="empty-state">Loading fixtures…</div>
      ) : matches.length === 0 ? (
        <div className="empty-state">No fixtures logged for {league} {tier} yet.</div>
      ) : (
        matches.map((m) => (
          <Link key={m.id} href={`/match/${m.id}`} className="card clickable" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
                {m.league} {m.tier} · {m.date ? new Date(m.date).toLocaleDateString('en-IE', { day: '2-digit', month: 'short' }) : 'TBC'}
              </span>
              <span className={`status-pill ${statusClass(m.consensus.status)}`}>{statusLabel(m.consensus.status)}</span>
            </div>
            <div className="teams-row">
              <div className="team-name">{m.home}</div>
              <Scoreboard homeScore={m.consensus.homeScore} awayScore={m.consensus.awayScore} />
              <div className="team-name away">{m.away}</div>
            </div>
            <div className="match-meta">
              <span>REF: {m.refName || 'TBC'}</span>
              <span>{m.reportCount} REPORT{m.reportCount !== 1 ? 'S' : ''}</span>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}

export default HomePage;
