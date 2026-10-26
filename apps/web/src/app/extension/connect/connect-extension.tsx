"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, Puzzle } from "lucide-react";
import { Button, ButtonArrow, Card, buttonClasses } from "@upsolve/ui";
import { createExtensionToken } from "@/app/actions/extension";

// Must match apps/extension/entrypoints/web-bridge.content.ts.
const WEB = "upsolve-web";
const EXT = "upsolve-ext";

type State = "detecting" | "missing" | "ready" | "connecting" | "connected" | "error";

function browserLabel() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Brave/.test(ua) ? "Brave" : "Chrome";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS/.test(ua)
      ? "macOS"
      : /Linux/.test(ua)
        ? "Linux"
        : "";
  return os ? `${browser} on ${os}` : browser;
}

/** Waits for one message of `type` from the extension's bridge script. */
function waitFor(type: string, timeoutMs: number) {
  return new Promise<Record<string, unknown> | null>((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve(null);
    }, timeoutMs);
    function onMessage(e: MessageEvent) {
      if (e.source !== window || e.origin !== window.location.origin) return;
      const data = e.data as Record<string, unknown> | null;
      if (data?.source !== EXT || data.type !== type) return;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(data);
    }
    window.addEventListener("message", onMessage);
  });
}

export function ConnectExtension() {
  const [state, setState] = useState<State>("detecting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // The bridge may load a moment after the page; ask a few times.
      for (let i = 0; i < 4 && !cancelled; i++) {
        const reply = waitFor("pong", 600);
        window.postMessage({ source: WEB, type: "ping" }, window.location.origin);
        if (await reply) {
          if (!cancelled) setState("ready");
          return;
        }
      }
      if (!cancelled) setState("missing");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function connect() {
    setState("connecting");
    setError(null);
    const result = await createExtensionToken(browserLabel());
    if (!result.ok) {
      setError(result.error);
      setState("error");
      return;
    }
    const ack = waitFor("connected", 4000);
    window.postMessage(
      { source: WEB, type: "connect", token: result.token },
      window.location.origin,
    );
    if (await ack) {
      setState("connected");
    } else {
      setError("The extension didn't respond. Reload this page and try again.");
      setState("error");
    }
  }

  if (state === "connected") {
    return (
      <Card className="flex flex-col items-start gap-4">
        <p className="flex items-center gap-2 text-[17px] font-[550]">
          <BadgeCheck className="text-ok" size={20} aria-hidden="true" /> Extension connected
        </p>
        <p className="text-[13.5px] text-ink-2">
          Open any LeetCode or GFG problem. The timer starts on its own, and your LeetCode history
          import starts the next time you&apos;re on leetcode.com.
        </p>
        <Link href="/dashboard" className={buttonClasses({ variant: "signal" })}>
          Go to dashboard <ButtonArrow />
        </Link>
      </Card>
    );
  }

  if (state === "missing") {
    return (
      <Card className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-[17px] font-[550]">
          <Puzzle size={18} aria-hidden="true" /> Extension not found in this browser
        </p>
        <ol className="list-decimal space-y-1.5 pl-5 text-[13.5px] text-ink-2">
          <li>
            Build it:{" "}
            <code className="font-mono text-ink">pnpm --filter @upsolve/extension build</code>
          </li>
          <li>
            Open <code className="font-mono text-ink">chrome://extensions</code> and turn on
            Developer mode.
          </li>
          <li>
            Click <b>Load unpacked</b> and pick{" "}
            <code className="font-mono text-ink">apps/extension/.output/chrome-mv3</code>.
          </li>
          <li>Come back and reload this page.</li>
        </ol>
        <Button variant="secondary" className="self-start" onClick={() => window.location.reload()}>
          I&apos;ve installed it, check again
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-start gap-4">
      <p className="text-[13.5px] text-ink-2">
        {state === "detecting" ? "Looking for the extension…" : "Extension found in this browser."}
      </p>
      <Button
        variant="signal"
        onClick={connect}
        disabled={state === "detecting" || state === "connecting"}
      >
        {state === "connecting" ? "Connecting…" : "Connect this browser"} <ButtonArrow />
      </Button>
      {error && (
        <p role="alert" className="text-[13px] text-bad">
          {error}
        </p>
      )}
    </Card>
  );
}
