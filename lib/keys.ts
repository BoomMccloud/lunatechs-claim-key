import { sql } from "./db";

export class PoolEmptyError extends Error {
  constructor() {
    super("No API keys remaining");
    this.name = "PoolEmptyError";
  }
}

// Returns the key already claimed by this email, or null.
export async function getClaimedKey(email: string): Promise<string | null> {
  const [row] = await sql<{ api_key: string }[]>`
    SELECT k.api_key FROM claim_shares s
    JOIN claim_keys k ON s.key_id = k.id
    WHERE s.email = ${email}
    LIMIT 1
  `;
  return row?.api_key ?? null;
}

// Returns the email a device already claimed under, or null.
export async function getDeviceClaim(deviceId: string): Promise<string | null> {
  const [row] = await sql<{ claimed_email: string }[]>`
    SELECT claimed_email FROM claim_devices WHERE device_id = ${deviceId} LIMIT 1
  `;
  return row?.claimed_email ?? null;
}

// Records the first claim for a device. Idempotent — later calls are ignored.
export async function recordDeviceClaim(
  deviceId: string,
  email: string
): Promise<void> {
  await sql`
    INSERT INTO claim_devices (device_id, claimed_email)
    VALUES (${deviceId}, ${email})
    ON CONFLICT (device_id) DO NOTHING
  `;
}

// Allocates a key in a round-robin fashion to the email and returns it.
// Idempotent: if the email already has a key, returns that one.
// Throws PoolEmptyError when no keys exist in the database.
export async function claimKey(email: string): Promise<string> {
  const existing = await getClaimedKey(email);
  if (existing) return existing;

  try {
    let apiKey: string | null = null;
    await sql.begin(async (sql) => {
      // Prevent concurrent round-robin calls from picking the same key
      await sql`LOCK TABLE claim_shares IN EXCLUSIVE MODE`;

      // Double-check inside transaction to avoid race conditions
      const [existingRow] = await sql<{ api_key: string }[]>`
        SELECT k.api_key FROM claim_shares s
        JOIN claim_keys k ON s.key_id = k.id
        WHERE s.email = ${email}
        LIMIT 1
      `;
      if (existingRow) {
        apiKey = existingRow.api_key;
        return;
      }

      // Get count of total claims
      const [countRow] = await sql<{ count: string }[]>`
        SELECT count(*)::int AS count FROM claim_shares
      `;
      const totalClaims = parseInt(countRow?.count ?? "0", 10);

      // Get all keys ordered by id asc (to guarantee round-robin order)
      const dbKeys = await sql<{ id: string; api_key: string }[]>`
        SELECT id, api_key FROM claim_keys ORDER BY id ASC
      `;
      if (dbKeys.length === 0) {
        throw new PoolEmptyError();
      }

      const nextIndex = totalClaims % dbKeys.length;
      const selectedKey = dbKeys[nextIndex];

      // Insert the claim mapping
      await sql`
        INSERT INTO claim_shares (email, key_id)
        VALUES (${email}, ${selectedKey.id})
      `;

      // Update the share count on the key
      await sql`
        UPDATE claim_keys
        SET share_count = share_count + 1
        WHERE id = ${selectedKey.id}
      `;

      apiKey = selectedKey.api_key;
    });

    if (!apiKey) {
      throw new Error("Failed to allocate key");
    }
    return apiKey;
  } catch (err: unknown) {
    // Unique index race check: another concurrent request claimed for this same email.
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      const claimed = await getClaimedKey(email);
      if (claimed) return claimed;
    }
    throw err;
  }
}
