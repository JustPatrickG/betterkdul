'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

function ClubPage({ params }) {
  const club = decodeURIComponent(params.club);
  const [data, setData] = useState(null);
  const [grounds, setGrounds] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    fetch(`/api/clubs/${encodeURIComponent(club)}`).then((r) => r.json()).then((d) => {
      setData(d);
      setGrounds(d.grounds || '');
    });
  }

  useEffect(() => { load(); }, [club]);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/clubs/${encodeURIComponent(club)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grounds }),
    });
    setSaving(false);
    if (res.ok) load();
  }

  if (!data) return <div className="empty-state">Loading…</div>;

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--disp)', fontSize: 22, margin: '4px 0' }}>{club}</h2>
      <div className="field-hint" style={{ marginBottom: 12 }}>CLUB PAGE · {data.teams.length} TEAM{data.teams.length !== 1 ? 'S' : ''} ACROSS THE LEAGUE</div>

      <div className="section-title">Home Ground</div>
      <div className="card">
        {data.grounds ? <div className="field-hint">📍 {data.grounds}</div> : <div className="empty-state" style={{ padding: '8px 0' }}>No ground listed yet.</div>}
      </div>
      <div className="field">
        <label>Add / update home ground</label>
        <input type="text" placeholder="e.g. Naas Sportsground, Craddockstown Rd" value={grounds} onChange={(e) => setGrounds(e.target.value)} />
      </div>
      <button className="btn btn-outline btn-block" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      <div className="field-hint">If you're not signed in, saving will just ask you to sign in first.</div>

      <div className="section-title">Teams</div>
      {data.teams.length === 0 ? (
        <div className="empty-state">No teams found for this club.</div>
      ) : (
        data.teams.map((t) => (
          <Link
            key={`${t.league}-${t.tier}`}
            href={`/team/${encodeURIComponent(`${club}__${t.league}__${t.tier}`)}`}
            className="card clickable"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            {t.league} {t.tier}
          </Link>
        ))
      )}
    </div>
  );
}

export default ClubPage;
