import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getSessionAccount } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

const WEEKLY_LIMIT = 2;

function isValidScore(n) {
  return Number.isInteger(n) && n >= 0 && n <= 50;
}

async function POST(req, { params }) {
  const account = await getSessionAccount();
  if (!account) return NextResponse.json({ error: 'signin' }, { status: 401 });

  const match = await prisma.match.findUnique({ where: { id: params.id } });
  if (!match) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  // --- Eligibility (defense in depth — the UI already checks this too) ---
  if (match.settled) return NextResponse.json({ error: 'settled' }, { status: 409 });
  if (account.verificationStatus === 'suspended') return NextResponse.json({ error: 'suspended' }, { status: 403 });
  if (account.type !== 'player') return NextResponse.json({ error: 'not-player' }, { status: 403 });
  if (account.ageGroup !== match.league || account.league !== match.tier || (account.club !== match.home && account.club !== match.away)) {
    return NextResponse.json({ error: 'wrong-team' }, { status: 403 });
  }

  const existing = await prisma.report.findUnique({
    where: { matchId_accountId: { matchId: match.id, accountId: account.id } },
  });
  if (existing) return NextResponse.json({ error: 'already' }, { status: 409 });

  // Weekly cap: max 2 reports per account per rolling 7 days. Deliberately
  // not surfaced anywhere in the UI until it's actually hit.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekCount = await prisma.report.count({ where: { accountId: account.id, createdAt: { gte: weekAgo } } });
  if (weekCount >= WEEKLY_LIMIT) {
    return NextResponse.json({ error: 'weekly-limit' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const homeScore = Number(body.homeScore);
  const awayScore = Number(body.awayScore);
  if (!isValidScore(homeScore) || !isValidScore(awayScore)) {
    return NextResponse.json({ error: 'invalid-score' }, { status: 400 });
  }

  const report = await prisma.report.create({
    data: {
      matchId: match.id,
      accountId: account.id,
      homeScore,
      awayScore,
      homeScorers: body.homeScorers ? String(body.homeScorers).slice(0, 500) : null,
      awayScorers: body.awayScorers ? String(body.awayScorers).slice(0, 500) : null,
      motm: body.motm ? String(body.motm).slice(0, 200) : null,
      yellowCards: body.yellowCards ? String(body.yellowCards).slice(0, 500) : null,
      redCards: body.redCards ? String(body.redCards).slice(0, 500) : null,
    },
  });

  return NextResponse.json({ ok: true, report });
}

export { POST };
