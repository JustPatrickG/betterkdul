import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getMatchConsensus } from '../../../../lib/algorithm';

export const dynamic = 'force-dynamic';

async function GET(req, { params }) {
  const ref = await prisma.referee.findUnique({ where: { id: params.id } });
  if (!ref) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  const matches = await prisma.match.findMany({
    where: { refName: ref.name },
    include: { reports: { include: { account: { select: { trust: true } }, goals: { include: { player: true } } } } },
    orderBy: { date: 'desc' },
  });
  const referees = await prisma.referee.findMany();
  const refTrustByName = Object.fromEntries(referees.map((r) => [r.name, r.trust]));

  return NextResponse.json({
    id: ref.id,
    name: ref.name,
    sourceUrl: ref.sourceUrl,
    fixtures: matches.map((m) => ({
      id: m.id,
      league: m.league,
      tier: m.tier,
      home: m.home,
      away: m.away,
      date: m.date,
      consensus: getMatchConsensus(m, refTrustByName),
    })),
  });
}

export { GET };
