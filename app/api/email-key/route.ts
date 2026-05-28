import { NextRequest, NextResponse } from "next/server";
import { getClaimedKey } from "@/lib/keys";
import { sendKeyEmail } from "@/lib/email";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json(
      { error: "Session expired. Please verify your email again." },
      { status: 401 }
    );
  }

  const apiKey = await getClaimedKey(session.email);
  if (!apiKey) {
    return NextResponse.json(
      { error: "No key found for your account." },
      { status: 404 }
    );
  }

  try {
    await sendKeyEmail(session.email, apiKey);
  } catch (err) {
    console.error("Failed to send key email:", err);
    return NextResponse.json(
      { error: "Could not send the email. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
