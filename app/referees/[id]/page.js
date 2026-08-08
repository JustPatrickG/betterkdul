'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

function statusLabel(s) {
  return { confirmed: 'Confirmed', pending: 'No score yet', nodata: 'No score yet', settled: 'Final' }[s] || 'No score yet';
}
function statusClass(s) {
  return { confirmed: 'status-confirmed', pending: 'status-nodata', nodata: 'status-nodata', settled: 'status-settled' }[s] || 'status-nodata';
}

function RefereePage({ params }) {
  const [ref, setRef] = useState(null);

  useEffect(() => {
    fetch(`/api/referees/${params.id}`).then((r) => r.json()).then(setRef);
  }, [params.id]);

  if (!ref) return <div className="empty-state">Loading…</div>;
  if (ref.error) return <div className="empty-state">Referee not found.</div>;

  return (
    <div>
      <Link href="/referees" className="field-hint" style={{ display: 'inline-block', marginBottom: 10 }}>← Back to referees</Link>
      <h2 style={{ fontFamily: 'var(--disp)', fontSize: 22, margin: '4px 0' }}>{ref.name}</h2>
      <div className="stat-grid">
        <div className="stat-box"><div className="v">{ref.fixtures.length}</div><div className="l">Assigned fixtures</div></div>
      </div>
      <div className="section-title">Assigned Fixtures</div>
      {ref.fixtures.map((m) => (
        <Link key={m.id} href={`/match/${m.id}`} className="card clickable" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>{m.home} vs {m.away}</span>
            <span className="field-hint">{m.league} {m.tier}</span>
          </div>
          <span className={`status-pill ${statusClass(m.consensus.status)}`} style={{ marginTop: 6 }}>{statusLabel(m.consensus.status)}</span>
        </Link>
      ))}
    </div>
  );
}

export default RefereePage;
