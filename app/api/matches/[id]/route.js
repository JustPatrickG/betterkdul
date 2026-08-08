import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getMatchConsensus } from '../../../../lib/algorithm';
import { getSessionAccount } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

/* Who's allowed to submit a report for this fixture, and why not if
   they're blocked. Mirrors the same checks enforced again server-side
   in POST /reports — this copy is just for the UI to know what to show. */
function eligibility(match, account) {
  if (!account) return { ok: false, reason: 'signin' };
  if (match.settled) return { ok: false, reason: 'settled' };
  if (account.verificationStatus === 'suspended') return { ok: false, reason: 'suspended' };
  if (account.type !== 'player') return { ok: false, reason: 'not-player' };
  if (account.ageGroup !== match.league || account.league !== match.tier || (account.club !== match.home && account.club !== match.away)) {
    return { ok: false, reason: 'wrong-team' };
  }
  const already = match.reports.some((r) => r.accountId === account.id);
  if (already) return { ok: false, reason: 'already' };
  return { ok: true };
}

async function GET(req, { params }) {
  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: { reports: { include: { account: { select: { id: true, displayName: true, trust: true } }, goals: { include: { affiliation: true } } }, orderBy: { createdAt: 'desc' } } },
  });
  if (!match) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  const referees = await prisma.referee.findMany();
  const refTrustByName = Object.fromEntries(referees.map((r) => [r.name, r.trust]));
  const consensus = getMatchConsensus(match, refTrustByName);

  const account = await getSessionAccount();
  const elig = eligibility(match, account);

  return NextResponse.json({
    id: match.id,
    league: match.league,
    tier: match.tier,
    home: match.home,
    away: match.away,
    date: match.date,
    refName: match.refName,
    officialHome: match.officialHome,
    officialAway: match.officialAway,
    officialHomeScorers: match.officialHomeScorers,
    officialAwayScorers: match.officialAwayScorers,
    officialSource: match.officialSource,
    settled: match.settled,
    consensus,
    reportCount: match.reports.length,
    eligibility: elig,
  });
}

export { GET };
