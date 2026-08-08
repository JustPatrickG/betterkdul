'use client';
import { useEffect, useState } from 'react';

function HeadlinesPage() {
  const [articles, setArticles] = useState(null);
  const [openIdx, setOpenIdx] = useState(null);

  useEffect(() => {
    fetch('/api/headlines').then((r) => r.json()).then(setArticles);
  }, []);

  if (!articles) return <div className="empty-state">Loading…</div>;
  if (articles.length === 0) return <div className="empty-state">No headlines yet — the daily sports-desk cron hasn't run.</div>;

  return (
    <div>
      <div className="section-title">All Headlines</div>
      <div className="field-hint" style={{ marginBottom: 12 }}>Written daily by the BetterKdul sports desk, grounded only in reported results.</div>
      {articles.map((a, i) => (
        <div key={a.id} className="card clickable" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--red)' }}>{a.pinned ? '📌 PINNED · ' : ''}{a.category}</div>
          <div style={{ fontFamily: 'var(--disp)', fontSize: 17, margin: '6px 0' }}>{a.headline}</div>
          <div className="field-hint">{a.teaser}</div>
          {openIdx === i && <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 10 }}>{a.body}</p>}
        </div>
      ))}
    </div>
  );
}

export default HeadlinesPage;
