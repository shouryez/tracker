import Link from "next/link";
import { ButtonArrow, Logo, Starfield, buttonClasses } from "@upsolve/ui";
import { Meteors } from "@/components/fx/decor";

/** A ghost drawn in pixels, floating in an empty orbit. */
function PixelGhost() {
  const rows = ["0011100", "0111110", "1101011", "1111111", "1111111", "1010101"];
  return (
    <span aria-hidden="true" className="relative grid size-40 place-items-center">
      <span className="absolute inset-0 rounded-full border border-dashed border-white/15" />
      <span className="absolute inset-6 rounded-full border border-white/10" />
      <span className="grid animate-float grid-cols-7 gap-[3px] motion-reduce:animate-none">
        {rows.flatMap((r, y) =>
          [...r].map((c, x) => (
            <i
              key={`${x}-${y}`}
              className={c === "1" ? "size-2.5 rounded-[2px] bg-white/80" : "size-2.5"}
            />
          )),
        )}
      </span>
      <i className="absolute top-3 right-6 size-2 rounded-[2px] bg-signal shadow-[0_0_10px_var(--signal)]" />
    </span>
  );
}

export default function ProfileNotFound() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#08080d] px-4 text-center text-white">
      <Starfield className="opacity-70" />
      <Meteors count={4} />
      <div className="relative flex flex-col items-center">
        <Link href="/" aria-label="DsaKaro home" className="mb-10 text-white">
          <Logo />
        </Link>
        <PixelGhost />
        <h1 className="mt-8 mb-3 font-display text-[clamp(40px,6vw,56px)] leading-none tracking-[-0.02em]">
          No profile here. <em className="text-signal">Yet.</em>
        </h1>
        <p className="mb-8 text-white/70">This profile doesn&apos;t exist or isn&apos;t public.</p>
        <div className="flex flex-wrap justify-center gap-2.5">
          <Link href="/login" className={buttonClasses({ variant: "signal" })}>
            Create yours <ButtonArrow />
          </Link>
          <Link
            href="/"
            className="inline-flex h-[42px] items-center rounded-full border border-white/15 bg-white/5 px-[18px] text-14 font-[550] text-white transition-colors hover:bg-white/10"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
