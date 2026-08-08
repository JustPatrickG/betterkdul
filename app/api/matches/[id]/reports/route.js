import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getSessionAccount } from '../../../../../lib/auth';
import { resolvePlayer } from '../../../../../lib/players';

export const dynamic = 'force-dynamic';

const WEEKLY_LIMIT = 2;
const MAX_GOALS_PER_SIDE = 30;
const VALID_HALVES = ['1st', '2nd'];

function isValidScore(n) {
  return Number.isInteger(n) && n >= 0 && n <= 50;
}

function buildSummary(resolvedGoals) {
  const counts = {};
  resolvedGoals.forEach((g) => { counts[g.playerName] = (counts[g.playerName] || 0) + 1; });
  return Object.entries(counts).map(([n, c]) => (c > 1 ? `${n} x${c}` : n)).join(', ') || null;
}

function sanitizeGoalList(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, MAX_GOALS_PER_SIDE).map((g) => ({
    name: g && g.name ? String(g.name).trim().slice(0, 80) : '',
    playerId: g && g.playerId ? String(g.playerId) : null,
    minute: g && Number.isInteger(Number(g.minute)) && Number(g.minute) >= 0 && Number(g.minute) <= 130 ? Number(g.minute) : null,
    half: g && VALID_HALVES.includes(g.half) ? g.half : null,
  })).filter((g) => g.name || g.playerId);
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

  const homeGoalsIn = sanitizeGoalList(body.homeGoals);
  const awayGoalsIn = sanitizeGoalList(body.awayGoals);

  const result = await prisma.$transaction(async (tx) => {
    const report = await tx.report.create({
      data: {
        matchId: match.id,
        accountId: account.id,
        homeScore,
        awayScore,
        motm: body.motm ? String(body.motm).slice(0, 200) : null,
        yellowCards: body.yellowCards ? String(body.yellowCards).slice(0, 500) : null,
        redCards: body.redCards ? String(body.redCards).slice(0, 500) : null,
      },
    });

    async function writeGoals(side, list, club) {
      const resolved = [];
      for (const g of list) {
        let player = null;
        if (g.playerId) {
          player = await tx.player.findUnique({ where: { id: g.playerId } });
          if (!player || player.club !== club || player.ageGroup !== match.league || player.tier !== match.tier) {
            player = null; // stale/mismatched id from the client — fall back to name resolution
          }
        }
        if (!player && g.name) {
          player = await resolvePlayer(tx, club, match.league, match.tier, g.name, account.id);
        }
        if (!player) continue;
        await tx.goal.create({
          data: { reportId: report.id, side, playerId: player.id, playerName: player.name, minute: g.minute, half: g.half },
        });
        resolved.push({ playerName: player.name });
      }
      return resolved;
    }

    const homeResolved = await writeGoals('home', homeGoalsIn, match.home);
    const awayResolved = await writeGoals('away', awayGoalsIn, match.away);

    await tx.report.update({
      where: { id: report.id },
      data: { homeScorers: buildSummary(homeResolved), awayScorers: buildSummary(awayResolved) },
    });

    return report;
  });

  return NextResponse.json({ ok: true, report: result });
}

export { POST };
