# BetterKdul

Community-verified results for the Kildare Development Underage League —
Next.js (App Router) + Postgres (Prisma) + Vercel Cron.

## What this is

The real backend behind the earlier single-file prototype: same trust
economy, same weighted consensus algorithm, same 24h settlement engine —
now running server-side against a real database instead of a browser
storage API, with real password hashing and real session auth.

## Updating an existing deployment

If you already deployed an earlier version of this repo: the `Article`
model gained a `pinned` field for this update. After pulling the new
code, run `npm run db:push` again (pointed at your real `DATABASE_URL`)
to apply that schema change before deploying — otherwise the new admin
"pin" feature will error against the old table shape.

## 1. Local setup

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL at minimum — see below
npm run db:push      # creates tables from prisma/schema.prisma
npm run db:seed       # creates your first admin account, from ADMIN_USERNAME/ADMIN_PASSWORD in .env
npm run dev
```

### Getting a Postgres database

Easiest path: in your Vercel project, go to **Storage → Create Database →
Postgres** (Neon-backed). It writes `DATABASE_URL` into your project's
env vars for you. Copy that same value into your local `.env` for
`npm run db:push` to work locally too. Any other Postgres works fine too
(Supabase, Railway, your own instance) — it's just a connection string.

## 2. Environment variables

All of these go in `.env` locally, and in **Vercel → Project → Settings
→ Environment Variables** for production. See `.env.example` for the
full list with comments. The important ones:

- `DATABASE_URL` — required, or nothing works.
- `ANTHROPIC_API_KEY` — required for the daily headlines cron. Get one
  from [console.anthropic.com](https://console.anthropic.com) — this is
  a *developer* API key, separate from a claude.ai login, and it's
  billed per use.
- `KDUL_SOURCE_URL` — the KDUL fixtures/results page to scrape. **The
  scraper's selectors are placeholders** (see below) — set this once you
  know what you're actually scraping.
- `CRON_SECRET` — Vercel sets this automatically on any project with
  cron jobs defined in `vercel.json`. You don't need to set it by hand
  on Vercel. Only set it locally if you want to test-call
  `/api/cron/*` routes yourself and need the `Authorization: Bearer …`
  header to match.
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — only read once, by
  `npm run db:seed`, to create your first admin account. Not needed
  after that.

## 3. Deploying

1. Push this repo to GitHub.
2. Import it in Vercel (New Project → pick the repo).
3. Add the environment variables above in the Vercel project settings
   before the first deploy.
4. Deploy. `postinstall` runs `prisma generate` automatically as part
   of the build.
5. Run `npm run db:push` **once**, pointed at the production
   `DATABASE_URL`, to create the tables (from your machine, with `.env`
   pointed at prod — or via Vercel's CLI: `vercel env pull` then
   `npm run db:push`).
6. Run `npm run db:seed` once the same way, to create your admin
   account.
7. The three cron jobs in `vercel.json` (scrape, settle, headlines) start
   running automatically once deployed — daily, staggered an hour apart.
   Vercel's Hobby plan caps cron jobs at once a day each; that's already
   what's configured. Upgrading to Pro unlocks more frequent runs if you
   want the scraper checking more often — you'd change the schedules in
   `vercel.json` and redeploy.

## 4. The scraper is NOT wired up to a real site yet

`app/api/cron/scrape/route.js` has clearly-marked placeholder CSS
selectors (`.fixture-row`, `.home-team`, etc.) — they're a guess at
plausible markup, not the real KDUL site. Before this does anything
useful:

1. Open KDUL's actual fixtures/results page and view source.
2. Replace the selectors in that file with the real ones.
3. Fix the date parsing to match however KDUL formats dates.
4. If fixtures/results are split across multiple pages (per age group
   or division, say), you'll want to loop over several URLs instead of
   the single `KDUL_SOURCE_URL`.

Send me the real page (URL or pasted HTML) and I'll wire the real
selectors in directly rather than leaving this as a placeholder.

## 5. Architecture notes

- **Auth**: bcrypt password hashes, random session tokens stored in a
  `Session` table, referenced by an httpOnly cookie. No third-party
  auth provider — simple and fully under your control, but you own
  password-reset flows, email verification, etc. if you want them
  later (not built yet).
- **Trust economy / consensus / settlement**: `lib/algorithm.js` is a
  direct port of the prototype's logic — same formulas, same rules
  (no single report can auto-confirm a result; settlement runs 24h
  after kickoff and scores every report field-by-field against
  whatever the weighted algorithm favours at that moment).
- **One report per account per match** is enforced at the database
  level (`@@unique([matchId, accountId])` in the Prisma schema), not
  just in application code.
- **AI headlines** call Anthropic's API directly from the server
  (`app/api/cron/headlines/route.js`) using your own API key — this
  works in a real deployment, unlike the original prototype's
  in-browser fetch, which only worked inside the Claude artifact
  sandbox.

## 6. Admin dashboard

`/admin` (linked from the Account tab once you're signed in as an admin)
now has full control over everything on the site, tabbed:

- **Accounts** — edit any field (name, email, type, age group/division/
  club, fan clubs, verification status, trust score, admin flag),
  reset a password, delete an account outright, or create one manually.
- **Fixtures** — edit any field on a match, manually set or clear the
  official/settled result (including re-opening a settled match), delete
  a fixture, create one from scratch. Expanding a fixture also shows
  every community report on it, editable or deletable inline.
- **Reports** — every report on the site in one searchable list (by
  reporter or club), independent of hunting through individual matches.
- **Referees** — edit name/trust/source URL, delete, or add one manually.
- **Headlines** — edit or delete any AI-written article, write a new one
  from scratch, and pin one article to the top of the site (pinning
  unpins whatever was pinned before — only one leads at a time).
- **Clubs/Teams** — edit or clear any club's ground info or team's notes.

This dashboard has no additional guardrails beyond "you must be signed
in as an admin" — every action here takes effect immediately, site-wide,
for every visitor. Treat admin credentials accordingly.

## 7. Known gaps (carried over from the pre-launch checklist)

- No content moderation on free-text fields (scorers, MOTM, cards, club
  notes).
- No email verification or password-reset flow.
- No rate limiting beyond the weekly report cap.
- Sybil risk: nothing stops one person creating multiple player accounts
  to inflate a result's apparent corroboration.
- Minors' data (players are U10–U18) is stored permanently by design —
  worth resolving the GDPR/parental-consent question with a solicitor
  before real users sign up, as flagged earlier.
