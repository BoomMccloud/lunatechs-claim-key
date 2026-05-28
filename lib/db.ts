import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

declare global {
  // eslint-disable-next-line no-var
  var _claimSql: ReturnType<typeof postgres> | undefined;
}

// Reuse the connection across hot reloads / serverless invocations.
export const sql =
  global._claimSql ??
  postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    ssl: connectionString.includes("sslmode=require") ? "require" : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  global._claimSql = sql;
}
