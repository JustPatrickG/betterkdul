import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { requireAdmin } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function PATCH(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const data = {};
  if (body.category !== undefined) data.category = body.category;
  if (body.headline !== undefined) data.headline = body.headline;
  if (body.teaser !== undefined) data.teaser = body.teaser;
  if (body.articleBody !== undefined) data.body = body.articleBody;

  // Pinning one article to the top unpins every other one — only one
  // article can be pinned at a time, since it's shown as THE lead story.
  if (body.pinned !== undefined) {
    if (body.pinned) {
      await prisma.article.updateMany({ data: { pinned: false }, where: { pinned: true } });
    }
    data.pinned = !!body.pinned;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const article = await prisma.article.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, article });
}

async function DELETE(req, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  await prisma.article.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export { PATCH, DELETE };
