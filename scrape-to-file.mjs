// Standalone KDUL data puller — run with: node scrape-to-file.mjs
// Fetches every competition's fixtures directly (no browser, no manual
// clicking) and saves everything to kdul-season-data.json in this folder.
// Does NOT touch your database or the live app — this is a standalone file.

import * as cheerio from 'cheerio';
import fs from 'fs';

const BASE_URL = 'https://soccerleagues.comortais.com';
const OID = 1012;
const REQUEST_DELAY_MS = 400;

const COMPETITIONS = [
  { id: 13301, league: 'U8', tier: 'Single' },
  { id: 13302, league: 'U8', tier: 'Twin Yellow' },
  { id: 13303, league: 'U8', tier: 'Twin Orange' },
  { id: 13436, league: 'U9', tier: 'Single' },
  { id: 13304, league: 'U9', tier: 'Twin Black' },
  { id: 13750, league: 'U9', tier: 'Twin Orange' },
  { id: 13751, league: 'U9', tier: 'Twin Yellow' },
  { id: 13307, league: 'U10', tier: 'Green' },
  { id: 13308, league: 'U10', tier: 'Black' },
  { id: 13309, league: 'U10', tier: 'Yellow' },
  { id: 13310, league: 'U10', tier: 'Orange' },
  { id: 13311, league: 'U10', tier: 'Blue' },
  { id: 13312, league: 'U11', tier: 'Green' },
  { id: 13313, league: 'U11', tier: 'Black' },
  { id: 13314, league: 'U11', tier: 'Yellow' },
  { id: 13315, league: 'U11', tier: 'Orange' },
  { id: 13316, league: 'U11', tier: 'Blue' },
  { id: 13317, league: 'U12', tier: 'Premier' },
  { id: 13318, league: 'U12', tier: 'Major' },
  { id: 13319, league: 'U12', tier: 'Major 1' },
  { id: 13320, league: 'U12', tier: 'Major 2' },
  { id: 13321, league: 'U12', tier: 'Major 3' },
  { id: 13325, league: 'U8/U9', tier: 'Girls Single' },
  { id: 13326, league: 'U10', tier: 'Girls' },
  { id: 13327, league: 'U11', tier: 'Girls' },
  { id: 13328, league: 'U12', tier: 'Girls' },
  { id: 13329, league: 'U13', tier: 'Girls' },
  { id: 13330, league: 'U15', tier: 'Girls' },
  { id: 13331, league: 'U16', tier: 'Girls' },
  { id: 13332, league: 'U17/U18', tier: 'Girls' },
  { id: 13416, league: 'Girls', tier: 'Championship' },
  { id: 13415, league: 'Girls', tier: 'Youths' },
  { id: 13437, league: 'U12', tier: 'Cup' },
  { id: 13419, league: 'U12', tier: 'Shield' },
  { id: 13421, league: 'U12', tier: 'Plate' },
  { id: 13418, league: 'U12', tier: 'Girls Cup' },
  { id: 13420, league: 'U12', tier: 'Girls Shield' },
  { id: 13423, league: 'U13', tier: 'Girls Cup' },
  { id: 13424, league: 'U13', tier: 'Girls Shield' },
  { id: 13425, league: 'U15', tier: 'Girls Cup' },
  { id: 13427, league: 'U15', tier: 'Girls Shield' },
  { id: 13428, league: 'U16', tier: 'Girls Cup' },
  { id: 13429, league: 'U16', tier: 'Girls Shield' },
  { id: 13430, league: 'U18', tier: 'Girls Cup' },
  { id: 13431, league: 'U18', tier: 'Girls Shield' },
];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function parseKdulDate(raw) {
  if (!raw) return null;
  const text = raw.replace(/\s+/g, ' ').trim();
  const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!dateMatch) return null;
  const [, dd, mm, yy] = dateMatch;
  let year = parseInt(yy, 10);
  if (year < 100) year += 2000;
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10) - 1;
  let hour = 0, minute = 0;
  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10) % 12;
    minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    if (timeMatch[3].toLowerCase() === 'pm') hour += 12;
  }
  const date = new Date(year, month, day, hour, minute);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function summarizeScorers(names) {
  if (!names.length) return null;
  const counts = new Map();
  for (const name of names) counts.set(name, (counts.get(name) || 0) + 1);
  return Array.from(counts.entries()).map(([n, c]) => (c > 1 ? `${n} x${c}` : n)).join(', ');
}

function parseFixtureRow($, dateCell, comp) {
  const $row = $(dateCell).closest('tr');
  const cells = $row.find('td').toArray();
  if (cells.length < 10) return null;

  const dateIdx = cells.indexOf(dateCell);
  if (dateIdx === -1) return null;

  const homeIdx = dateIdx + 1;
  const homeScoreIdx = dateIdx + 2;
  const awayScoreIdx = dateIdx + 3;
  const n = cells.length;
  const reportIdx = n - 1;
  const venueIdx = n - 2;
  const refIdx = n - 3;
  const awayIdx = n - 4;
  if (awayIdx <= awayScoreIdx) return null;

  const dateText = $(dateCell).text().trim();
  const home = $(cells[homeIdx]).text().trim();
  const away = $(cells[awayIdx]).text().trim();
  if (!home || !away) return null;

  const homeScoreText = $(cells[homeScoreIdx]).text().trim();
  const awayScoreText = $(cells[awayScoreIdx]).text().trim();
  const homeScore = /^\d+$/.test(homeScoreText) ? parseInt(homeScoreText, 10) : null;
  const awayScore = /^\d+$/.test(awayScoreText) ? parseInt(awayScoreText, 10) : null;

  const scorerHome = [], scorerAway = [], scorerUnknown = [];
  for (let i = awayScoreIdx + 1; i < awayIdx; i++) {
    const $cell = $(cells[i]);
    const text = $cell.text().trim();
    if (!text) continue;
    const cls = ($cell.attr('class') || '').toLowerCase();
    if (cls.includes('home')) scorerHome.push(text);
    else if (cls.includes('away')) scorerAway.push(text);
    else scorerUnknown.push(text);
  }

  const refTextRaw = $(cells[refIdx]).text().trim();
  const refName = refTextRaw.replace(/^\*/, '').trim() || null;
  const venue = $(cells[venueIdx]).text().trim() || null;
  const reportHref = $(cells[reportIdx]).find('a').attr('href');
  const matchIdMatch = reportHref ? reportHref.match(/id=(\d+)/) : null;
  const matchId = matchIdMatch ? matchIdMatch[1] : null;

  return {
    league: comp.league,
    tier: comp.tier,
    home,
    away,
    date: parseKdulDate(dateText),
    refName,
    homeScore,
    awayScore,
    homeScorers: summarizeScorers(scorerHome),
    awayScorers: summarizeScorers([...scorerAway, ...scorerUnknown]),
    venue,
    matchId,
  };
}

function parseTopScorers($) {
  const heading = $('*').filter((i, el) => $(el).children().length === 0 && $(el).text().trim() === 'Top Scorers').first();
  if (!heading.length) return [];
  let el = heading;
  let table = null;
  for (let i = 0; i < 6 && el.length; i++) {
    table = el.find('table').first();
    if (table.length) break;
    el = el.parent();
  }
  if (!table || !table.length) return [];
  const rows = [];
  table.find('tr').each((i, tr) => {
    const cells = $(tr).find('td').map((j, td) => $(td).text().trim()).get();
    if (cells.length === 3) rows.push({ player: cells[0], club: cells[1], goals: cells[2] });
  });
  return rows;
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'BetterKdulBot/1.0 (+https://betterkdul.com) - data collection with permission from Comortais and KDUL' } });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return cheerio.load(await res.text());
}

async function main() {
  const results = [];
  let done = 0;

  for (const comp of COMPETITIONS) {
    process.stdout.write(`[${++done}/${COMPETITIONS.length}] ${comp.league} ${comp.tier} (id=${comp.id})... `);
    try {
      const fixturesUrl = `${BASE_URL}/Fixtures.aspx?oid=${OID}&compid=${comp.id}`;
      const $fixtures = await fetchPage(fixturesUrl);
      const fixtures = [];
      $fixtures('td.date').each((i, dateCell) => {
        const fx = parseFixtureRow($fixtures, dateCell, comp);
        if (fx) fixtures.push(fx);
      });

      await sleep(REQUEST_DELAY_MS);

      const tableUrl = `${BASE_URL}/competition.aspx?oid=${OID}&id=${comp.id}`;
      const $table = await fetchPage(tableUrl);
      const topScorers = parseTopScorers($table);

      results.push({ competitionId: comp.id, league: comp.league, tier: comp.tier, fixtureCount: fixtures.length, fixtures, topScorers });
      console.log(`${fixtures.length} fixtures, ${topScorers.length} scorer entries`);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results.push({ competitionId: comp.id, league: comp.league, tier: comp.tier, error: err.message });
    }
    await sleep(REQUEST_DELAY_MS);
  }

  fs.writeFileSync('kdul-season-data.json', JSON.stringify(results, null, 2));
  const totalFixtures = results.reduce((sum, r) => sum + (r.fixtureCount || 0), 0);
  const totalScorers = results.reduce((sum, r) => sum + (r.topScorers?.length || 0), 0);
  console.log(`\nDone. Saved kdul-season-data.json — ${totalFixtures} fixtures, ${totalScorers} scorer entries across ${COMPETITIONS.length} competitions.`);
}

main();
