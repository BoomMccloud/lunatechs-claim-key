# Claim Code

A self-serve site for handing out API keys at an event. Attendees enter an event
access code and their email, verify with a one-time code (OTP) sent by email, then
see their API key on screen (copy button) with the option to email it to themselves.

Keys come from a **pre-loaded pool** — the server never mints keys. One key per email;
re-verifying the same email returns the same key.

Stack: Next.js (App Router) on Vercel · Postgres (existing DB, `claim_*` tables) · Resend.

## Setup

1. Install deps:
   ```bash
   npm install
   ```

2. Copy env and fill it in:
   ```bash
   cp .env.example .env.local
   ```
   - `DATABASE_URL` — your existing Postgres. Only `claim_*` tables are touched.
   - `EVENT_ACCESS_CODE` — the shared code attendees type in.
   - `OTP_PEPPER`, `SESSION_SECRET` — random secrets: `openssl rand -hex 32`.
   - `RESEND_API_KEY`, `EMAIL_FROM` — Resend key + a verified sender. If `RESEND_API_KEY`
     is empty in development, OTPs are printed to the server console instead of emailed.

3. Create the tables and load keys. Put your keys in `keys.txt`, one per line:
   ```bash
   npm run migrate          # create tables only
   npm run seed             # create tables + load keys.txt
   npm run seed -- mykeys.txt
   ```

## Run locally

```bash
npm run dev
```

Open http://localhost:3000. With no Resend key, watch the terminal for the
`[dev] OTP for …` line to get your code.

## Monitor during the event

```bash
npm run stats     # total / claimed / remaining
```

## Deploy to Vercel

1. Push to a Git repo and import into Vercel.
2. Set all env vars from `.env.example` in the Vercel project settings.
3. Verify a sending domain in Resend and set `EMAIL_FROM` to an address on it.
4. Run `npm run seed` locally (or from any machine with `DATABASE_URL`) to load the pool —
   the same database backs production.

## Security notes

- Access code gates the public URL so the pool can't be drained by strangers.
- OTPs are hashed (HMAC-SHA256 + pepper), expire in 10 min, single-use, max 5 attempts.
- OTP requests are rate-limited per email (3) and per IP (10) per 15 min.
- A signed, httpOnly session cookie authorizes the post-verify "email it to me" action.
- A unique partial index enforces one key per email at the database level.

## Files

- `app/page.tsx` — the multi-step claim UI.
- `app/api/{request-otp,verify-otp,email-key}/route.ts` — the three endpoints.
- `lib/` — db client, OTP, session, email, rate limit, key allocation, validation.
- `scripts/` — `migrate.sql`, `seed-keys.mjs`, `stats.mjs`.
