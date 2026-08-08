import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { requireAdmin, publicAccount, hashPassword } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

const STATUSES = ['pending_review', 'verified', 'suspended'];
const EDITABLE_FIELDS = ['displayName', 'email', 'type', 'ageGroup', 'league', 'club', 'fanClubs', 'verificationStatus', 'trust', 'isAdmin'];

async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const data = {};

  EDITABLE_FIELDS.forEach((f) => {
    if (body[f] === undefined) return;
    if (f === 'verificationStatus' && !STATUSES.includes(body[f])) return;
    if (f === 'trust') { data.trust = Number(body.trust); return; }
    if (f === 'isAdmin') { data.isAdmin = !!body.isAdmin; return; }
    data[f] = body[f];
  });

  // Admin-initiated password reset — separate from the normal signup/login flow.
  if (body.newPassword) {
    if (String(body.newPassword).length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
    }
    data.passwordHash = await hashPassword(body.newPassword);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const account = await prisma.account.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, account: publicAccount(account) });
}

async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  await prisma.account.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export { PATCH, DELETE };
