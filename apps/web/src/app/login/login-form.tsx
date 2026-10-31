"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button, ButtonArrow, inputClasses } from "@upsolve/ui";
import { OtpInput } from "@/components/otp-input";
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
      ? {
          kind: "error",
          message:
            "That sign-in link didn't work in this browser. Send a new code and type it here instead.",
        }
      : { kind: "idle" },
  );

  // Password sign-in, for accounts that verified their email once and then set a password
  // in Settings. Sign-up never uses a password, so every password account is verified.
  const [withPassword, setWithPassword] = useState(false);
  const [password, setPasswordValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!address || !password) return;
    setStatus({ kind: "sending" });
    const { error } = await (
      await supabase()
    ).auth.signInWithPassword({ email: address, password });
    if (error) {
      const code = error.code ?? error.message;
      setStatus({
        kind: "error",
        message: /invalid_credentials|invalid login credentials/i.test(code)
          ? "Wrong email or password. No password yet? Sign in once with Google or an email link, then add one in Settings → Password."
          : /email_not_confirmed|not confirmed/i.test(code)
            ? "Verify your email first: sign in once with Google or an email link."
            : friendlyError(error.message).text,
      });
      return;
    }
    // A full page load, so the server sees the new session cookies.
    window.location.assign(next);
  }

  // The emailed code: works on any device or browser, unlike the link, which needs the
  // browser that asked for it (and can be used up by an email scanner opening it first).
  const [code, setCode] = useState("");
  const [codeLength, setCodeLength] = useState(6);
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  async function verifyCode(address: string, token: string) {
    const clean = token.replace(/\D/g, "");
    if (clean.length < codeLength) return;
    setVerifying(true);
    setCodeError(null);
    const auth = (await supabase()).auth;
    let { error } = await auth.verifyOtp({ email: address, token: clean, type: "email" });
    // Codes made for a brand-new account can need the sign-up type.
    if (error) ({ error } = await auth.verifyOtp({ email: address, token: clean, type: "signup" }));
    if (error) {
      setVerifying(false);
      setCodeError(
        /expired|invalid/i.test(error.message)
          ? "That code didn't work. It may have expired: check it, or send a new one."
          : friendlyError(error.message).text,
      );
      return;
    }
    // A full page load, so the server sees the new session cookies.
    window.location.assign(next);
  }

  async function sendLink(address: string) {
    if (!address || cooldownLeft() > 0) return;
    setStatus({ kind: "sending" });
    // Our own email (with the 6-digit code), not Supabase's template.
    const res = await fetch("/api/auth/email-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: address, mode, next }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as {
      ok?: boolean;
      noAccount?: boolean;
      error?: string;
      wait?: number;
      length?: number;
    } | null;
    if (body?.noAccount) {
      setStatus({ kind: "no-account", email: address });
      return;
    }
    if (!res?.ok || !body?.ok) {
      if (body?.wait) startCooldown(body.wait);
      setStatus({
        kind: "error",
        message: body?.error ?? "Couldn't send the code. Check your connection and try again.",
      });
      return;
    }
    if (body.length && body.length >= 4 && body.length <= 10) setCodeLength(body.length);
    setCode("");
    setCodeError(null);
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
          We sent a code to <span className="text-ink">{status.email}</span>. Type it here, or open
          the link in the email.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verifyCode(status.email, code);
          }}
          className="mt-6 flex w-full max-w-[360px] flex-col gap-3"
        >
          <OtpInput
            length={codeLength}
            value={code}
            onChange={(v) => {
              setCode(v);
              setCodeError(null);
            }}
            // Last digit typed, pasted or autofilled: sign in straight away.
            onComplete={(v) => void verifyCode(status.email, v)}
            error={Boolean(codeError)}
            describedBy={codeError ? "otp-error" : undefined}
          />
          <Button
            type="submit"
            variant="primary"
            loading={verifying}
            disabled={code.length < codeLength}
          >
            {mode === "login" ? "Sign in" : "Create account"} <ButtonArrow />
          </Button>
          {codeError && (
            <p id="otp-error" role="alert" className="text-13 text-bad">
              {codeError}
            </p>
          )}
        </form>
        <p className="mt-3 text-12 text-ink-3">Not there? Check spam or Promotions.</p>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <button
            type="button"
            disabled={wait > 0}
            onClick={() => void sendLink(status.email)}
            className="tnum font-[550] text-ink underline-offset-4 hover:underline disabled:font-normal disabled:text-ink-3 disabled:no-underline"
          >
            {wait > 0 ? `Resend in ${wait}s` : "Send a new code"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus({ kind: "idle" });
              setCode("");
              setCodeError(null);
            }}
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

      <form
        onSubmit={withPassword ? signInWithPassword : sendMagicLink}
        className="flex flex-col gap-2.5"
      >
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
            autoComplete={withPassword ? "username" : "email"}
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
        {withPassword && (
          <span className="relative">
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <Lock
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3"
            />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
              disabled={disabled || busy}
              aria-invalid={status.kind === "error" || undefined}
              className={inputClasses({
                icon: true,
                error: status.kind === "error",
                className: "h-[46px] pr-11",
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:text-ink"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </span>
        )}
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={disabled || (!withPassword && wait > 0)}
          loading={busy}
        >
          {withPassword ? (
            <>
              Sign in <ButtonArrow />
            </>
          ) : wait > 0 ? (
            <span className="tnum">Link sent · send again in {wait}s</span>
          ) : (
            <>
              {mode === "login" ? "Email me a sign-in code" : "Create account with email"}{" "}
              <ButtonArrow />
            </>
          )}
        </Button>
      </form>

      {mode === "login" && (
        <div className="-mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-13">
          <button
            type="button"
            onClick={() => {
              setWithPassword((w) => !w);
              setStatus({ kind: "idle" });
            }}
            className="font-[550] text-ink-2 underline-offset-4 hover:text-ink hover:underline"
          >
            {withPassword ? "Email me a code instead" : "Use a password instead"}
          </button>
          {withPassword && (
            <button
              type="button"
              onClick={() => {
                setWithPassword(false);
                setStatus({ kind: "idle" });
              }}
              title="Sign in with an email link, then set a new password in Settings → Password"
              className="text-ink-3 underline-offset-4 hover:text-ink hover:underline"
            >
              Forgot password?
            </button>
          )}
        </div>
      )}

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
