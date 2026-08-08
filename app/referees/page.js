'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

function RefereesPage() {
  const [referees, setReferees] = useState(null);

  useEffect(() => {
    fetch('/api/referees').then((r) => r.json()).then(setReferees);
  }, []);

  return (
    <div>
      <div className="section-title">All Referees</div>
      {!referees ? (
        <div className="empty-state">Loading…</div>
      ) : referees.length === 0 ? (
        <div className="empty-state">No referees yet — they'll appear here once the scraper finds fixtures with a named ref.</div>
      ) : (
        referees.map((r) => (
          <Link key={r.id} href={`/referees/${r.id}`} className="card clickable" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
            <div className="field-hint">{r.fixturesAssigned} FIXTURES · {r.resultsSubmitted} SUBMITTED</div>
          </Link>
        ))
      )}
    </div>
  );
}

export default RefereesPage;
