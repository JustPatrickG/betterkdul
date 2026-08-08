import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { normalize, editDistance } from '../../../../lib/players';

export const dynamic = 'force-dynamic';

async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = normalize(searchParams.get('q') || '');
  if (!q) return NextResponse.json([]);

  // Name match across every player, never scoped to a club — someone
  // who moved clubs or aged up is still the same person and should
  // still turn up. If club/ageGroup/tier were passed, they're used
  // only to sort a matching affiliation to the top of that player's
  // shown history, never to filter who's searchable at all.
  const hintClub = searchParams.get('club') || '';
  const hintAgeGroup = searchParams.get('ageGroup') || '';
  const hintTier = searchParams.get('tier') || '';

  const players = await prisma.player.findMany({
    include: { affiliations: { orderBy: { createdAt: 'desc' } } },
  });

  const scored = players
    .map((p) => {
      const n = normalize(p.name);
      let score;
      if (n === q) score = 0;
      else if (n.startsWith(q)) score = 1;
      else if (n.includes(q)) score = 2;
      else score = 3 + editDistance(n, q);
      return { p, score };
    })
    .filter((x) => x.score <= 5) // cuts off names that aren't remotely close
    .sort((a, b) => a.score - b.score || a.p.name.localeCompare(b.p.name))
    .slice(0, 10);

  return NextResponse.json(scored.map(({ p }) => {
    const matchingAffiliation = p.affiliations.find((a) => a.club === hintClub && a.ageGroup === hintAgeGroup && a.tier === hintTier);
    return {
      id: p.id,
      name: p.name,
      matchesHint: Boolean(matchingAffiliation),
      affiliations: p.affiliations.map((a) => ({ club: a.club, ageGroup: a.ageGroup, tier: a.tier, confirmed: a.confirmed })),
    };
  }));
}

export { GET };
