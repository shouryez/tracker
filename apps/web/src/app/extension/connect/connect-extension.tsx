"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MonitorSmartphone, Puzzle } from "lucide-react";
import { Button, ButtonArrow, Card, CheckDraw, LogoMark, buttonClasses, cn } from "@upsolve/ui";
import { createExtensionToken } from "@/app/actions/extension";
import { CelebrateOnce } from "@/components/dashboard/celebrate";

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
      <Card tier="hero" beam className="flex flex-col items-start gap-4">
        <CelebrateOnce id="extension-connected" />
        <Link2 state="connected" />
        <p className="text-20 font-[600]">
          Connected: <em className="font-display font-normal">{browserLabel()}</em>
        </p>
        <p className="text-[13.5px] text-white/75">
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
        <p className="flex items-center gap-2.5 text-[17px] font-[600]">
          <span className="grid size-9 place-items-center rounded-[11px] border border-line bg-surface-2">
            <Puzzle size={17} aria-hidden="true" />
          </span>
          Extension not found in this browser
        </p>
        <ol className="flex flex-col gap-2.5 text-[13.5px] text-ink-2 [counter-reset:step] [&>li]:surface-inset [&>li]:relative [&>li]:rounded-[12px] [&>li]:py-2.5 [&>li]:pr-3 [&>li]:pl-11 [&>li]:[counter-increment:step] [&>li]:before:absolute [&>li]:before:top-2.5 [&>li]:before:left-3 [&>li]:before:grid [&>li]:before:size-5 [&>li]:before:place-items-center [&>li]:before:rounded-full [&>li]:before:bg-violet-soft [&>li]:before:font-mono [&>li]:before:text-11 [&>li]:before:text-violet [&>li]:before:content-[counter(step)]">
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
    <Card className="flex flex-col items-center gap-5 py-8 text-center">
      <Link2 state={state === "detecting" ? "searching" : "found"} />
      <p className="text-14 text-ink-2" aria-live="polite">
        {state === "detecting" ? "Looking for the extension…" : "Extension found in this browser."}
      </p>
      <Button
        variant="signal"
        size="lg"
        onClick={connect}
        disabled={state === "detecting"}
        loading={state === "connecting"}
      >
        Connect this browser <ButtonArrow />
      </Button>
      {error && (
        <p role="alert" className="text-[13px] text-bad">
          {error}
        </p>
      )}
    </Card>
  );
}

/** Browser ↔ DsaKaro: a radar pulse while searching, a beam once found, a check when linked. */
function Link2({ state }: { state: "searching" | "found" | "connected" }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-3">
      <span className="relative grid size-14 place-items-center rounded-[16px] border border-line-2 bg-surface-2 text-ink">
        <MonitorSmartphone size={22} />
        {state === "searching" && (
          <>
            <span className="absolute inset-0 animate-[radar_1.6s_var(--ease-out)_infinite] rounded-[16px] border-2 border-violet" />
            <span className="absolute inset-0 animate-[radar_1.6s_var(--ease-out)_0.8s_infinite] rounded-[16px] border-2 border-violet" />
          </>
        )}
      </span>
      <span className="relative h-[3px] w-20 overflow-hidden rounded-full bg-line-2">
        <span
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,var(--violet),var(--signal))] transition-[width] duration-[var(--dur-slower)]",
            state === "searching" ? "w-0" : "w-full",
          )}
        />
        {state === "found" && (
          <span className="absolute inset-y-0 w-6 animate-[beam-slide_1.4s_linear_infinite] bg-white/80 blur-[2px]" />
        )}
      </span>
      <span
        className={cn(
          "grid size-14 place-items-center rounded-[16px] border",
          state === "connected"
            ? "border-transparent bg-signal text-signal-ink shadow-glow-signal"
            : "border-line-2 bg-surface-2",
        )}
      >
        {state === "connected" ? <CheckDraw size={24} /> : <LogoMark size={24} />}
      </span>
    </div>
  );
}
