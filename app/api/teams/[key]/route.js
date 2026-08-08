import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getMatchConsensus } from '../../../../lib/algorithm';
import { getSessionAccount } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

// key format: "<club>__<league>__<tier>", each component URI-encoded
function parseKey(raw) {
  const parts = decodeURIComponent(raw).split('__');
  if (parts.length !== 3) return null;
  const [club, league, tier] = parts;
  return { club, league, tier };
}

async function GET(req, { params }) {
  const parsed = parseKey(params.key);
  if (!parsed) return NextResponse.json({ error: 'bad-key' }, { status: 400 });
  const { club, league, tier } = parsed;

  const info = await prisma.teamInfo.findUnique({ where: { key: `${club}|${league}|${tier}` } });
  const matches = await prisma.match.findMany({
    where: { league, tier, OR: [{ home: club }, { away: club }] },
    include: { reports: { include: { account: { select: { trust: true } } } } },
    orderBy: { date: 'asc' },
  });
  const referees = await prisma.referee.findMany();
  const refTrustByName = Object.fromEntries(referees.map((r) => [r.name, r.trust]));

  return NextResponse.json({
    club,
    league,
    tier,
    notes: info?.notes || null,
    fixtures: matches.map((m) => ({
      id: m.id,
      opponent: m.home === club ? m.away : m.home,
      venue: m.home === club ? 'Home' : 'Away',
      date: m.date,
      consensus: getMatchConsensus(m, refTrustByName),
    })),
  });
}

async function PATCH(req, { params }) {
  const account = await getSessionAccount();
  if (!account) return NextResponse.json({ error: 'signin' }, { status: 401 });

  const parsed = parseKey(params.key);
  if (!parsed) return NextResponse.json({ error: 'bad-key' }, { status: 400 });
  const { club, league, tier } = parsed;

  const body = await req.json().catch(() => ({}));
  const notes = String(body.notes || '').slice(0, 500);
  const key = `${club}|${league}|${tier}`;

  const info = await prisma.teamInfo.upsert({
    where: { key },
    update: { notes, updatedBy: account.displayName, updatedAt: new Date() },
    create: { key, notes, updatedBy: account.displayName, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true, info });
}

export { GET, PATCH };
