import { sql } from "./db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 10;

// Counts OTP requests in the trailing window for this email and IP, using the
// claim_otps insert history as the source of truth. Returns true if either limit
// is exceeded.
export async function isRateLimited(email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);

  const [byEmail] = await sql<{ count: string }[]>`
    SELECT count(*)::text AS count FROM claim_otps
    WHERE email = ${email} AND created_at >= ${since}
  `;
  if (Number(byEmail.count) >= MAX_PER_EMAIL) return true;

  const [byIp] = await sql<{ count: string }[]>`
    SELECT count(*)::text AS count FROM claim_otps
    WHERE ip = ${ip} AND created_at >= ${since}
  `;
  if (Number(byIp.count) >= MAX_PER_IP) return true;

  return false;
}
