import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Event Keys <onboarding@resend.dev>";
const isProd = process.env.NODE_ENV === "production";

const resend = apiKey ? new Resend(apiKey) : null;

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (!resend) {
    if (isProd) throw new Error("RESEND_API_KEY is not configured");
    // Dev fallback: surface the code in the server console.
    console.log(`[dev] OTP for ${to}: ${code}`);
    return;
  }

  await resend.emails.send({
    from,
    to,
    subject: `Your verification code: ${code}`,
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your verification code is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px;">${code}</p>
<p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}

export async function sendKeyEmail(to: string, apiKeyValue: string): Promise<void> {
  if (!resend) {
    if (isProd) throw new Error("RESEND_API_KEY is not configured");
    console.log(`[dev] API key for ${to}: ${apiKeyValue}`);
    return;
  }

  await resend.emails.send({
    from,
    to,
    subject: "Your API key",
    text: `Here is your API key:\n\n${apiKeyValue}\n\nKeep it secret. Treat it like a password.`,
    html: `<p>Here is your API key:</p>
<pre style="font-family:ui-monospace,Menlo,monospace;background:#f4f4f5;padding:12px;border-radius:8px;word-break:break-all;">${apiKeyValue}</pre>
<p>Keep it secret. Treat it like a password.</p>`,
  });
}
