import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const articles = await prisma.article.findMany({ orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }] });
  return NextResponse.json(articles);
}

async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { category, headline, teaser, articleBody } = body;
  if (!category || !headline || !teaser || !articleBody) {
    return NextResponse.json({ error: 'category, headline, teaser, and articleBody are all required' }, { status: 400 });
  }

  if (body.pinned) {
    await prisma.article.updateMany({ data: { pinned: false }, where: { pinned: true } });
  }

  const article = await prisma.article.create({
    data: { category, headline, teaser, body: articleBody, pinned: !!body.pinned },
  });
  return NextResponse.json({ ok: true, article });
}

export { GET, POST };
