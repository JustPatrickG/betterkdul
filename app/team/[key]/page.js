'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

function statusLabel(s) {
  return { confirmed: 'Confirmed', pending: 'No score yet', nodata: 'No score yet', settled: 'Final' }[s] || 'No score yet';
}
function statusClass(s) {
  return { confirmed: 'status-confirmed', pending: 'status-nodata', nodata: 'status-nodata', settled: 'status-settled' }[s] || 'status-nodata';
}

function TeamPage({ params }) {
  const [data, setData] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    fetch(`/api/teams/${params.key}`).then((r) => r.json()).then((d) => {
      setData(d);
      setNotes(d.notes || '');
    });
  }

  useEffect(() => { load(); }, [params.key]);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/teams/${params.key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
    if (res.ok) load();
  }

  if (!data) return <div className="empty-state">Loading…</div>;
  if (data.error) return <div className="empty-state">Team not found.</div>;

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--disp)', fontSize: 22, margin: '4px 0' }}>{data.club} {data.tier}</h2>
      <div className="field-hint" style={{ marginBottom: 12 }}>
        {data.league} · <Link href={`/club/${encodeURIComponent(data.club)}`} className="team-name link" style={{ fontSize: 11 }}>View full club page</Link>
      </div>

      <div className="section-title">Team Notes</div>
      <div className="card">
        {data.notes ? <div className="field-hint">{data.notes}</div> : <div className="empty-state" style={{ padding: '8px 0' }}>No notes yet — coach, home venue, kit colours, anything the community wants to add.</div>}
      </div>
      <div className="field">
        <label>Add / update team notes</label>
        <textarea placeholder="e.g. Coach: S. Ryan. Home ground: Naas Sportsground, Pitch 2." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <button className="btn btn-outline btn-block" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save notes'}</button>

      <div className="section-title">Fixtures</div>
      {data.fixtures.length === 0 ? (
        <div className="empty-state">No fixtures logged for this team yet.</div>
      ) : (
        data.fixtures.map((f) => (
          <Link key={f.id} href={`/match/${f.id}`} className="card clickable" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>vs {f.opponent} · {f.venue}</span>
              <span className="field-hint">{f.date ? new Date(f.date).toLocaleDateString('en-IE') : 'TBC'}</span>
            </div>
            <span className={`status-pill ${statusClass(f.consensus.status)}`} style={{ marginTop: 6 }}>
              {statusLabel(f.consensus.status)}{f.consensus.homeScore !== null ? ` · ${f.consensus.homeScore}-${f.consensus.awayScore}` : ''}
            </span>
          </Link>
        ))
      )}
    </div>
  );
}

export default TeamPage;
