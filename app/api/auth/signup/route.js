import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../lib/db';
import { hashPassword, createSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE, publicAccount } from '../../../../lib/auth';
import { resolvePlayer } from '../../../../lib/players';

export const dynamic = 'force-dynamic';

function nameEmailPlausible(displayName, email) {
  const local = (email.split('@')[0] || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!local) return false;
  const words = (displayName || '').toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
  if (words.length === 0) return true;
  return words.some((w) => local.includes(w));
}

async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { type, displayName, email, password, ageGroup, league, club, fanClubs, playerId } = body;

  if (!type || !displayName || !email || !password) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }
  if (type !== 'player' && type !== 'fan') {
    return NextResponse.json({ error: 'type must be "player" or "fan".' }, { status: 400 });
  }
  if (type === 'player' && (!ageGroup || !league || !club)) {
    return NextResponse.json({ error: 'Player accounts need ageGroup, league, and club.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  const username = String(displayName).trim();
  const existing = await prisma.account.findFirst({ where: { OR: [{ username }, { email }] } });
  if (existing) {
    return NextResponse.json({ error: 'That name or email is already registered.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const account = await prisma.$transaction(async (tx) => {
    const data = {
      username,
      displayName: username,
      email,
      passwordHash,
      type,
      trust: 0,
    };

    if (type === 'player') {
      data.ageGroup = ageGroup;
      data.league = league;
      data.club = club;
      data.verificationStatus = 'pending_review';
      data.nameMatchesEmail = nameEmailPlausible(username, email);
    } else {
      data.fanClubs = Array.isArray(fanClubs) ? fanClubs : [];
      data.verificationStatus = 'verified';
    }

    const created = await tx.account.create({ data });

    if (type === 'player') {
      // Match/create against the shared player roster — matched by name
      // ALONE (same logic as goal-scoring), never scoped to a club, since
      // someone who moved clubs or aged up is still the same person. If
      // they picked an existing entry from the search box, playerId
      // short-circuits straight to it and we just resolve/create the
      // affiliation for THIS club/age/tier; otherwise the whole thing is
      // resolved fresh from the typed name. Done after account creation
      // so the new Player/affiliation's createdBy points at a real
      // account, not a placeholder.
      let player = null;
      if (playerId) player = await tx.player.findUnique({ where: { id: String(playerId) } });

      if (player) {
        const existingAff = await tx.playerAffiliation.findFirst({ where: { playerId: player.id, club, ageGroup, tier: league } });
        if (!existingAff) {
          await tx.playerAffiliation.create({ data: { playerId: player.id, club, ageGroup, tier: league, confirmed: false, createdBy: created.id } });
        }
      } else {
        const resolved = await resolvePlayer(tx, username, club, ageGroup, league, created.id);
        player = resolved.player;
      }

      if (player) {
        return tx.account.update({ where: { id: created.id }, data: { playerId: player.id } });
      }
    }

    return created;
  });

  const { token } = await createSession(account.id);
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  return NextResponse.json({ ok: true, account: publicAccount(account) });
}

export { POST };
