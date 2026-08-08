import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getMatchConsensus } from '../../../../lib/algorithm';

export const dynamic = 'force-dynamic';

function isAuthorized(req) {
  if (!process.env.CRON_SECRET) return true;
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

const SYSTEM_PROMPT = `You are the sports desk for BetterKdul, a local news feed covering the Kildare Development Underage League (KDUL), an Irish grassroots underage football league running age groups U8 to U18, with Premier/Major/Major 1 divisions per age group. Write short, punchy, LOCAL-PAPER style headlines and blurbs based ONLY on the match data given to you - never invent scores, names, or events not present in the data. Respond with ONLY a raw JSON array, no markdown fences, no preamble, no commentary. Each array item must be an object with exactly these fields: category (one of: MATCH REPORT, DISPUTED RESULT, ROUND-UP, REFEREE WATCH, SEASON WATCH, TITLE RACE, TOP SCORER WATCH), headline (under 10 words, punchy tabloid style), teaser (one short sentence), body (3-4 short sentences, factual, grounded in the given data; if a result's score is null, mention it's still awaiting enough corroborating reports before it's confirmed; if status is 'settled', treat the score as final and locked). Order the array with the single most important story first. Produce between 3 and 6 items, favouring variety across different leagues, including a title-race or top-scorer story if the standings/scorer data supports one.`;

async function GET(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 });

  const matches = await prisma.match.findMany({
    include: { reports: { include: { account: { select: { trust: true } } } } },
  });
  const referees = await prisma.referee.findMany();
  const refByName = Object.fromEntries(referees.map((r) => [r.name, r.trust]));

  const dataForAI = matches.map((m) => {
    const c = getMatchConsensus(m, refByName);
    return {
      league: m.league,
      tier: m.tier,
      home: m.home,
      away: m.away,
      status: c.status,
      score: c.homeScore !== null ? `${c.homeScore}-${c.awayScore}` : null,
      homeScorers: c.homeScorers,
      awayScorers: c.awayScorers,
      ref: m.refName,
    };
  });

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Here is the current match data as JSON:\n${JSON.stringify(dataForAI)}\n\nWrite the headlines now.` }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    return NextResponse.json({ error: `Anthropic API error: ${resp.status}`, detail: errText }, { status: 502 });
  }

  const data = await resp.json();
  const textBlock = (data.content || []).find((b) => b.type === 'text');
  if (!textBlock) return NextResponse.json({ error: 'no text in response' }, { status: 502 });

  const clean = textBlock.text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  let articles;
  try {
    articles = JSON.parse(clean);
  } catch (e) {
    return NextResponse.json({ error: 'could not parse model output as JSON', raw: clean }, { status: 502 });
  }

  // Simple approach: each run replaces the previous batch outright.
  await prisma.article.deleteMany({});
  await prisma.article.createMany({
    data: articles.map((a) => ({
      category: a.category || 'ROUND-UP',
      headline: a.headline || '',
      teaser: a.teaser || '',
      body: a.body || '',
    })),
  });

  return NextResponse.json({ ok: true, count: articles.length });
}

export { GET };
