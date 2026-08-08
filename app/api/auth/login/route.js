import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../lib/db';
import { verifyPassword, createSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE, publicAccount } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json({ error: 'Missing username or password.' }, { status: 400 });
  }

  const account = await prisma.account.findUnique({ where: { username } });
  if (!account) {
    return NextResponse.json({ error: 'Incorrect username or password.' }, { status: 401 });
  }
  const ok = await verifyPassword(password, account.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'Incorrect username or password.' }, { status: 401 });
  }

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
