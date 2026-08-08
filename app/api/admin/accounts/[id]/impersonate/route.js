import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../../lib/db';
import { requireAdmin, createSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '../../../../../../lib/auth';

export const dynamic = 'force-dynamic';

/* Lets an admin log into this browser AS the target account, without ever
   touching or needing their password (which isn't retrievable — see the
   accounts route). Replaces the admin's own session cookie, so they'll need
   to sign back in as themselves afterward. This is the standard "impersonate
   for support" pattern real platforms use instead of storing plaintext
   passwords. */
async function POST(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const target = await prisma.account.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  const { token } = await createSession(target.id);
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  return NextResponse.json({ ok: true });
}

export { POST };
