'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const LEAGUES = ['U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18'];
const TIERS = ['Premier', 'Major', 'Major 1'];

function Leaderboard({ title, icon, rows, emptyLabel }) {
  return (
    <>
      <div className="section-title">{title}</div>
      {(!rows || rows.length === 0) ? (
        <div className="empty-state">No {emptyLabel} yet.</div>
      ) : (
        rows.map((row, i) => (
          <Link key={row.name} href={`/player/${encodeURIComponent(row.name)}`} className="card clickable" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span>{i + 1}. {row.name}</span>
              <span>{icon} {row.count}</span>
            </div>
          </Link>
        ))
      )}
    </>
  );
}

function LeaguePage() {
  const [league, setLeague] = useState('U12');
  const [tier, setTier] = useState('Premier');
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    fetch(`/api/leagues/${league}/${encodeURIComponent(tier)}`).then((r) => r.json()).then(setData);
  }, [league, tier]);

  return (
    <div>
      <div className="section-title">{league} League</div>
      <div className="tab-row">
        {LEAGUES.map((l) => (
          <button key={l} className={`tab ${l === league ? 'active' : ''}`} onClick={() => setLeague(l)}>{l}</button>
        ))}
      </div>
      <div className="tier-row">
        {TIERS.map((t) => (
          <button key={t} className={`tier-btn ${t === tier ? 'active' : ''}`} onClick={() => setTier(t)}>{t}</button>
        ))}
      </div>

      {!data ? (
        <div className="empty-state">Loading…</div>
      ) : (
        <>
          <div className="section-title">Table</div>
          {data.standings.length === 0 ? (
            <div className="empty-state">No results with a confirmed-enough consensus yet for this league.</div>
          ) : (
            <div className="standings-table">
              <div className="table-row table-head">
                <span className="col-pos">#</span>
                <span className="col-team">Team</span>
                <span className="col-num">P</span>
                <span className="col-num">W</span>
                <span className="col-num">D</span>
                <span className="col-num">L</span>
                <span className="col-num">GD</span>
                <span className="col-num pts">Pts</span>
              </div>
              {data.standings.map((r, i) => (
                <div className="table-row" key={r.team}>
                  <span className="col-pos">{i + 1}</span>
                  <span className="col-team">{r.team}</span>
                  <span className="col-num">{r.p}</span>
                  <span className="col-num">{r.w}</span>
                  <span className="col-num">{r.d}</span>
                  <span className="col-num">{r.l}</span>
                  <span className="col-num">{r.gd > 0 ? '+' : ''}{r.gd}</span>
                  <span className="col-num pts">{r.pts}</span>
                </div>
              ))}
            </div>
          )}

          <Leaderboard title="Top Scorers" icon="⚽" rows={data.topScorers} emptyLabel="scorer data" />
          <Leaderboard title="Man of the Match" icon="🏅" rows={data.topMotm} emptyLabel="MOTM data" />
          <Leaderboard title="Most Yellow Cards" icon="🟨" rows={data.topYellow} emptyLabel="yellow card data" />
          <Leaderboard title="Most Red Cards" icon="🟥" rows={data.topRed} emptyLabel="red card data" />
        </>
      )}
    </div>
  );
}

export default LeaguePage;
