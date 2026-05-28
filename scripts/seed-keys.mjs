// Creates the claim_* tables and loads API keys from a file into the pool.
//
// Usage:
//   node scripts/seed-keys.mjs --migrate-only        # just create tables
//   node scripts/seed-keys.mjs keys.txt              # migrate + load keys
//   node scripts/seed-keys.mjs                       # defaults to keys.txt
//
// The keys file has one API key per line. Blank lines and # comments are ignored.
// Re-running is safe: existing keys are skipped (ON CONFLICT DO NOTHING).

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { loadEnv } from "./_env.mjs";

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (check .env.local).");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: process.env.DATABASE_URL.includes("sslmode=require") ? "require" : undefined,
});

async function migrate() {
  const ddl = readFileSync(resolve(__dirname, "migrate.sql"), "utf8");
  await sql.unsafe(ddl);
  console.log("Tables ready.");
}

async function seed(file) {
  const raw = readFileSync(resolve(process.cwd(), file), "utf8");
  const keys = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  if (keys.length === 0) {
    console.log("No keys found in file.");
    return;
  }

  const rows = keys.map((api_key) => ({ api_key }));
  const result = await sql`
    INSERT INTO claim_keys ${sql(rows, "api_key")}
    ON CONFLICT (api_key) DO NOTHING
  `;
  console.log(`Read ${keys.length} keys; inserted ${result.count} new.`);
}

const args = process.argv.slice(2);
const migrateOnly = args.includes("--migrate-only");
const file = args.find((a) => !a.startsWith("--")) ?? "keys.txt";

try {
  await migrate();
  if (!migrateOnly) await seed(file);
} catch (err) {
  console.error("Failed:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
