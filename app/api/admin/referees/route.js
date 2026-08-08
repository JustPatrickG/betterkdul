import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';
import { REF_START_TRUST } from '../../../../lib/algorithm';

export const dynamic = 'force-dynamic';

async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const referees = await prisma.referee.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(referees);
}

async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const existing = await prisma.referee.findUnique({ where: { name: body.name } });
  if (existing) return NextResponse.json({ error: 'A referee with that name already exists.' }, { status: 409 });

  const ref = await prisma.referee.create({
    data: { name: body.name, trust: typeof body.trust === 'number' ? body.trust : REF_START_TRUST, sourceUrl: body.sourceUrl || null },
  });
  return NextResponse.json({ ok: true, referee: ref });
}

export { GET, POST };
