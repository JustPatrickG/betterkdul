import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { requireAdmin, publicAccount, hashPassword } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const accounts = await prisma.account.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(accounts.map(publicAccount));
}

async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { username, email, password, type } = body;
  if (!username || !email || !password || !type) {
    return NextResponse.json({ error: 'username, email, password, and type are required' }, { status: 400 });
  }
  const existing = await prisma.account.findFirst({ where: { OR: [{ username }, { email }] } });
  if (existing) return NextResponse.json({ error: 'That username or email is already registered.' }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const account = await prisma.account.create({
    data: {
      username,
      displayName: body.displayName || username,
      email,
      passwordHash,
      type,
      ageGroup: type === 'player' ? body.ageGroup || null : null,
      league: type === 'player' ? body.league || null : null,
      club: type === 'player' ? body.club || null : null,
      fanClubs: type === 'fan' ? (body.fanClubs || []) : [],
      verificationStatus: body.verificationStatus || 'verified',
      trust: typeof body.trust === 'number' ? body.trust : 0,
      isAdmin: !!body.isAdmin,
    },
  });
  return NextResponse.json({ ok: true, account: publicAccount(account) });
}

export { GET, POST };
