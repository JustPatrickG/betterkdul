'use client';
import { useEffect, useState } from 'react';

function PlayerPage({ params }) {
  const [data, setData] = useState(null);
  const name = decodeURIComponent(params.name);

  useEffect(() => {
    fetch(`/api/players/${encodeURIComponent(name)}`).then((r) => r.json()).then(setData);
  }, [name]);

  if (!data) return <div className="empty-state">Loading…</div>;

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--disp)', fontSize: 22, margin: '4px 0' }}>{data.name}</h2>
      <div className="field-hint" style={{ marginBottom: 12 }}>PLAYER · BUILT FROM COMMUNITY REPORTS</div>
      <div className="stat-grid">
        <div className="stat-box"><div className="v">{data.goals}</div><div className="l">Goals</div></div>
        <div className="stat-box"><div className="v">{data.motm}</div><div className="l">Man of the Match</div></div>
        <div className="stat-box"><div className="v">{data.yellow}</div><div className="l">Yellow cards</div></div>
        <div className="stat-box"><div className="v">{data.red}</div><div className="l">Red cards</div></div>
      </div>
      <div className="section-title">Appearances ({data.appearances.length})</div>
      {data.appearances.length === 0 ? (
        <div className="empty-state">No matches found for this player yet.</div>
      ) : (
        data.appearances.map((a, i) => (
          <div className="card" key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span>{a.home} vs {a.away}</span>
              <span>{a.date ? new Date(a.date).toLocaleDateString('en-IE') : 'TBC'}</span>
            </div>
            <div className="field-hint">{a.league} {a.tier}</div>
            {(a.goals > 0 || a.motm || a.yellow || a.red) && (
              <div className="field-hint">
                {a.goals > 0 && `⚽ ${a.goals} goal${a.goals !== 1 ? 's' : ''} `}
                {a.motm && '🏅 MOTM '}
                {a.yellow && '🟨 Yellow '}
                {a.red && '🟥 Red'}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default PlayerPage;
