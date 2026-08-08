import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export const dynamic = 'force-dynamic';

async function GET() {
  const referees = await prisma.referee.findMany({ orderBy: { name: 'asc' } });
  const matches = await prisma.match.findMany({ select: { refName: true, settled: true, officialHome: true } });

  const out = referees.map((r) => {
    const assigned = matches.filter((m) => m.refName === r.name);
    const submitted = assigned.filter((m) => m.officialHome !== null).length;
    return {
      id: r.id,
      name: r.name,
      trust: r.trust,
      fixturesAssigned: assigned.length,
      resultsSubmitted: submitted,
    };
  });

  return NextResponse.json(out);
}

export { GET };
