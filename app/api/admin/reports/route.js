import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function GET(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get('matchId');
  const where = matchId ? { matchId } : {};

  const reports = await prisma.report.findMany({
    where,
    include: {
      account: { select: { displayName: true, username: true } },
      match: { select: { league: true, tier: true, home: true, away: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  return NextResponse.json(reports.map((r) => ({
    id: r.id,
    matchId: r.matchId,
    match: r.match,
    reporter: r.account.displayName,
    reporterUsername: r.account.username,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    homeScorers: r.homeScorers,
    awayScorers: r.awayScorers,
    motm: r.motm,
    yellowCards: r.yellowCards,
    redCards: r.redCards,
    createdAt: r.createdAt,
  })));
}

export { GET };
