import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getSessionAccount } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function GET(req, { params }) {
  const club = decodeURIComponent(params.club);
  const info = await prisma.clubInfo.findUnique({ where: { club } });

  const matches = await prisma.match.findMany({
    where: { OR: [{ home: club }, { away: club }] },
    select: { league: true, tier: true },
    distinct: ['league', 'tier'],
  });

  return NextResponse.json({
    club,
    grounds: info?.grounds || null,
    updatedBy: info?.updatedBy || null,
    updatedAt: info?.updatedAt || null,
    teams: matches.map((m) => ({ league: m.league, tier: m.tier })),
  });
}

async function PATCH(req, { params }) {
  const account = await getSessionAccount();
  if (!account) return NextResponse.json({ error: 'signin' }, { status: 401 });

  const club = decodeURIComponent(params.club);
  const body = await req.json().catch(() => ({}));
  const grounds = String(body.grounds || '').slice(0, 300);

  const info = await prisma.clubInfo.upsert({
    where: { club },
    update: { grounds, updatedBy: account.displayName, updatedAt: new Date() },
    create: { club, grounds, updatedBy: account.displayName, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true, info });
}

export { GET, PATCH };
