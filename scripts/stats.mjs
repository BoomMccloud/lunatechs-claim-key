// Prints pool counts: total / claimed / remaining. Run during the event to monitor.
//   node scripts/stats.mjs

import postgres from "postgres";
import { loadEnv } from "./_env.mjs";

loadEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (check .env.local).");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: process.env.DATABASE_URL.includes("sslmode=require") ? "require" : undefined,
});

try {
  const [stats] = await sql`
    SELECT
      count(*)::int AS total,
      count(claimed_by_email)::int AS claimed,
      (count(*) - count(claimed_by_email))::int AS remaining
    FROM claim_keys
  `;
  console.log(`Total:     ${stats.total}`);
  console.log(`Claimed:   ${stats.claimed}`);
  console.log(`Remaining: ${stats.remaining}`);
} catch (err) {
  console.error("Failed:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
