import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { requireAdmin } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const key = decodeURIComponent(params.key).split('__').join('|');
  await prisma.teamInfo.delete({ where: { key } }).catch(() => {});
  return NextResponse.json({ ok: true });
}

export { DELETE };
