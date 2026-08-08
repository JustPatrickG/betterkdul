import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getSessionAccount, publicAccount } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function GET() {
  const account = await getSessionAccount();
  if (account) {
    // Lightweight "last seen" heartbeat — this route is hit by nearly every
    // page on load, so it doubles as presence tracking without needing a
    // separate polling endpoint. Fire-and-forget: don't make the user wait
    // on this write just to find out if they're logged in.
    prisma.account.update({ where: { id: account.id }, data: { lastActiveAt: new Date() } }).catch(() => {});
  }
  return NextResponse.json({ account: publicAccount(account) });
}

export { GET };
