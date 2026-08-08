import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { requireAdmin } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

const FIELDS = ['homeScore', 'awayScore', 'homeScorers', 'awayScorers', 'motm', 'yellowCards', 'redCards'];

async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const data = {};
  FIELDS.forEach((f) => {
    if (body[f] === undefined) return;
    if (f === 'homeScore' || f === 'awayScore') {
      data[f] = body[f] === '' || body[f] === null ? null : Number(body[f]);
    } else {
      data[f] = body[f] || null;
    }
  });
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const report = await prisma.report.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, report });
}

async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  await prisma.report.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export { PATCH, DELETE };
