// Parses "J. Murphy x2, L. Kelly" into { "J. Murphy": 2, "L. Kelly": 1 }
function parseGoalTally(str) {
  const counts = {};
  if (!str) return counts;
  str.split(',').map((s) => s.trim()).filter(Boolean).forEach((entry) => {
    const m = entry.match(/^(.*?)\s*x(\d+)$/i);
    if (m) {
      const name = m[1].trim();
      const n = parseInt(m[2], 10);
      if (name) counts[name] = (counts[name] || 0) + n;
    } else {
      counts[entry] = (counts[entry] || 0) + 1;
    }
  });
  return counts;
}

function parseNameList(str) {
  if (!str) return [];
  return str.split(',').map((s) => s.trim()).filter(Boolean);
}

/* Names mentioned by at least half of the reports that filled in this
   particular field (motm / yellowCards / redCards) for a match — a plain
   per-name majority threshold across whatever reports exist, distinct
   from the trust-weighted "official" consensus value used for settlement. */
function consensusNames(reports, field) {
  const filled = reports.filter((r) => r[field] && r[field].trim());
  if (filled.length === 0) return [];
  const counts = {};
  filled.forEach((r) => { parseNameList(r[field]).forEach((n) => { counts[n] = (counts[n] || 0) + 1; }); });
  return Object.entries(counts).filter(([, c]) => c / filled.length >= 0.5).map(([n]) => n);
}

// Build a standings table from a list of { home, away, consensus:{ homeScore, awayScore } }
function computeStandings(matches) {
  const table = {};
  function ensure(team) {
    if (!table[team]) table[team] = { team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    return table[team];
  }
  matches.forEach((m) => {
    const c = m.consensus;
    if (c.homeScore === null || c.homeScore === undefined) return;
    const home = ensure(m.home);
    const away = ensure(m.away);
    home.p++; away.p++;
    home.gf += c.homeScore; home.ga += c.awayScore;
    away.gf += c.awayScore; away.ga += c.homeScore;
    if (c.homeScore > c.awayScore) { home.w++; away.l++; }
    else if (c.homeScore < c.awayScore) { away.w++; home.l++; }
    else { home.d++; away.d++; }
  });
  const rows = Object.values(table).map((r) => ({ ...r, gd: r.gf - r.ga, pts: r.w * 3 + r.d }));
  rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
  return rows;
}

/* Aggregates one player's goals/MOTM/cards across every match with a
   usable consensus result. Player identity is just a name-string match
   against report/consensus fields — there's no player ID system, so
   this only knows what the community has typed the same way each time.
   matches: [{ league, tier, home, away, date, consensus, reports }] */
function computePlayerStats(name, matches) {
  let goals = 0;
  let motm = 0;
  let yellow = 0;
  let red = 0;
  const appearances = [];
  matches.forEach((m) => {
    const c = m.consensus;
    if (c.homeScore === null || c.homeScore === undefined) return;
    // A player only appears on one side in a given match, so a plain
    // merge is safe — their name key never collides between the two.
    const goalTally = { ...parseGoalTally(c.homeScorers), ...parseGoalTally(c.awayScorers) };
    const motmNames = consensusNames(m.reports, 'motm');
    const yellowNames = consensusNames(m.reports, 'yellowCards');
    const redNames = consensusNames(m.reports, 'redCards');
    const playerGoals = goalTally[name] || 0;
    const isMotm = motmNames.includes(name);
    const isYellow = yellowNames.includes(name);
    const isRed = redNames.includes(name);
    if (playerGoals > 0 || isMotm || isYellow || isRed) {
      goals += playerGoals;
      if (isMotm) motm++;
      if (isYellow) yellow++;
      if (isRed) red++;
      appearances.push({ league: m.league, tier: m.tier, home: m.home, away: m.away, date: m.date, goals: playerGoals, motm: isMotm, yellow: isYellow, red: isRed });
    }
  });
  appearances.sort((a, b) => (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0));
  return { goals, motm, yellow, red, appearances };
}

export { parseGoalTally, parseNameList, consensusNames, computeStandings, computePlayerStats };
