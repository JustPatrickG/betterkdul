import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { requireAdmin } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const data = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.trust !== undefined) data.trust = Number(body.trust);
  if (body.sourceUrl !== undefined) data.sourceUrl = body.sourceUrl || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const ref = await prisma.referee.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, referee: ref });
}

async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  await prisma.referee.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export { PATCH, DELETE };
