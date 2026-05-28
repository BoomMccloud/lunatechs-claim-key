import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const PEPPER = process.env.OTP_PEPPER;

if (!PEPPER) {
  throw new Error("OTP_PEPPER is not set");
}

export const OTP_TTL_MS = 10 * 60 * 1000;
export const MAX_OTP_ATTEMPTS = 5;

export function generateOtp(): string {
  // 6-digit code, zero-padded.
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtp(code: string): string {
  return createHmac("sha256", PEPPER as string).update(code).digest("hex");
}

export function verifyOtp(code: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashOtp(code));
  const expected = Buffer.from(storedHash);
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
