import Link from "next/link";
import { ButtonArrow, Logo, buttonClasses } from "@upsolve/ui";

export default function ProfileNotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <Logo className="mb-10" />
        <h1 className="mb-3 font-display text-[44px] leading-none tracking-[-0.02em]">
          <span className="text-ink-3">No profile here.</span> <em>Yet.</em>
        </h1>
        <p className="mb-8 text-ink-2">This profile doesn&apos;t exist or isn&apos;t public.</p>
        <Link href="/" className={buttonClasses({ variant: "primary" })}>
          Go home <ButtonArrow />
        </Link>
      </div>
    </div>
  );
}
