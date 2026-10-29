"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button, cn, inputClasses } from "@upsolve/ui";
import { setPassword } from "@/app/actions/account";

/**
 * Set or change the password used for email + password sign-in. Only for verified emails:
 * the account already signed in with Google or an emailed link.
 */
export function PasswordSettings({
  email,
  hasPassword,
}: {
  email: string | null;
  hasPassword: boolean | null;
}) {
  const [pending, start] = useTransition();
  const [has, setHas] = useState(hasPassword);
  const [open, setOpen] = useState(!hasPassword);
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = again.length > 0 && pw !== again;

  function save() {
    setError(null);
    if (pw !== again) {
      setError("The two passwords don't match.");
      return;
    }
    start(async () => {
      const res = await setPassword(pw);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(has ? "Password changed" : "Password set. You can now sign in with it.");
      setHas(true);
      setOpen(false);
      setPw("");
      setAgain("");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-[11px]",
            has ? "bg-success/12 text-success" : "bg-surface-3 text-ink-3",
          )}
        >
          <KeyRound size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-14 font-[600]">{has ? "Password is set" : "No password yet"}</p>
          <p className="text-12 text-ink-3">
            {has
              ? `Sign in with ${email ?? "your email"} and your password, or keep using Google or an email link.`
              : "Add one to sign in with your email and a password, without waiting for a link."}
          </p>
        </div>
        {has && !open && (
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Change password
          </Button>
        )}
      </div>

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex flex-col gap-2.5 sm:max-w-[420px]"
        >
          {/* Lets password managers save it against the right account. */}
          <input type="email" autoComplete="username" value={email ?? ""} readOnly hidden />
          <label className="flex flex-col gap-1.5">
            <span className="text-12 font-[550] text-ink-2">
              {has ? "New password" : "Password"}
            </span>
            <span className="relative">
              <input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                minLength={8}
                maxLength={72}
                required
                className={inputClasses({ className: "h-[42px] pr-11" })}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:text-ink"
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-12 font-[550] text-ink-2">Type it again</span>
            <input
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={again}
              onChange={(e) => setAgain(e.target.value)}
              required
              aria-invalid={mismatch || undefined}
              className={inputClasses({ error: mismatch, className: "h-[42px]" })}
            />
          </label>
          <p className="text-12 text-ink-3">At least 8 characters, with a letter and a number.</p>
          {error && (
            <p role="alert" className="text-13 text-bad">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={pending}
              disabled={!pw || !again}
            >
              {has ? "Save new password" : "Set password"}
            </Button>
            {has && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                  setPw("");
                  setAgain("");
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
