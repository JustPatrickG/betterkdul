import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';
import { getMatchConsensus } from '../../../../lib/algorithm';

export const dynamic = 'force-dynamic';

async function GET(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const league = searchParams.get('league');
  const tier = searchParams.get('tier');
  const where = {};
  if (league) where.league = league;
  if (tier) where.tier = tier;

  const matches = await prisma.match.findMany({
    where,
    include: { reports: { include: { account: { select: { trust: true } }, goals: { include: { player: true } } } } },
    orderBy: { date: 'asc' },
  });
  const referees = await prisma.referee.findMany();
  const refTrustByName = Object.fromEntries(referees.map((r) => [r.name, r.trust]));

  return NextResponse.json(matches.map((m) => ({
    id: m.id, league: m.league, tier: m.tier, home: m.home, away: m.away, date: m.date,
    refName: m.refName, officialHome: m.officialHome, officialAway: m.officialAway,
    officialHomeScorers: m.officialHomeScorers, officialAwayScorers: m.officialAwayScorers, officialSource: m.officialSource,
    settled: m.settled, settledHome: m.settledHome, settledAway: m.settledAway,
    settledHomeScorers: m.settledHomeScorers, settledAwayScorers: m.settledAwayScorers, settledMotm: m.settledMotm, settledYellow: m.settledYellow, settledRed: m.settledRed,
    reportCount: m.reports.length,
    consensus: getMatchConsensus(m, refTrustByName),
  })));
}

async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { league, tier, home, away } = body;
  if (!league || !tier || !home || !away) {
    return NextResponse.json({ error: 'league, tier, home, and away are required' }, { status: 400 });
  }

  const match = await prisma.match.create({
    data: {
      league, tier, home, away,
      date: body.date ? new Date(body.date) : null,
      refName: body.refName || null,
    },
  });
  return NextResponse.json({ ok: true, match });
}

export { GET, POST };
