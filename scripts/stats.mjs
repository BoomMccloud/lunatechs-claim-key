// Prints pool counts: total / shared / breakdown. Run during the event to monitor.
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
  const [keyStats] = await sql`
    SELECT count(*)::int AS total FROM claim_keys
  `;

  const [shareStats] = await sql`
    SELECT count(*)::int AS total_shares FROM claim_shares
  `;

  const keyBreakdown = await sql`
    SELECT id, api_key, share_count
    FROM claim_keys
    ORDER BY id ASC
  `;

  console.log(`Total Keys in Pool:      ${keyStats.total}`);
  console.log(`Total Shares Allocated:   ${shareStats.total_shares}`);
  console.log("\nSharing Breakdown:");
  console.log("----------------------------------------");
  for (const row of keyBreakdown) {
    const maskedKey = row.api_key.length > 12 
      ? `${row.api_key.slice(0, 8)}...${row.api_key.slice(-4)}` 
      : row.api_key;
    console.log(`Key ID ${row.id} (${maskedKey}): shared ${row.share_count} times`);
  }
} catch (err) {
  console.error("Failed:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
