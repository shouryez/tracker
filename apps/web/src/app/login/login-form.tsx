"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ButtonArrow } from "@upsolve/ui";
import { safeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/client";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

export function LoginForm({ disabled }: { disabled: boolean }) {
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>(
    params.get("error")
      ? { kind: "error", message: "That sign-in link didn't work. Try again." }
      : { kind: "idle" },
  );

  function callbackUrl() {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function signInWithGoogle() {
    setStatus({ kind: "sending" });
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    // On success the browser navigates away to Google.
    if (error) setStatus({ kind: "error", message: error.message });
  }

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    setStatus({ kind: "sending" });
    const { error } = await createClient().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: callbackUrl() },
    });
    setStatus(error ? { kind: "error", message: error.message } : { kind: "sent", email: address });
  }

  if (status.kind === "sent") {
    return (
      <div role="status" className="rounded-lg border border-line bg-surface p-5 shadow-card">
        <p className="font-[550]">Check your inbox.</p>
        <p className="mt-1 text-sm text-ink-2">
          We sent a sign-in link to <span className="text-ink">{status.email}</span>. Open it in
          this browser.
        </p>
        <button
          type="button"
          onClick={() => setStatus({ kind: "idle" })}
          className="mt-4 text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  const busy = status.kind === "sending";

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="primary"
        className="w-full"
        onClick={signInWithGoogle}
        disabled={disabled || busy}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <div className="flex items-center gap-3 font-mono text-[11px] tracking-[.08em] text-ink-3 uppercase">
        <span className="h-px flex-1 bg-line-2" />
        or email
        <span className="h-px flex-1 bg-line-2" />
      </div>

      <form onSubmit={sendMagicLink} className="flex flex-col gap-2.5">
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
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
          className="h-[44px] w-full rounded-[12px] border border-line-2 bg-surface-2 px-3.5 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-[var(--dur-base)] placeholder:text-ink-3 hover:border-line-3 focus:border-primary focus:shadow-[0_0_0_4px_var(--primary-soft)] disabled:opacity-50 aria-invalid:border-bad aria-invalid:focus:shadow-[0_0_0_4px_var(--color-bad-soft)]"
        />
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={disabled}
          loading={busy}
        >
          Email me a sign-in link <ButtonArrow />
        </Button>
      </form>

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
