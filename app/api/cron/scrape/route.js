import { NextResponse } from 'next/server';
import cheerio from 'cheerio';
import { prisma } from '../../../../lib/db';
import { REF_START_TRUST } from '../../../../lib/algorithm';

export const dynamic = 'force-dynamic';

function isAuthorized(req) {
  if (!process.env.CRON_SECRET) return true;
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

async function GET(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sourceUrl = process.env.KDUL_SOURCE_URL;
  if (!sourceUrl) return NextResponse.json({ error: 'KDUL_SOURCE_URL is not set' }, { status: 500 });

  const res = await fetch(sourceUrl, { headers: { 'User-Agent': 'BetterKdulBot/1.0 (+https://betterkdul.com)' } });
  if (!res.ok) return NextResponse.json({ error: `fetch failed: ${res.status}` }, { status: 502 });
  const html = await res.text();
  const $ = cheerio.load(html);

  /* -----------------------------------------------------------------
     PLACEHOLDER SELECTORS.
     This block does not know the real structure of KDUL's site — it's
     a guess at a plausible fixtures-table markup so the rest of the
     pipeline (upsert logic, referee creation, dedupe) has something to
     run against and can be tested. Before this cron does anything
     useful in production:
       1. Open the real KDUL fixtures/results page and view source.
       2. Replace every selector below with the real ones.
       3. Adjust the date parsing to match however KDUL formats dates.
       4. If results/fixtures live on separate pages, or one page per
          age group/division, you'll likely want to loop over several
          URLs here rather than a single KDUL_SOURCE_URL.
  ----------------------------------------------------------------- */
  const scraped = [];
  $('.fixture-row').each((i, el) => {
    const $el = $(el);
    const league = $el.attr('data-age-group') || '';
    const tier = $el.attr('data-division') || '';
    const home = $el.find('.home-team').text().trim();
    const away = $el.find('.away-team').text().trim();
    const scoreText = $el.find('.score').text().trim();
    const refName = $el.find('.referee').text().trim();
    const dateText = $el.attr('data-date') || '';
    const kdulSourceId = $el.attr('data-fixture-id') || `${league}-${tier}-${home}-${away}-${dateText}`;

    if (!home || !away) return;

    let officialHome = null;
    let officialAway = null;
    const scoreMatch = scoreText.match(/(\d+)\s*-\s*(\d+)/);
    if (scoreMatch) {
      officialHome = parseInt(scoreMatch[1], 10);
      officialAway = parseInt(scoreMatch[2], 10);
    }

    scraped.push({ league, tier, home, away, refName, dateText, officialHome, officialAway, kdulSourceId });
  });

  let created = 0;
  let updated = 0;
  let refsCreated = 0;

  for (const fx of scraped) {
    if (fx.refName) {
      const existingRef = await prisma.referee.findUnique({ where: { name: fx.refName } });
      if (!existingRef) {
        await prisma.referee.create({ data: { name: fx.refName, trust: REF_START_TRUST } });
        refsCreated++;
      }
    }

    const parsedDate = fx.dateText ? new Date(fx.dateText) : null;
    const validDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

    const existingMatch = await prisma.match.findUnique({ where: { kdulSourceId: fx.kdulSourceId } });
    if (existingMatch) {
      await prisma.match.update({
        where: { id: existingMatch.id },
        data: {
          officialHome: fx.officialHome,
          officialAway: fx.officialAway,
          officialSource: fx.officialHome !== null ? 'kdul-scrape' : existingMatch.officialSource,
          refName: fx.refName || existingMatch.refName,
        },
      });
      updated++;
    } else {
      await prisma.match.create({
        data: {
          league: fx.league,
          tier: fx.tier,
          home: fx.home,
          away: fx.away,
          date: validDate,
          refName: fx.refName || null,
          officialHome: fx.officialHome,
          officialAway: fx.officialAway,
          officialSource: fx.officialHome !== null ? 'kdul-scrape' : null,
          kdulSourceId: fx.kdulSourceId,
        },
      });
      created++;
    }
  }

  return NextResponse.json({ ok: true, found: scraped.length, created, updated, refsCreated });
}

export { GET };
