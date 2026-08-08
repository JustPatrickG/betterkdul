import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../lib/db';
import { hashPassword, createSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE, publicAccount } from '../../../../lib/auth';

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
  const { type, displayName, email, password, ageGroup, league, club, fanClubs } = body;

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

  const username = displayName.trim();
  const existing = await prisma.account.findFirst({ where: { OR: [{ username }, { email }] } });
  if (existing) {
    return NextResponse.json({ error: 'That name or email is already registered.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
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

  const account = await prisma.account.create({ data });
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
