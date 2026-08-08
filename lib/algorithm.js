/* ---------------------------------------------------------------
   Trust economy / weighted consensus / settlement scoring.

   This is a straight port of the logic that ran client-side in the
   original single-file prototype, adapted to work against plain JS
   objects pulled from Postgres via Prisma rather than window.storage.
   Nothing here talks to a database directly — callers (API routes,
   cron jobs) fetch rows and pass plain objects in.
--------------------------------------------------------------- */

const REF_START_TRUST = 10;

function trustWeight(trust) {
  return Math.max(0.2, Math.min(5, 1 + trust * 0.1));
}

// entries: [{ value, weight }] — value already a plain comparable string key
function weightedTallyGeneric(entries) {
  const tally = {};
  entries.forEach((e) => { tally[e.value] = (tally[e.value] || 0) + e.weight; });
  let best = null;
  let bw = -1;
  Object.entries(tally).forEach(([k, w]) => { if (w > bw) { bw = w; best = k; } });
  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  return { value: best, confidence: total > 0 ? bw / total : 0, count: entries.length };
}

// entries: [{ value, weight }] — value is free text, blanks ignored entirely
function weightedFieldTally(entries) {
  const tally = {};
  entries.forEach((e) => {
    if (!e.value) return;
    const norm = e.value.trim().toLowerCase();
    if (!norm) return;
    if (!tally[norm]) tally[norm] = { weight: 0, original: e.value.trim() };
    tally[norm].weight += e.weight;
  });
  let bestKey = null;
  let bestW = -1;
  Object.entries(tally).forEach(([k, v]) => { if (v.weight > bestW) { bestW = v.weight; bestKey = k; } });
  const count = entries.filter((e) => e.value && e.value.trim()).length;
  return { value: bestKey ? tally[bestKey].original : '', count };
}

function scoreConsensus(entries) {
  const scoreEntries = entries
    .filter((e) => e.homeScore !== null && e.homeScore !== undefined && e.awayScore !== null && e.awayScore !== undefined)
    .map((e) => ({ value: `${e.homeScore}-${e.awayScore}`, weight: e.weight }));
  if (scoreEntries.length === 0) return { value: null, confidence: 0, count: 0 };
  return weightedTallyGeneric(scoreEntries);
}

/* Builds one weighted entry per community report plus one for the ref's
   official result (if present) — the ref carries no hardcoded multiplier,
   just their own current trust converted to weight, same formula as
   everyone else.
   reports: [{ accountId, reporterTrust, homeScore, awayScore, homeScorers, awayScorers, motm, yellowCards, redCards, hasUnconfirmedPlayer }]
   match:   { officialHome, officialAway, officialHomeScorers, officialAwayScorers }
   refTrust: number

   A report where at least one goal is credited to a brand-new,
   not-yet-confirmed player (someone typed a name that didn't match the
   roster, and nobody independent has corroborated them yet) counts at
   half its normal weight — for the WHOLE report, not just the scorers
   field. One person inventing a name shouldn't get full-strength say
   over the community's truth; once a second, unrelated reporter also
   picks that same player, the discount disappears automatically. */
function buildEntries(match, reports, refTrust) {
  const entries = reports.map((r) => ({
    reporter: r.accountId,
    weight: trustWeight(r.reporterTrust ?? 0) * (r.hasUnconfirmedPlayer ? 0.5 : 1),
    isOfficial: false,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    homeScorers: r.homeScorers,
    awayScorers: r.awayScorers,
    motm: r.motm,
    yellowCards: r.yellowCards,
    redCards: r.redCards,
  }));
  if (match.officialHome !== null && match.officialHome !== undefined && match.officialAway !== null && match.officialAway !== undefined) {
    entries.push({
      reporter: 'referee',
      weight: trustWeight(refTrust ?? REF_START_TRUST),
      isOfficial: true,
      homeScore: match.officialHome,
      awayScore: match.officialAway,
      homeScorers: match.officialHomeScorers || '',
      awayScorers: match.officialAwayScorers || '',
      motm: '',
      yellowCards: '',
      redCards: '',
    });
  }
  return entries;
}

/* Public-display consensus for a not-yet-settled match. A scoreline only
   counts as "confirmed" once it has >=65% weighted support AND at least
   2 separate entries behind it — a single entry, ref or community, can
   never confirm a result alone.

   MOTM is deliberately NOT a "fact" here: it's a plain, unweighted show
   of hands (every reporter's opinion counts equally regardless of trust),
   and — critically — it plays no part in settlement scoring (see
   scoreReportAgainstTruth below). A side with more reporters can still
   outvote the other on who gets the MOTM display, same as any real fan
   poll would skew toward whichever team's supporters showed up — but
   nobody's trust moves because of it either way. */
function computeConsensus(entries) {
  if (entries.length === 0) {
    return { status: 'nodata', homeScore: null, awayScore: null, homeScorers: '', awayScorers: '', motm: '', motmVotes: 0, yellowCards: '', redCards: '', total: 0 };
  }
  const scoreTally = scoreConsensus(entries);
  const homeScorersTally = weightedFieldTally(entries.map((e) => ({ value: e.homeScorers, weight: e.weight })));
  const awayScorersTally = weightedFieldTally(entries.map((e) => ({ value: e.awayScorers, weight: e.weight })));
  const yellowTally = weightedFieldTally(entries.map((e) => ({ value: e.yellowCards, weight: e.weight })));
  const redTally = weightedFieldTally(entries.map((e) => ({ value: e.redCards, weight: e.weight })));
  // MOTM: unweighted 1-report-1-vote tally, community entries only (a ref
  // doesn't officially declare MOTM, so the official entry is excluded).
  const motmVoteEntries = entries.filter((e) => !e.isOfficial).map((e) => ({ value: e.motm, weight: 1 }));
  const motmTally = weightedFieldTally(motmVoteEntries);

  let status;
  let homeScore = null;
  let awayScore = null;
  if (scoreTally.value && scoreTally.confidence >= 0.65 && scoreTally.count >= 2) {
    status = 'confirmed';
    const [h, a] = scoreTally.value.split('-').map(Number);
    homeScore = h;
    awayScore = a;
  } else {
    status = 'pending'; // shown publicly as "No score yet"
  }

  return {
    status,
    homeScore,
    awayScore,
    homeScorers: homeScorersTally.value,
    awayScorers: awayScorersTally.value,
    motm: motmTally.value,
    motmVotes: motmTally.count,
    yellowCards: yellowTally.value,
    redCards: redTally.value,
    total: entries.length,
  };
}

/* Convenience wrapper: given a Match row (with its .reports included, each
   report carrying .account.trust) plus a { refName: trust } lookup, return
   either the locked settled result or the live weighted consensus. */
function getMatchConsensus(match, refTrustByName) {
  if (match.settled) {
    return {
      status: 'settled',
      homeScore: match.settledHome,
      awayScore: match.settledAway,
      homeScorers: match.settledHomeScorers || '',
      awayScorers: match.settledAwayScorers || '',
      motm: match.settledMotm || '',
      yellowCards: match.settledYellow || '',
      redCards: match.settledRed || '',
      total: (match.reports?.length || 0) + (match.officialHome != null ? 1 : 0),
    };
  }
  const reports = (match.reports || []).map((r) => ({
    ...r,
    reporterTrust: r.account?.trust ?? 0,
    hasUnconfirmedPlayer: (r.goals || []).some((g) => g.affiliation && !g.affiliation.confirmed),
  }));
  const refTrust = refTrustByName?.[match.refName] ?? REF_START_TRUST;
  const entries = buildEntries(match, reports, refTrust);
  return computeConsensus(entries);
}

/* Settlement scoring: how much trust delta a single report earns against
   the locked truth, field by field (score / home scorers / away scorers /
   yellow / red), blank fields ignored entirely.
     0 fields correct  -> -5
     >=1 field correct -> 5 - (number of wrong fields)

   MOTM is intentionally excluded from this list. It's an opinion, not a
   fact — there's no "correct" answer to be scored against, so agreeing
   or disagreeing with the crowd's pick never affects anyone's trust. */
function scoreReportAgainstTruth(report, truth) {
  let filled = 0;
  let correct = 0;
  if (report.homeScore !== null && report.homeScore !== undefined && report.awayScore !== null && report.awayScore !== undefined) {
    filled++;
    if (truth.homeScore !== null && report.homeScore === truth.homeScore && report.awayScore === truth.awayScore) correct++;
  }
  ['homeScorers', 'awayScorers', 'yellowCards', 'redCards'].forEach((f) => {
    const val = report[f];
    if (val && val.trim()) {
      filled++;
      if (truth[f] && val.trim().toLowerCase() === truth[f].trim().toLowerCase()) correct++;
    }
  });
  if (filled === 0) return 0;
  if (correct === 0) return -5;
  return 5 - (filled - correct);
}

export {
  REF_START_TRUST,
  trustWeight,
  weightedTallyGeneric,
  weightedFieldTally,
  scoreConsensus,
  buildEntries,
  computeConsensus,
  getMatchConsensus,
  scoreReportAgainstTruth,
};
