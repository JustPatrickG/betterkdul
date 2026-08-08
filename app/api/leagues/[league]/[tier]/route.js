import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getMatchConsensus } from '../../../../../lib/algorithm';
import { parseGoalTally, consensusNames, computeStandings } from '../../../../../lib/stats';

export const dynamic = 'force-dynamic';

function topN(obj, n = 6) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count }));
}

async function GET(req, { params }) {
  const league = decodeURIComponent(params.league);
  const tier = decodeURIComponent(params.tier);

  const matches = await prisma.match.findMany({
    where: { league, tier },
    include: { reports: { include: { account: { select: { trust: true } }, goals: { include: { player: true } } } } },
  });
  const referees = await prisma.referee.findMany();
  const refTrustByName = Object.fromEntries(referees.map((r) => [r.name, r.trust]));

  const withConsensus = matches.map((m) => ({ ...m, consensus: getMatchConsensus(m, refTrustByName) }));

  const scorers = {};
  const motms = {};
  const yellows = {};
  const reds = {};
  withConsensus.forEach((m) => {
    if (m.consensus.homeScorers) {
      Object.entries(parseGoalTally(m.consensus.homeScorers)).forEach(([n, ct]) => { scorers[n] = (scorers[n] || 0) + ct; });
    }
    if (m.consensus.awayScorers) {
      Object.entries(parseGoalTally(m.consensus.awayScorers)).forEach(([n, ct]) => { scorers[n] = (scorers[n] || 0) + ct; });
    }
    consensusNames(m.reports, 'motm').forEach((n) => { motms[n] = (motms[n] || 0) + 1; });
    consensusNames(m.reports, 'yellowCards').forEach((n) => { yellows[n] = (yellows[n] || 0) + 1; });
    consensusNames(m.reports, 'redCards').forEach((n) => { reds[n] = (reds[n] || 0) + 1; });
  });

  return NextResponse.json({
    league,
    tier,
    standings: computeStandings(withConsensus),
    topScorers: topN(scorers),
    topMotm: topN(motms),
    topYellow: topN(yellows),
    topRed: topN(reds),
  });
}

export { GET };
