function normalize(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

/* Cheap edit-distance so close misspellings ("Jonny" vs "Johnny") still
   surface as suggestions instead of silently inviting a duplicate. Fine
   for short names at roster scale — no need for a real search index.
   Shared between the live search box and the bulk-import review queue's
   possible-duplicate hints — one matching rule everywhere it matters. */
function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/* Resolves a typed/searched name to a Player — matched by name ALONE,
   across the whole database, never scoped to a club/age/tier. A name
   is a name regardless of who someone plays for this season.

   If club/ageGroup/tier are supplied (a goal report or a signup, where
   that context is genuinely known), this also finds-or-creates a
   PlayerAffiliation linking the player to that specific club/age/tier.
   A brand new affiliation starts unconfirmed; if an unconfirmed one
   already exists and a DIFFERENT account is now independently using
   the same player+club+age combo, that's a second confirmation —
   flip it to confirmed now. The player's NAME needs no such
   confirmation — only the specific "plays for X" claim does.

   Runs inside the caller's transaction so nothing half-completes.
   Returns { player, affiliation } — affiliation is null if no
   club/ageGroup/tier context was given. */
async function resolvePlayer(tx, name, club, ageGroup, tier, actingAccountId) {
  const clean = String(name).trim().slice(0, 80);
  if (!clean) return { player: null, affiliation: null };
  const norm = normalize(clean);

  const allPlayers = await tx.player.findMany();
  let player = allPlayers.find((p) => normalize(p.name) === norm);

  if (!player) {
    player = await tx.player.create({ data: { name: clean, createdBy: actingAccountId } });
  }

  let affiliation = null;
  if (club && ageGroup && tier) {
    const existingAffiliations = await tx.playerAffiliation.findMany({ where: { playerId: player.id, club, ageGroup, tier } });
    affiliation = existingAffiliations[0] || null;

    if (!affiliation) {
      affiliation = await tx.playerAffiliation.create({
        data: { playerId: player.id, club, ageGroup, tier, confirmed: false, createdBy: actingAccountId },
      });
    } else if (!affiliation.confirmed) {
      const otherAccountUsedThem = await tx.goal.findFirst({
        where: { affiliationId: affiliation.id, report: { accountId: { not: actingAccountId } } },
      });
      if (otherAccountUsedThem) {
        affiliation = await tx.playerAffiliation.update({ where: { id: affiliation.id }, data: { confirmed: true } });
      }
    }
  }

  return { player, affiliation };
}

export { normalize, editDistance, resolvePlayer };
