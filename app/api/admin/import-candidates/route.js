import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';
import { normalize, editDistance } from '../../../../lib/players';

export const dynamic = 'force-dynamic';

async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const candidates = await prisma.playerImportCandidate.findMany({
    where: { status: 'pending' },
    orderBy: [{ club: 'asc' }, { name: 'asc' }],
  });
  const existingPlayers = await prisma.player.findMany({
    include: { affiliations: { select: { club: true, ageGroup: true, tier: true } } },
  });

  // Flag likely duplicates by name alone — a name match against an
  // existing player is worth surfacing even if the club looks
  // different, since that's exactly the "moved clubs / aged up" case
  // this whole redesign exists for. Never auto-merges — just a hint.
  const withHints = candidates.map((c) => {
    const cNorm = normalize(c.name);
    const dupCandidates = candidates
      .filter((other) => other.id !== c.id)
      .filter((other) => {
        const n = normalize(other.name);
        return n === cNorm || n.startsWith(cNorm) || cNorm.startsWith(n) || editDistance(n, cNorm) <= 2;
      })
      .map((other) => ({ id: other.id, name: other.name, club: other.club }));

    const dupPlayers = existingPlayers
      .filter((p) => {
        const n = normalize(p.name);
        return n === cNorm || n.startsWith(cNorm) || cNorm.startsWith(n) || editDistance(n, cNorm) <= 2;
      })
      .map((p) => ({ id: p.id, name: p.name, affiliations: p.affiliations }));

    return { ...c, possibleDuplicateCandidates: dupCandidates, possibleDuplicatePlayers: dupPlayers };
  });

  return NextResponse.json(withHints);
}

export { GET };
