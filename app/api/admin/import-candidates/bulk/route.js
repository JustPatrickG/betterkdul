import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { requireAdmin } from '../../../../../lib/auth';
import { normalize } from '../../../../../lib/players';

export const dynamic = 'force-dynamic';

/* Splits on a delimiter but ignores anything inside ( ) — so a note like
   "(older source, 2017 — may be outdated)" doesn't get torn apart by its
   own internal comma. */
function splitRespectingParens(str, delimiter) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === delimiter && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

/* Parses text shaped like:
     Naas AFC
     Jack Murphy, Kelly, Peter McBride, ...
     Clane United FC
     Sean Og Finn, Andrew McCormack, ...
   A "club" line is any line that, once any parenthetical aside is
   stripped out, has no commas AND starts with a capital letter — real
   club names are always capitalized here, and a genuine name list
   always has multiple comma-separated entries once parens are ignored. */
function parseBulkText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const out = [];
  let currentClub = null;

  for (const line of lines) {
    const withoutParens = line.replace(/\([^)]*\)/g, '').trim();
    const looksLikeClubHeader = !withoutParens.includes(',') && /^[A-Z]/.test(line) && withoutParens.length < 80;
    if (looksLikeClubHeader) {
      currentClub = withoutParens.trim() || line.trim();
      continue;
    }
    if (!currentClub) continue; // names before any club header — skip, nothing to attach them to

    splitRespectingParens(line, ',').forEach((raw) => {
      let name = raw.trim();
      if (!name) return;
      let sourceNote = null;
      const parenMatch = name.match(/^(.*?)\s*\((.*?)\)\s*$/);
      if (parenMatch) {
        name = parenMatch[1].trim();
        sourceNote = parenMatch[2].trim();
      }
      if (!name) return;
      out.push({ name, club: currentClub, sourceNote });
    });
  }
  return out;
}

async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const text = body.text ? String(body.text) : '';
  const sourceLabel = body.sourceLabel ? String(body.sourceLabel).slice(0, 200) : null;
  if (!text.trim()) return NextResponse.json({ error: 'no-text' }, { status: 400 });

  const parsed = parseBulkText(text);
  if (parsed.length === 0) return NextResponse.json({ error: 'nothing-parsed' }, { status: 400 });

  // Skip exact name+club duplicates already staged or already a real
  // confirmed player — everything else (near-duplicates, misspellings)
  // gets staged anyway for a human to actually look at, rather than
  // silently guessing which ones match.
  const existingCandidates = await prisma.playerImportCandidate.findMany({
    where: { status: 'pending' },
    select: { name: true, club: true },
  });
  const existingPlayers = await prisma.player.findMany({ select: { name: true, club: true } });
  const seen = new Set([...existingCandidates, ...existingPlayers].map((p) => `${normalize(p.club)}|${normalize(p.name)}`));

  let created = 0;
  let skipped = 0;
  for (const entry of parsed) {
    const key = `${normalize(entry.club)}|${normalize(entry.name)}`;
    if (seen.has(key)) { skipped++; continue; }
    seen.add(key);
    await prisma.playerImportCandidate.create({
      data: { name: entry.name, club: entry.club, sourceNote: entry.sourceNote, sourceLabel },
    });
    created++;
  }

  return NextResponse.json({ ok: true, parsed: parsed.length, created, skipped });
}

export { POST };
