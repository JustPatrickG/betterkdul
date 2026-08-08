import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

function normalize(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

/* Cheap edit-distance so close misspellings ("Jonny" vs "Johnny") still
   surface as suggestions instead of silently inviting a duplicate. Fine
   for short names at roster scale — no need for a real search index. */
function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = normalize(searchParams.get('q') || '');
  const club = searchParams.get('club') || '';
  const ageGroup = searchParams.get('ageGroup') || '';
  const tier = searchParams.get('tier') || '';
  if (!club || !ageGroup || !tier) return NextResponse.json([]);

  const roster = await prisma.player.findMany({ where: { club, ageGroup, tier } });

  if (!q) {
    // No query yet — just show the roster, confirmed players first.
    const sorted = [...roster].sort((a, b) => Number(b.confirmed) - Number(a.confirmed) || a.name.localeCompare(b.name));
    return NextResponse.json(sorted.slice(0, 25).map((p) => ({ id: p.id, name: p.name, confirmed: p.confirmed })));
  }

  const scored = roster
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
    .sort((a, b) => a.score - b.score || Number(b.p.confirmed) - Number(a.p.confirmed))
    .slice(0, 10);

  return NextResponse.json(scored.map(({ p }) => ({ id: p.id, name: p.name, confirmed: p.confirmed })));
}

export { GET };
