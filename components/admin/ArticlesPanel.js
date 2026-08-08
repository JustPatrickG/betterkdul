'use client';
import { useState, useEffect } from 'react';

const CATEGORIES = ['MATCH REPORT', 'DISPUTED RESULT', 'ROUND-UP', 'REFEREE WATCH', 'SEASON WATCH', 'TITLE RACE', 'TOP SCORER WATCH'];

function ArticleEditor({ a, onChanged }) {
  const [f, setF] = useState({ category: a.category, headline: a.headline, teaser: a.teaser, articleBody: a.body });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch(`/api/admin/articles/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    setBusy(false);
    onChanged();
  }
  async function togglePin() {
    setBusy(true);
    await fetch(`/api/admin/articles/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pinned: !a.pinned }) });
    setBusy(false);
    onChanged();
  }
  async function del() {
    if (!confirm(`Delete headline "${a.headline}"?`)) return;
    await fetch(`/api/admin/articles/${a.id}`, { method: 'DELETE' });
    onChanged();
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{a.pinned ? '📌 ' : ''}{a.headline}</span>
      </div>
      <div className="field-hint">{a.category} · {new Date(a.createdAt).toLocaleString('en-IE')}</div>
      {open && (
        <>
          <div className="field">
            <label>Category</label>
            <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field"><label>Headline</label><input value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} /></div>
          <div className="field"><label>Teaser</label><input value={f.teaser} onChange={(e) => setF({ ...f, teaser: e.target.value })} /></div>
          <div className="field"><label>Body</label><textarea rows={4} value={f.articleBody} onChange={(e) => setF({ ...f, articleBody: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn-small" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button className="btn-small" onClick={togglePin} disabled={busy}>{a.pinned ? 'Unpin' : 'Pin to top'}</button>
            <button className="btn-small" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={del}>Delete</button>
          </div>
        </>
      )}
    </div>
  );
}

function NewArticleForm({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ category: 'ROUND-UP', headline: '', teaser: '', articleBody: '', pinned: false });
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    await fetch('/api/admin/articles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    setBusy(false);
    setOpen(false);
    setF({ category: 'ROUND-UP', headline: '', teaser: '', articleBody: '', pinned: false });
    onCreated();
  }

  if (!open) return <button className="btn-small" onClick={() => setOpen(true)} style={{ marginBottom: 12 }}>+ New headline</button>;

  return (
    <div className="card">
      <div className="field">
        <label>Category</label>
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="field"><label>Headline</label><input value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} /></div>
      <div className="field"><label>Teaser</label><input value={f.teaser} onChange={(e) => setF({ ...f, teaser: e.target.value })} /></div>
      <div className="field"><label>Body</label><textarea rows={4} value={f.articleBody} onChange={(e) => setF({ ...f, articleBody: e.target.value })} /></div>
      <div className="field">
        <label><input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} style={{ width: 'auto', marginRight: 6 }} />Pin to top immediately</label>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-small" onClick={create} disabled={busy || !f.headline}>{busy ? 'Creating…' : 'Create'}</button>
        <button className="btn-small" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

function ArticlesPanel() {
  const [articles, setArticles] = useState(null);

  function load() {
    fetch('/api/admin/articles').then((r) => r.json()).then(setArticles);
  }
  useEffect(load, []);

  return (
    <div>
      <div className="section-title">Headlines</div>
      <div className="field-hint" style={{ marginBottom: 10 }}>Pinning one unpins any other — only one article can lead at a time.</div>
      <NewArticleForm onCreated={load} />
      {!articles ? <div className="empty-state">Loading…</div> : articles.length === 0 ? (
        <div className="empty-state">No headlines yet.</div>
      ) : articles.map((a) => <ArticleEditor key={a.id} a={a} onChanged={load} />)}
    </div>
  );
}

export default ArticlesPanel;
