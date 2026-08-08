import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { requireAdmin } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

const DIRECT_FIELDS = ['league', 'tier', 'home', 'away', 'refName'];

async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const data = {};

  DIRECT_FIELDS.forEach((f) => { if (body[f] !== undefined) data[f] = body[f] || null; });
  if (body.date !== undefined) data.date = body.date ? new Date(body.date) : null;

  if (body.officialHome !== undefined) data.officialHome = body.officialHome === '' || body.officialHome === null ? null : Number(body.officialHome);
  if (body.officialAway !== undefined) data.officialAway = body.officialAway === '' || body.officialAway === null ? null : Number(body.officialAway);
  if (body.officialHomeScorers !== undefined) data.officialHomeScorers = body.officialHomeScorers || null;
  if (body.officialAwayScorers !== undefined) data.officialAwayScorers = body.officialAwayScorers || null;
  if (body.officialHome !== undefined || body.officialAway !== undefined) data.officialSource = 'manual';

  // Admin can directly set or clear the locked/settled result — e.g. to
  // correct a bad settlement, or reopen a match for further reports.
  if (body.settled !== undefined) data.settled = !!body.settled;
  if (body.settledHome !== undefined) data.settledHome = body.settledHome === '' || body.settledHome === null ? null : Number(body.settledHome);
  if (body.settledAway !== undefined) data.settledAway = body.settledAway === '' || body.settledAway === null ? null : Number(body.settledAway);
  if (body.settledHomeScorers !== undefined) data.settledHomeScorers = body.settledHomeScorers || null;
  if (body.settledAwayScorers !== undefined) data.settledAwayScorers = body.settledAwayScorers || null;
  if (body.settledMotm !== undefined) data.settledMotm = body.settledMotm || null;
  if (body.settledYellow !== undefined) data.settledYellow = body.settledYellow || null;
  if (body.settledRed !== undefined) data.settledRed = body.settledRed || null;
  if (body.settled === true) data.settledAt = new Date();
  if (body.settled === false) data.settledAt = null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const match = await prisma.match.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, match });
}

async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  await prisma.match.delete({ where: { id: params.id } }); // cascades to its reports
  return NextResponse.json({ ok: true });
}

export { PATCH, DELETE };
