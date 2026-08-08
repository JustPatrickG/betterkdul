function normalize(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

/* Resolves a typed/searched name to a Player row, creating a new
   unconfirmed one if nothing matches. If it matches an existing
   unconfirmed player that some OTHER account already referenced, this
   is a second independent confirmation — confirm it now. Runs inside
   the caller's transaction so nothing half-completes.

   Used both when someone signs up (matching/creating their own Player
   record) and when a goal is attributed to a player in a match report —
   same identity, same confirmation rules, one shared source of truth. */
async function resolvePlayer(tx, club, ageGroup, tier, name, actingAccountId) {
  const clean = String(name).trim().slice(0, 80);
  if (!clean) return null;
  const norm = normalize(clean);

  const candidates = await tx.player.findMany({ where: { club, ageGroup, tier } });
  const exact = candidates.find((p) => normalize(p.name) === norm);

  if (exact) {
    if (!exact.confirmed) {
      const otherAccountUsedThem = await tx.goal.findFirst({
        where: { playerId: exact.id, report: { accountId: { not: actingAccountId } } },
      });
      if (otherAccountUsedThem) {
        await tx.player.update({ where: { id: exact.id }, data: { confirmed: true } });
      }
    }
    return exact;
  }

  return tx.player.create({
    data: { name: clean, club, ageGroup, tier, confirmed: false, createdBy: actingAccountId },
  });
}

export { normalize, resolvePlayer };
