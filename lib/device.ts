import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

const SECRET = process.env.SESSION_SECRET;

if (!SECRET) {
  throw new Error("SESSION_SECRET is not set");
}

export const DEVICE_COOKIE = "claim_device";
export const DEVICE_TTL_MS = 365 * 24 * 60 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", SECRET as string).update(payload).digest("base64url");
}

// Token format: randomId.signature — the signature stops users from forging a
// fresh id, so clearing the cookie is the only way around the device block.
export function createDeviceToken(): { token: string; id: string } {
  const id = randomBytes(16).toString("base64url");
  return { token: `${id}.${sign(id)}`, id };
}

export function readDeviceId(token: string | undefined): string | null {
  if (!token) return null;
  const [id, signature] = token.split(".");
  if (!id || !signature) return null;

  const expected = sign(id);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return id;
}
