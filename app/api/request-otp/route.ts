import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import { generateOtp, hashOtp, OTP_TTL_MS } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { isRateLimited } from "@/lib/ratelimit";
import { requestOtpSchema } from "@/lib/validation";

export const runtime = "nodejs";

const ACCESS_CODE = process.env.EVENT_ACCESS_CODE;

function accessCodeMatches(input: string): boolean {
  if (!ACCESS_CODE) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(ACCESS_CODE);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = requestOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please enter a valid email and access code." },
      { status: 400 }
    );
  }

  const { email, accessCode } = parsed.data;

  if (!accessCodeMatches(accessCode)) {
    return NextResponse.json(
      { error: "Incorrect event access code." },
      { status: 403 }
    );
  }

  const ip = clientIp(req);
  if (await isRateLimited(email, ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await sql`
    INSERT INTO claim_otps (email, ip, code_hash, expires_at)
    VALUES (${email}, ${ip}, ${hashOtp(code)}, ${expiresAt})
  `;

  try {
    await sendOtpEmail(email, code);
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    return NextResponse.json(
      { error: "Could not send the verification email. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
