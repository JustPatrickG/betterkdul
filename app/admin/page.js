'use client';
import { useState, useEffect } from 'react';
import AccountsPanel from '../../components/admin/AccountsPanel';
import MatchesPanel from '../../components/admin/MatchesPanel';
import ReportsPanel from '../../components/admin/ReportsPanel';
import RefereesPanel from '../../components/admin/RefereesPanel';
import ArticlesPanel from '../../components/admin/ArticlesPanel';
import ClubTeamPanel from '../../components/admin/ClubTeamPanel';
import PlayerImportPanel from '../../components/admin/PlayerImportPanel';

const TABS = [
  { id: 'accounts', label: 'Accounts' },
  { id: 'matches', label: 'Fixtures' },
  { id: 'reports', label: 'Reports' },
  { id: 'referees', label: 'Referees' },
  { id: 'articles', label: 'Headlines' },
  { id: 'clubs', label: 'Clubs/Teams' },
  { id: 'players', label: 'Player Import' },
];

function AdminPage() {
  const [me, setMe] = useState(undefined);
  const [tab, setTab] = useState('accounts');

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setMe(d.account));
  }, []);

  if (me === undefined) return <div className="empty-state">Loading…</div>;
  if (!me || !me.isAdmin) return <div className="empty-state">Admin sign-in required. Sign in with an admin account from the Account tab.</div>;

  return (
    <div>
      <div className="section-title">Admin Dashboard</div>
      <div className="field-hint" style={{ marginBottom: 12 }}>Every change here is live for everyone, immediately.</div>

      <div className="tab-row">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        {tab === 'accounts' && <AccountsPanel />}
        {tab === 'matches' && <MatchesPanel />}
        {tab === 'reports' && <ReportsPanel />}
        {tab === 'referees' && <RefereesPanel />}
        {tab === 'articles' && <ArticlesPanel />}
        {tab === 'clubs' && <ClubTeamPanel />}
        {tab === 'players' && <PlayerImportPanel />}
      </div>
    </div>
  );
}

export default AdminPage;
