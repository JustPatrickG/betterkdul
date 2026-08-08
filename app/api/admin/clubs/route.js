import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const clubs = await prisma.clubInfo.findMany({ orderBy: { club: 'asc' } });
  return NextResponse.json(clubs);
}

export { GET };
