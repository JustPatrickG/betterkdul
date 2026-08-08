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

    // An admin reviewing this IS the human verification — no need for
    // the "wait for a second independent reporter" rule that exists to
    // substitute for that when nobody's actually looked at it. The
    // person's name is confirmed by name alone; age group and division
    // are optional — if given, they attach as a confirmed affiliation
    // (the club came with the import), otherwise the name goes in with
    // no club/age attached yet, exactly as asked for.
    const allPlayers = await prisma.player.findMany();
    const norm = normalize(candidate.name);
    let player = allPlayers.find((p) => normalize(p.name) === norm);

    if (!player) {
      player = await prisma.player.create({ data: { name: candidate.name, createdBy: admin.id } });
    }

    if (ageGroup && tier && candidate.club) {
      const existingAff = await prisma.playerAffiliation.findFirst({
        where: { playerId: player.id, club: candidate.club, ageGroup, tier },
      });
      if (existingAff) {
        if (!existingAff.confirmed) {
          await prisma.playerAffiliation.update({ where: { id: existingAff.id }, data: { confirmed: true } });
        }
      } else {
        await prisma.playerAffiliation.create({
          data: { playerId: player.id, club: candidate.club, ageGroup, tier, confirmed: true, source: candidate.sourceLabel, createdBy: admin.id },
        });
      }
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
