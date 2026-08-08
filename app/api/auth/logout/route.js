import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { destroySessionByToken, SESSION_COOKIE_NAME } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function POST() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  await destroySessionByToken(token);
  cookies().delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}

export { POST };
