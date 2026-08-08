import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export const dynamic = 'force-dynamic';

async function GET() {
  // Pinned article (set by an admin) always leads, regardless of age.
  const articles = await prisma.article.findMany({ orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }] });
  return NextResponse.json(articles);
}

export { GET };
