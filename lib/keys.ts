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
    SELECT api_key FROM claim_keys WHERE claimed_by_email = ${email} LIMIT 1
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

// Allocates an unclaimed key to the email and returns it. Idempotent: if the email
// already has a key, returns that one. Throws PoolEmptyError when nothing is left.
export async function claimKey(email: string): Promise<string> {
  const existing = await getClaimedKey(email);
  if (existing) return existing;

  try {
    const [row] = await sql<{ api_key: string }[]>`
      UPDATE claim_keys
      SET claimed_by_email = ${email}, claimed_at = now()
      WHERE id = (
        SELECT id FROM claim_keys
        WHERE claimed_by_email IS NULL
        ORDER BY id
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING api_key
    `;
    if (!row) throw new PoolEmptyError();
    return row.api_key;
  } catch (err: unknown) {
    // Unique index race: another concurrent request claimed for this same email.
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      const claimed = await getClaimedKey(email);
      if (claimed) return claimed;
    }
    throw err;
  }
}
