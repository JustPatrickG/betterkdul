import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getMatchConsensus } from '../../../../lib/algorithm';
import { computePlayerStats } from '../../../../lib/stats';

export const dynamic = 'force-dynamic';

async function GET(req, { params }) {
  const name = decodeURIComponent(params.name);
  const matches = await prisma.match.findMany({
    include: { reports: { include: { account: { select: { trust: true } }, goals: { include: { player: true } } } } },
  });
  const referees = await prisma.referee.findMany();
  const refTrustByName = Object.fromEntries(referees.map((r) => [r.name, r.trust]));

  const withConsensus = matches.map((m) => ({ ...m, consensus: getMatchConsensus(m, refTrustByName) }));
  const stats = computePlayerStats(name, withConsensus);

  return NextResponse.json({ name, ...stats });
}

export { GET };
