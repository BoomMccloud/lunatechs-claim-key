import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyOtp, MAX_OTP_ATTEMPTS } from "@/lib/otp";
import { claimKey, PoolEmptyError } from "@/lib/keys";
import { createSession, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/session";
import { verifyOtpSchema } from "@/lib/validation";

export const runtime = "nodejs";

type OtpRow = {
  id: number;
  code_hash: string;
  attempts: number;
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please enter the 6-digit code." },
      { status: 400 }
    );
  }

  const { email, code } = parsed.data;

  // Latest unconsumed, unexpired OTP for this email.
  const [otp] = await sql<OtpRow[]>`
    SELECT id, code_hash, attempts FROM claim_otps
    WHERE email = ${email} AND consumed_at IS NULL AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!otp) {
    return NextResponse.json(
      { error: "Code expired or not found. Request a new one." },
      { status: 400 }
    );
  }

  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many incorrect attempts. Request a new code." },
      { status: 429 }
    );
  }

  if (!verifyOtp(code, otp.code_hash)) {
    await sql`UPDATE claim_otps SET attempts = attempts + 1 WHERE id = ${otp.id}`;
    const remaining = MAX_OTP_ATTEMPTS - otp.attempts - 1;
    return NextResponse.json(
      {
        error:
          remaining > 0
            ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
            : "Incorrect code. Request a new one.",
      },
      { status: 400 }
    );
  }

  // Correct code: consume it and allocate a key.
  await sql`UPDATE claim_otps SET consumed_at = now() WHERE id = ${otp.id}`;

  let apiKey: string;
  try {
    apiKey = await claimKey(email);
  } catch (err) {
    if (err instanceof PoolEmptyError) {
      return NextResponse.json(
        { error: "Sorry, all API keys have been claimed." },
        { status: 409 }
      );
    }
    console.error("Failed to allocate key:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ apiKey });
  res.cookies.set(SESSION_COOKIE, createSession(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}
