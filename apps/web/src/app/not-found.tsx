import Link from "next/link";
import { ButtonArrow, Logo, buttonClasses } from "@upsolve/ui";

/** Site-wide 404. */
export default function NotFound() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <div
        aria-hidden="true"
        className="dots absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_45%,#000,transparent)]"
      />
      <div className="relative flex flex-col items-center text-center">
        <Link href="/" aria-label="Upsolve home" className="mb-10">
          <Logo />
        </Link>
        <p className="num bg-[linear-gradient(180deg,var(--ink),var(--ink-3))] bg-clip-text text-[clamp(96px,22vw,200px)] text-transparent">
          404
        </p>
        <h1 className="mt-2 font-display text-[clamp(28px,4vw,44px)] leading-none tracking-[-0.02em]">
          <span className="text-ink-3">Wrong answer.</span> <em>Let&apos;s upsolve it.</em>
        </h1>
        <p className="mt-3 max-w-[40ch] text-[14.5px] text-ink-2">
          This page doesn&apos;t exist, or the link has expired.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          <Link href="/dashboard" className={buttonClasses({ variant: "signal" })}>
            Go to your dashboard <ButtonArrow />
          </Link>
          <Link href="/" className={buttonClasses({ variant: "secondary" })}>
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
