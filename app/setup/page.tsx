"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OS = "mac" | "windows";

const BASE_URL =
  "http://pg-2ze04xx741gxs07re-pub.polardbaigateway.rds.aliyuncs.com:8000/v1";
const MODEL = "deepseek-v4-pro";

function configJson(apiKey: string) {
  return `{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "lunatechs": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "LunaTechs DeepSeek",
      "options": {
        "baseURL": "${BASE_URL}",
        "apiKey": "${apiKey}"
      },
      "models": {
        "${MODEL}": { "name": "DeepSeek V4 Pro" }
      }
    }
  }
}`;
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="code">
      <pre>{code}</pre>
      <button type="button" className="copy" onClick={copy}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function Shot({ src, alt }: { src: string; alt: string }) {
  const [missing, setMissing] = useState(false);
  return (
    <figure className="shot">
      {missing ? (
        <div className="shot-placeholder">
          <span>📷</span>
          <small>Screenshot: {alt}</small>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} onError={() => setMissing(true)} />
      )}
      <figcaption>{alt}</figcaption>
    </figure>
  );
}

export default function Setup() {
  const [os, setOs] = useState<OS>("mac");
  const [apiKey, setApiKey] = useState("YOUR_API_KEY");

  useEffect(() => {
    try {
      const k = sessionStorage.getItem("claimedApiKey");
      if (k) setApiKey(k);
    } catch {}
    if (/win/i.test(navigator.userAgent)) setOs("windows");
  }, []);

  const installCmd =
    os === "mac"
      ? "brew install sst/tap/opencode"
      : "winget install --id=sst.opencode";

  return (
    <main>
      <div className="card wide">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lunatechs-logo.png" alt="LunaTechs" />
          <p className="eyebrow">Set up OpenCode</p>
        </div>

        <h1>Start coding with AI in 4 steps</h1>
        <p className="subtitle">
          OpenCode is a free AI coding assistant for your terminal. Follow these
          steps from start to finish — no experience needed.
        </p>

        <div className="tabs">
          <button
            type="button"
            className={os === "mac" ? "tab active" : "tab"}
            onClick={() => setOs("mac")}
          >
            Mac
          </button>
          <button
            type="button"
            className={os === "windows" ? "tab active" : "tab"}
            onClick={() => setOs("windows")}
          >
            Windows
          </button>
        </div>

        <ol className="steps">
          <li>
            <h2>Open the terminal</h2>
            {os === "mac" ? (
              <p>
                Press <kbd>⌘</kbd> + <kbd>Space</kbd>, type{" "}
                <strong>Terminal</strong>, and press <kbd>Enter</kbd>.
              </p>
            ) : (
              <p>
                Press the <kbd>Windows</kbd> key, type{" "}
                <strong>PowerShell</strong>, and press <kbd>Enter</kbd>.
              </p>
            )}
            <Shot
              src={os === "mac" ? "/setup/mac-terminal.png" : "/setup/win-powershell.png"}
              alt={os === "mac" ? "Opening Terminal on Mac" : "Opening PowerShell on Windows"}
            />
          </li>

          <li>
            <h2>Install OpenCode</h2>
            <p>Copy the line below, paste it into the terminal, and press <kbd>Enter</kbd>.</p>
            <CodeBlock code={installCmd} />
            <p className="hint">
              {os === "mac"
                ? "If it says “brew: command not found”, first install Homebrew from brew.sh, then run the line again."
                : "If winget isn’t found, update “App Installer” from the Microsoft Store, then run the line again."}
            </p>
          </li>

          <li>
            <h2>Add your AI connection</h2>
            <p>
              In the same terminal, create a settings file with your key already
              filled in. Copy and paste this whole block:
            </p>
            <CodeBlock
              code={
                os === "mac"
                  ? `mkdir -p ~/.config/opencode && cat > ~/.config/opencode/opencode.json << 'EOF'\n${configJson(apiKey)}\nEOF`
                  : `$dir = "$env:USERPROFILE\\.config\\opencode"; New-Item -ItemType Directory -Force -Path $dir | Out-Null; @'\n${configJson(apiKey)}\n'@ | Set-Content "$dir\\opencode.json"`
              }
            />
            {apiKey === "YOUR_API_KEY" && (
              <p className="hint warn">
                We couldn’t find your key automatically. Replace{" "}
                <code>YOUR_API_KEY</code> above with the key you claimed.
              </p>
            )}
          </li>

          <li>
            <h2>Start coding</h2>
            <p>Go to a project folder and launch OpenCode:</p>
            <CodeBlock code={"opencode"} />
            <p>
              Press <kbd>Tab</kbd> to pick a model, choose{" "}
              <strong>LunaTechs DeepSeek → DeepSeek V4 Pro</strong>, then type what
              you want to build. That’s it!
            </p>
            <Shot src="/setup/opencode-model.png" alt="Selecting DeepSeek V4 Pro in OpenCode" />
          </li>
        </ol>

        <Link href="/" className="cta-link">
          ← Back to your key
        </Link>

        <p className="footer">
          <b>DeepSeek</b> × <b>OpenCode</b> · sponsored by <b>Alibaba Cloud</b>
        </p>
      </div>
    </main>
  );
}
