# Deploying to Vercel

The Vercel app serves the **website**. You load API keys into the database
yourself by running the seed script **locally** against the production database.
`keys.txt` is gitignored, so it never touches GitHub or Vercel.

## 1. Get a cloud Postgres

Vercel's serverless functions can't reach a local/`localhost` database, so use a
hosted one:

- [neon.tech](https://neon.tech) → create a project → copy the connection string,
  e.g. `postgresql://user:pass@ep-xxx.aws.neon.tech/dbname?sslmode=require`.

Keep that string for steps 3 and 4. SSL is enabled automatically when the string
contains `sslmode=require`.

## 2. Create `keys.txt`

A plain text file in the project root, **one API key per line**:

```
sk-real-key-0001
sk-real-key-0002
```

Blank lines and `#` comments are ignored. Seed at least as many keys as expected
attendees, plus a buffer — once the pool is empty, claims show "all keys claimed."

## 3. Load keys into the cloud DB (run locally, once)

```bash
DATABASE_URL="postgresql://...neon.tech/dbname?sslmode=require" npm run seed
```

This creates the `claim_*` tables and inserts the keys. Verify:

```bash
DATABASE_URL="postgresql://...neon.tech/dbname?sslmode=require" npm run stats
```

Re-running `seed` later adds new keys; duplicates are skipped.

## 4. Deploy on Vercel

1. vercel.com → **Add New → Project** → import `BoomMccloud/lunatechs-claim-key`.
2. Set **Environment Variables** (Production):

| Var | Value |
|---|---|
| `DATABASE_URL` | the Neon string from step 1 |
| `EVENT_ACCESS_CODE` | the code shown to attendees (not `changeme`) |
| `OTP_PEPPER` | `openssl rand -hex 32` |
| `SESSION_SECRET` | `openssl rand -hex 32` (a different value) |
| `RESEND_API_KEY` | your Resend key |
| `EMAIL_FROM` | a verified Resend sender, e.g. `noreply@preppal.co` |

3. **Deploy.**

## 5. Smoke-test the live site

Open the Vercel URL, enter the access code + your email, get the OTP by email,
and claim a key. Then `npm run stats` (against the cloud DB) should show one claimed.

## Operating during the event

- **Monitor remaining keys:** `npm run stats` against the production DB.
- **Reset everything** (wipes claims + OTPs): connect to the DB and run
  `TRUNCATE claim_keys, claim_otps;`, then re-seed.
- **Resend limits:** the free tier is ~100 emails/day / 3,000/month. Each attendee
  uses 1 OTP email (+1 if they use "email it to me"). For 100+ attendees, upgrade
  the Resend plan beforehand.

## Notes

- The local podman Postgres can remain your dev/test database; production uses Neon.
- Use strong, unique values for `OTP_PEPPER` and `SESSION_SECRET` in production —
  not the local test values.
