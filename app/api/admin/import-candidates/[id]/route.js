import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { requireAdmin } from '../../../../../lib/auth';
import { normalize } from '../../../../../lib/players';

export const dynamic = 'force-dynamic';

async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const candidate = await prisma.playerImportCandidate.findUnique({ where: { id: params.id } });
  if (!candidate || candidate.status !== 'pending') {
    return NextResponse.json({ error: 'not-found-or-already-resolved' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action;

  if (action === 'discard') {
    await prisma.playerImportCandidate.update({ where: { id: candidate.id }, data: { status: 'discarded' } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'merge-into') {
    const targetId = String(body.targetId || '');
    const target = await prisma.playerImportCandidate.findUnique({ where: { id: targetId } });
    if (!target || target.status !== 'pending') return NextResponse.json({ error: 'invalid-target' }, { status: 400 });
    await prisma.playerImportCandidate.update({
      where: { id: candidate.id },
      data: { status: 'merged', mergedIntoId: target.id },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'confirm') {
    const ageGroup = body.ageGroup ? String(body.ageGroup) : null;
    const tier = body.tier ? String(body.tier) : null;
    if (!ageGroup || !tier) return NextResponse.json({ error: 'age-group-and-tier-required' }, { status: 400 });

    // An admin reviewing this IS the human verification — no need for
    // the "wait for a second independent reporter" rule that exists to
    // substitute for that when nobody's actually looked at it. Straight
    // to confirmed, but still check for an existing match first so this
    // doesn't create a duplicate the admin just didn't happen to search for.
    const existing = await prisma.player.findMany({ where: { club: candidate.club, ageGroup, tier } });
    const norm = normalize(candidate.name);
    let player = existing.find((p) => normalize(p.name) === norm);

    if (player) {
      if (!player.confirmed) {
        player = await prisma.player.update({ where: { id: player.id }, data: { confirmed: true } });
      }
    } else {
      player = await prisma.player.create({
        data: { name: candidate.name, club: candidate.club, ageGroup, tier, confirmed: true, createdBy: admin.id },
      });
    }

    await prisma.playerImportCandidate.update({
      where: { id: candidate.id },
      data: { status: 'confirmed', resolvedPlayerId: player.id, ageGroup, tier },
    });

    return NextResponse.json({ ok: true, player });
  }

  return NextResponse.json({ error: 'unknown-action' }, { status: 400 });
}

export { PATCH };
