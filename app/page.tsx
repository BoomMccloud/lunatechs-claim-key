"use client";

import { useState } from "react";
import Link from "next/link";

type Step = "request" | "verify" | "done";

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export default function Home() {
  const [step, setStep] = useState<Step>("request");
  const [accessCode, setAccessCode] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    const { ok, data } = await postJson("/api/request-otp", { email, accessCode });
    setLoading(false);
    if (!ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setStep("verify");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { ok, data } = await postJson("/api/verify-otp", { email, code });
    setLoading(false);
    if (!ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setApiKey(data.apiKey);
    try {
      sessionStorage.setItem("claimedApiKey", data.apiKey);
    } catch {}
    setStep("done");
  }

  async function copyKey() {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function emailKey() {
    setError("");
    setNotice("");
    setLoading(true);
    const { ok, data } = await postJson("/api/email-key");
    setLoading(false);
    if (!ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setNotice(`Sent to ${email}.`);
  }

  return (
    <main>
      <div className="card">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lunatechs-logo.png" alt="LunaTechs" />
          <p className="eyebrow">AI Vibe Coding</p>
        </div>

        {step === "request" && (
          <form onSubmit={requestOtp}>
            <h1>Claim your API key</h1>
            <p className="subtitle">
              Enter the event access code and your email. We&apos;ll send you a
              verification code.
            </p>
            <div className="field">
              <label htmlFor="accessCode">Event access code</label>
              <input
                id="accessCode"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send verification code"}
            </button>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={verifyOtp}>
            <h1>Enter your code</h1>
            <p className="subtitle">
              We sent a 6-digit code to <strong>{email}</strong>. It expires in 10
              minutes.
            </p>
            <div className="field">
              <label htmlFor="code">Verification code</label>
              <input
                id="code"
                className="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                autoComplete="one-time-code"
                autoFocus
                required
              />
            </div>
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6}>
              {loading ? "Verifying…" : "Verify & claim key"}
            </button>
            <button
              type="button"
              className="link"
              onClick={() => {
                setStep("request");
                setCode("");
                setError("");
              }}
            >
              Use a different email
            </button>
          </form>
        )}

        {step === "done" && (
          <div>
            <h1>Your API key</h1>
            <p className="subtitle">
              Keep it secret — treat it like a password.
            </p>
            <div className="keybox">{apiKey}</div>
            <div className="row">
              <button type="button" onClick={copyKey}>
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={emailKey}
                disabled={loading}
              >
                {loading ? "Sending…" : "Email it to me"}
              </button>
            </div>
            {error && <p className="error">{error}</p>}
            {notice && <p className="notice">{notice}</p>}
            <Link href="/setup" className="cta-link">
              Next: set up OpenCode →
            </Link>
          </div>
        )}

        <p className="footer">
          Already have a key?{" "}
          <Link href="/setup" className="footer-link">
            Set up OpenCode
          </Link>
        </p>
        <p className="footer">
          <b>DeepSeek</b> × <b>OpenCode</b> · sponsored by <b>Alibaba Cloud</b>
        </p>
      </div>
    </main>
  );
}
