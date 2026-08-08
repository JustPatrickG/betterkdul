import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { getMatchConsensus } from '../../../lib/algorithm';

export const dynamic = 'force-dynamic';

async function GET(req) {
  const { searchParams } = new URL(req.url);
  const league = searchParams.get('league');
  const tier = searchParams.get('tier');

  const where = {};
  if (league) where.league = league;
  if (tier) where.tier = tier;

  const matches = await prisma.match.findMany({
    where,
    include: { reports: { include: { account: { select: { trust: true } }, goals: { include: { affiliation: true } } } } },
    orderBy: { date: 'asc' },
  });
  const referees = await prisma.referee.findMany();
  const refTrustByName = Object.fromEntries(referees.map((r) => [r.name, r.trust]));

  const out = matches.map((m) => ({
    id: m.id,
    league: m.league,
    tier: m.tier,
    home: m.home,
    away: m.away,
    date: m.date,
    refName: m.refName,
    settled: m.settled,
    reportCount: m.reports.length,
    consensus: getMatchConsensus(m, refTrustByName),
  }));

  return NextResponse.json(out);
}

export { GET };
