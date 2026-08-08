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
  const existingPlayers = await prisma.player.findMany({ select: { id: true, name: true, club: true, ageGroup: true, tier: true } });

  // Flag likely duplicates — same club, close-enough name — against both
  // other pending candidates and already-confirmed players. This is a
  // hint for the admin to look at, never an automatic merge.
  const withHints = candidates.map((c) => {
    const cNorm = normalize(c.name);
    const dupCandidates = candidates
      .filter((other) => other.id !== c.id && normalize(other.club) === normalize(c.club))
      .filter((other) => {
        const n = normalize(other.name);
        return n === cNorm || n.startsWith(cNorm) || cNorm.startsWith(n) || editDistance(n, cNorm) <= 2;
      })
      .map((other) => ({ id: other.id, name: other.name }));

    const dupPlayers = existingPlayers
      .filter((p) => normalize(p.club) === normalize(c.club))
      .filter((p) => {
        const n = normalize(p.name);
        return n === cNorm || n.startsWith(cNorm) || cNorm.startsWith(n) || editDistance(n, cNorm) <= 2;
      })
      .map((p) => ({ id: p.id, name: p.name, ageGroup: p.ageGroup, tier: p.tier }));

    return { ...c, possibleDuplicateCandidates: dupCandidates, possibleDuplicatePlayers: dupPlayers };
  });

  return NextResponse.json(withHints);
}

export { GET };
