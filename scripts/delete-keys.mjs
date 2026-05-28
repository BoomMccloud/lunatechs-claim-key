// Deletes the newest N keys (highest id = most recently seeded) from the pool.
//
// Safe by default: dry run unless you pass --yes, and claimed keys are left
// alone unless you pass --force.
//
// Usage:
//   node scripts/delete-keys.mjs                  # dry run: show the 60 newest unclaimed keys
//   node scripts/delete-keys.mjs --yes            # delete the 60 newest UNCLAIMED keys
//   node scripts/delete-keys.mjs --count 30 --yes # delete the 30 newest unclaimed keys
//   node scripts/delete-keys.mjs --yes --force    # also delete claimed keys in range (revokes them!)

import postgres from "postgres";
import { loadEnv } from "./_env.mjs";

loadEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (check .env.local).");
  process.exit(1);
}

const args = process.argv.slice(2);
const confirm = args.includes("--yes");
const force = args.includes("--force");
const countArg = args[args.indexOf("--count") + 1];
const count = args.includes("--count") ? Number(countArg) : 60;

if (!Number.isInteger(count) || count <= 0) {
  console.error(`Invalid --count: ${countArg}`);
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: process.env.DATABASE_URL.includes("sslmode=require") ? "require" : undefined,
});

try {
  // The N newest keys by id (seed order). These are the "last" ones uploaded.
  const targets = await sql`
    SELECT id, api_key, claimed_by_email
    FROM claim_keys
    ORDER BY id DESC
    LIMIT ${count}
  `;

  if (targets.length === 0) {
    console.log("No keys in the pool.");
    process.exit(0);
  }

  const claimed = targets.filter((r) => r.claimed_by_email);
  const unclaimed = targets.filter((r) => !r.claimed_by_email);
  const toDelete = force ? targets : unclaimed;

  console.log(`Newest ${targets.length} keys selected (by id).`);
  console.log(`  Unclaimed: ${unclaimed.length}`);
  console.log(`  Claimed:   ${claimed.length}${claimed.length && !force ? " (protected — skipped)" : ""}`);

  if (claimed.length && !force) {
    console.log("\nSkipping these CLAIMED keys (pass --force to delete them too):");
    for (const r of claimed) console.log(`  id=${r.id} claimed_by=${r.claimed_by_email}`);
  }

  if (toDelete.length === 0) {
    console.log("\nNothing to delete.");
    process.exit(0);
  }

  if (!confirm) {
    console.log(`\nDRY RUN. Would delete ${toDelete.length} key(s). Re-run with --yes to apply.`);
    process.exit(0);
  }

  const ids = toDelete.map((r) => r.id);
  const result = await sql`DELETE FROM claim_keys WHERE id IN ${sql(ids)}`;
  console.log(`\nDeleted ${result.count} key(s).`);
} catch (err) {
  console.error("Failed:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
