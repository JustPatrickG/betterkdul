import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import {
  REF_START_TRUST,
  buildEntries,
  scoreConsensus,
  weightedFieldTally,
  scoreReportAgainstTruth,
} from '../../../../lib/algorithm';

export const dynamic = 'force-dynamic';

function isAuthorized(req) {
  if (!process.env.CRON_SECRET) return true; // no secret configured (local dev) — allow
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

/* 24 hours after a fixture's date, whatever the weighted algorithm
   currently favours becomes the permanent, locked truth for that match —
   no >=2-entries threshold here, that gate is for the pre-settlement
   PUBLIC DISPLAY only (see lib/algorithm.js computeConsensus). Every
   report (including the ref's) is then scored against that truth and
   the delta applied to that account's/ref's trust. Matches with zero
   entries at the 24h mark are left open rather than locked with an
   empty result — nothing to settle against yet.

   MOTM is stored as a locked snapshot for display (so a settled match
   still shows a MOTM pick) but is never part of scoreReportAgainstTruth
   — it's an opinion tally, not a fact, so it never moves anyone's trust. */
async function GET(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const candidates = await prisma.match.findMany({
    where: { settled: false, date: { not: null, lte: dayAgo } },
    include: { reports: { include: { account: { select: { id: true, trust: true } } } } },
  });

  const referees = await prisma.referee.findMany();
  const refByName = Object.fromEntries(referees.map((r) => [r.name, r]));

  let settledCount = 0;

  for (const m of candidates) {
    const reports = m.reports.map((r) => ({ ...r, reporterTrust: r.account?.trust ?? 0 }));
    const ref = refByName[m.refName];
    const entries = buildEntries(m, reports, ref?.trust ?? REF_START_TRUST);
    if (entries.length === 0) continue; // nothing to settle yet — stays open

    const scoreTally = scoreConsensus(entries);
    const homeScorersTally = weightedFieldTally(entries.map((e) => ({ value: e.homeScorers, weight: e.weight })));
    const awayScorersTally = weightedFieldTally(entries.map((e) => ({ value: e.awayScorers, weight: e.weight })));
    const yellowTally = weightedFieldTally(entries.map((e) => ({ value: e.yellowCards, weight: e.weight })));
    const redTally = weightedFieldTally(entries.map((e) => ({ value: e.redCards, weight: e.weight })));
    const motmVoteEntries = entries.filter((e) => !e.isOfficial).map((e) => ({ value: e.motm, weight: 1 }));
    const motmTally = weightedFieldTally(motmVoteEntries);

    let truthHome = null;
    let truthAway = null;
    if (scoreTally.value) {
      const [h, a] = scoreTally.value.split('-').map(Number);
      truthHome = h; truthAway = a;
    }
    const truth = {
      homeScore: truthHome,
      awayScore: truthAway,
      homeScorers: homeScorersTally.value,
      awayScorers: awayScorersTally.value,
      yellowCards: yellowTally.value,
      redCards: redTally.value,
    };

    for (const r of m.reports) {
      const delta = scoreReportAgainstTruth(r, truth);
      if (delta !== 0) {
        await prisma.account.update({ where: { id: r.accountId }, data: { trust: { increment: delta } } });
      }
    }

    if (m.officialHome !== null && m.officialAway !== null && ref) {
      const officialAsReport = {
        homeScore: m.officialHome, awayScore: m.officialAway,
        homeScorers: m.officialHomeScorers || '', awayScorers: m.officialAwayScorers || '',
        yellowCards: '', redCards: '',
      };
      const delta = scoreReportAgainstTruth(officialAsReport, truth);
      if (delta !== 0) {
        await prisma.referee.update({ where: { id: ref.id }, data: { trust: { increment: delta } } });
      }
    }

    await prisma.match.update({
      where: { id: m.id },
      data: {
        settled: true,
        settledHome: truthHome,
        settledAway: truthAway,
        settledHomeScorers: truth.homeScorers,
        settledAwayScorers: truth.awayScorers,
        settledMotm: motmTally.value,
        settledYellow: truth.yellowCards,
        settledRed: truth.redCards,
        settledAt: now,
      },
    });
    settledCount++;
  }

  return NextResponse.json({ ok: true, checked: candidates.length, settled: settledCount });
}

export { GET };
