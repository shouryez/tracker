"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { Button, ButtonArrow, inputClasses } from "@upsolve/ui";
import { safeNextPath } from "@/lib/safe-next";

// The Supabase client is ~67 KB gzipped and only needed once a button is pressed: it loads
// after the page is up (or on the first press), not with the page.
const supabase = () => import("@/lib/supabase/client").then((m) => m.createClient());

/** Seconds between sign-in emails (Supabase refuses a second one sooner anyway). */
const COOLDOWN_S = 60;
const COOLDOWN_KEY = "dsakaro:link-sent-at";

/** Supabase's email errors, in words people can act on. */
function friendlyError(message: string): { text: string; wait?: number } {
  const after = /after (\d+) seconds?/i.exec(message);
  if (after)
    return {
      text: "A link was just sent. Check your inbox, or try again shortly.",
      wait: Number(after[1]),
    };
  if (/rate limit|too many|over_email_send_rate_limit/i.test(message))
    return {
      text: "We're sending a lot of sign-in emails right now. Continue with Google above (instant), or try the email link again in a few minutes.",
    };
  return { text: message };
}

/** Seconds left before another link can be sent (survives a refresh). */
function cooldownLeft(): number {
  try {
    const at = Number(sessionStorage.getItem(COOLDOWN_KEY) ?? 0);
    return Math.max(0, Math.ceil((at + COOLDOWN_S * 1000 - Date.now()) / 1000));
  } catch {
    return 0;
  }
}

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string }
  | { kind: "no-account"; email: string };

export function LoginForm({ mode, disabled }: { mode: "login" | "signup"; disabled: boolean }) {
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [email, setEmail] = useState(() => params.get("email") ?? "");
  const [status, setStatus] = useState<Status>(
    params.get("error")
      ? { kind: "error", message: "That sign-in link didn't work. Try again." }
      : { kind: "idle" },
  );

  // Countdown until another link may be sent; ticks only while it's running.
  const [wait, setWait] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads sessionStorage once on mount
    setWait(cooldownLeft());
  }, []);
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait(cooldownLeft()), 1000);
    return () => clearTimeout(id);
  }, [wait]);
  const startCooldown = (seconds = COOLDOWN_S) => {
    try {
      sessionStorage.setItem(COOLDOWN_KEY, String(Date.now() - (COOLDOWN_S - seconds) * 1000));
    } catch {
      // Storage blocked: the countdown still runs for this page.
    }
    setWait(seconds);
  };

  useEffect(() => {
    const id = setTimeout(() => void supabase(), 1500);
    return () => clearTimeout(id);
  }, []);

  function callbackUrl() {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function signInWithGoogle() {
    setStatus({ kind: "sending" });
    const { error } = await (
      await supabase()
    ).auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    // On success the browser navigates away to Google.
    if (error) setStatus({ kind: "error", message: error.message });
  }

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendLink(email.trim());
  }

  async function sendLink(address: string) {
    if (!address || cooldownLeft() > 0) return;
    setStatus({ kind: "sending" });
    const { error } = await (
      await supabase()
    ).auth.signInWithOtp({
      email: address,
      // Signing in never creates an account; that's what sign-up is for.
      options: { emailRedirectTo: callbackUrl(), shouldCreateUser: mode === "signup" },
    });
    if (error && mode === "login" && /signups? not allowed|user not found/i.test(error.message)) {
      setStatus({ kind: "no-account", email: address });
      return;
    }
    if (error) {
      const f = friendlyError(error.message);
      if (f.wait) startCooldown(f.wait);
      setStatus({ kind: "error", message: f.text });
      return;
    }
    startCooldown();
    setStatus({ kind: "sent", email: address });
  }

  if (status.kind === "sent") {
    return (
      <div role="status" className="flex flex-col items-center py-4 text-center">
        <span
          aria-hidden="true"
          className="relative mb-4 grid size-16 animate-[pop-in_var(--dur-slower)_var(--ease-spring)] place-items-center rounded-[18px] bg-signal text-signal-ink shadow-glow-signal"
        >
          <Mail size={26} />
          <span className="absolute -top-1 -right-1 size-4 animate-ping rounded-full bg-violet opacity-70" />
        </span>
        <p className="text-20 font-[600]">
          Check your <em className="font-display font-normal">inbox.</em>
        </p>
        <p className="mt-1 text-sm text-ink-2">
          We sent a {mode === "login" ? "sign-in" : "sign-up"} link to{" "}
          <span className="text-ink">{status.email}</span>. Open it in this browser.
        </p>
        <p className="mt-2 text-12 text-ink-3">Not there? Check spam or Promotions.</p>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <button
            type="button"
            disabled={wait > 0}
            onClick={() => void sendLink(status.email)}
            className="tnum font-[550] text-ink underline-offset-4 hover:underline disabled:font-normal disabled:text-ink-3 disabled:no-underline"
          >
            {wait > 0 ? `Resend in ${wait}s` : "Resend link"}
          </button>
          <button
            type="button"
            onClick={() => setStatus({ kind: "idle" })}
            className="text-ink-2 underline-offset-4 hover:text-ink hover:underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  const busy = status.kind === "sending";

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={signInWithGoogle}
        disabled={disabled || busy}
      >
        <GoogleIcon />
        {mode === "login" ? "Sign in with Google" : "Sign up with Google"}
      </Button>

      <div className="flex items-center gap-3 label-mono">
        <span className="h-px flex-1 bg-line-2" />
        or email
        <span className="h-px flex-1 bg-line-2" />
      </div>

      <form onSubmit={sendMagicLink} className="flex flex-col gap-2.5">
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
        <span className="relative">
          <Mail
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3"
          />
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@college.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={disabled || busy}
            aria-invalid={status.kind === "error" || undefined}
            aria-describedby={status.kind === "error" ? "login-error" : undefined}
            className={inputClasses({
              icon: true,
              error: status.kind === "error",
              className: "h-[46px]",
            })}
          />
        </span>
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={disabled || wait > 0}
          loading={busy}
        >
          {wait > 0 ? (
            <span className="tnum">Link sent · send again in {wait}s</span>
          ) : (
            <>
              {mode === "login" ? "Email me a sign-in link" : "Create account with email"}{" "}
              <ButtonArrow />
            </>
          )}
        </Button>
      </form>

      {status.kind === "no-account" && (
        <p role="alert" className="text-sm text-ink-2">
          No account for <span className="text-ink">{status.email}</span> yet.{" "}
          <Link
            href={`/signup?email=${encodeURIComponent(status.email)}`}
            className="font-[600] text-ink underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      )}
      {status.kind === "error" && (
        <p id="login-error" role="alert" className="text-sm text-bad">
          {status.message}
        </p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23Z"
      />
      <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8Z" />
      <path
        fill="#EA4335"
        d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4Z"
      />
    </svg>
  );
}
