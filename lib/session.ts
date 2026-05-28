import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.SESSION_SECRET;

if (!SECRET) {
  throw new Error("SESSION_SECRET is not set");
}

export const SESSION_COOKIE = "claim_session";
export const SESSION_TTL_MS = 15 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", SECRET as string).update(payload).digest("base64url");
}

// Token format: base64url(JSON{email,exp}).signature
export function createSession(email: string): string {
  const payload = JSON.stringify({ email, exp: Date.now() + SESSION_TTL_MS });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function readSession(token: string | undefined): { email: string } | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { email, exp } = JSON.parse(
      Buffer.from(encoded, "base64url").toString()
    );
    if (typeof email !== "string" || typeof exp !== "number") return null;
    if (Date.now() > exp) return null;
    return { email };
  } catch {
    return null;
  }
}
