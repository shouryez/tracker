import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ButtonArrow, Eyebrow, Grain, Starfield, buttonClasses, cn } from "@upsolve/ui";
import { TextReveal } from "@/components/fx/text";
import { Magnetic } from "@/components/landing/motion-bits";
import { HeroSceneLoader } from "./hero-loader";
import { Laptop, POSTER_POSE } from "./laptop";
import { CAMERA, CAPTIONS } from "./scene";
import { SCENE_SCRIPT } from "./scene-script";
import { ScreenDashboard } from "./screen-dashboard";

/**
 * Landing hero v3, "The 1 a.m. desk" (design/LANDING-V3.md). Server-rendered: the
 * headline (the LCP element), CTAs, captions and the "at a glance" head are real HTML.
 * With <html data-scene="on"> (set inline before paint) the section pins and the scroll
 * scene loads on top; otherwise it's a static poster with the captions as a stepped list.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative -mt-[68px]">
      <script dangerouslySetInnerHTML={{ __html: SCENE_SCRIPT }} />
      <div data-hero-pin className="relative scene:h-[500vh] max-sm:scene:h-[320vh]">
        <div
          data-hero-stage
          className="relative isolate overflow-hidden bg-[#08080a] pb-16 text-[#f4f4f6] scene:sticky scene:top-0 scene:h-svh scene:pb-0"
        >
          <Backdrop />

          {/* The closed laptop, server-rendered in the scene's rest pose, so the stage is never
              empty while the scene's JS loads. It cross-fades out when the scene mounts. */}
          <div data-rest-laptop className="lt-rest-wrap hidden scene:block">
            <Laptop
              pose={{ tilt: CAMERA.tiltClosed, lid: CAMERA.lidClosed, y: 0 }}
              className="lt-rest"
              screen={null}
            />
          </div>

          <a
            href="#glance"
            className="absolute bottom-5 left-5 z-20 hidden items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] tracking-[.08em] text-white/55 uppercase transition-colors hover:text-white focus-visible:text-white scene:inline-flex max-sm:bottom-12"
            data-hero-copy
          >
            Skip intro <ChevronDown size={12} aria-hidden="true" />
          </a>

          <div
            data-hero-copy
            className="relative z-10 flex flex-col items-center px-5 pt-[124px] text-center scene:absolute scene:inset-x-0 scene:top-0 sm:pt-[150px]"
          >
            <Eyebrow className="border-white/12 bg-white/5 text-white/70">
              LeetCode · Codeforces · GFG
              <span className="max-sm:hidden"> · free for students</span>
            </Eyebrow>
            <TextReveal
              text="Every problem you solve,"
              accent="remembered."
              className="mt-6 mb-5 max-w-[14ch] font-display text-[clamp(44px,8vw,100px)] leading-[.98] tracking-[-0.02em] text-balance text-white"
              accentClassName="text-white"
              id="hero-title"
            />
            <p className="mb-8 max-w-[560px] text-[clamp(15px,1.6vw,17px)] leading-relaxed text-white/70">
              DsaKaro times every problem you open, catches every verdict, ticks your Striver and
              NeetCode sheets for you, and tells you exactly what to revise before you forget it.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Magnetic>
                <Link href="/signup" className={buttonClasses({ variant: "signal", size: "lg" })}>
                  <span data-magnetic-label className="inline-flex items-center gap-2">
                    Start free with Google <ButtonArrow />
                  </span>
                </Link>
              </Magnetic>
              <a
                href="#how"
                className="inline-flex h-[50px] items-center rounded-full border border-white/15 bg-white/5 px-6 text-[15px] font-[550] text-white transition-[background-color,border-color,transform] duration-[var(--dur-base)] hover:-translate-y-px hover:border-white/30 hover:bg-white/10 active:scale-[.97]"
              >
                See how it works
              </a>
            </div>
          </div>

          <span
            data-hero-copy
            aria-hidden="true"
            className="absolute right-6 bottom-5 z-10 hidden flex-col items-center gap-1 font-mono text-[10px] tracking-[.12em] text-white/40 uppercase scene:flex max-sm:bottom-12"
          >
            Scroll
            <ChevronDown size={14} className="animate-bounce motion-reduce:animate-none" />
          </span>

          {/* Static poster (no JS, reduced motion, low-end devices). */}
          <div className="relative mx-auto mt-14 aspect-[1100/880] w-[min(1100px,100%-32px)] scene:hidden">
            <Laptop
              pose={POSTER_POSE}
              className="lt-poster absolute inset-0"
              screen={<ScreenDashboard landed />}
            />
          </div>

          <ol
            data-captions
            className={cn(
              "relative z-10 mx-auto mt-10 grid w-[min(1100px,100%-32px)] gap-3 sm:grid-cols-5",
              "scene:absolute scene:inset-x-0 scene:bottom-16 scene:mt-0 scene:grid-cols-1 scene:[grid-template-areas:'c'] sm:scene:bottom-14",
            )}
          >
            {CAPTIONS.map((c) => (
              <li
                key={c.eyebrow}
                data-caption
                className={cn(
                  "flex flex-col gap-1.5 rounded-[14px] border border-white/10 bg-white/[.04] p-4",
                  "scene:items-center scene:border-0 scene:bg-transparent scene:p-0 scene:text-center scene:[grid-area:c]",
                  "scene:translate-y-2 scene:opacity-0 scene:transition-[opacity,transform] scene:duration-500 scene:ease-[var(--ease-out)]",
                  "scene:data-[on]:translate-y-0 scene:data-[on]:opacity-100",
                )}
              >
                <span className="flex flex-col gap-1.5 scene:items-center scene:rounded-[16px] scene:bg-[#0b0b0f]/80 scene:px-5 scene:py-2.5 scene:shadow-[0_12px_40px_-12px_rgba(0,0,0,.8)] scene:ring-1 scene:ring-white/10">
                  <span className="font-mono text-[10.5px] tracking-[.1em] text-white/45 uppercase">
                    {c.eyebrow}
                  </span>
                  <span className="text-[15px] font-[550] tracking-[-0.01em] text-white sm:text-[17px]">
                    {c.line}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          {/* The hand-off: the scene's last frame is this section's layout. */}
          <div className="relative z-10 mx-auto mt-24 flex w-[min(1200px,100%-32px)] flex-col items-start scene:pointer-events-none scene:absolute scene:inset-x-0 scene:top-0 scene:mt-0 scene:h-full scene:items-center scene:pt-[92px] sm:scene:pt-[96px]">
            <div
              data-glance
              className="flex flex-col items-start gap-3 scene:invisible scene:items-center scene:text-center"
            >
              <Eyebrow className="noscene:border-white/12 noscene:bg-white/5 noscene:text-white/70">
                The dashboard
              </Eyebrow>
              <h2 className="font-display text-[clamp(34px,5vw,60px)] leading-[1] tracking-[-0.02em] text-ink noscene:text-white">
                Your prep, <em>at a glance.</em>
              </h2>
              <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2 noscene:text-white/70">
                What you solved, what you&apos;re about to forget, and what to do next, on one
                screen. The numbers are an example.
              </p>
            </div>
            <div
              data-frame-target
              aria-hidden="true"
              className="mt-5 hidden aspect-[16/10] w-[min(1040px,calc(100vw-32px),calc((100svh-330px)*1.6))] scene:block"
            />
          </div>

          <HeroSceneLoader />
        </div>
        {/* "Skip intro" lands here: the scene's last frame (p = 1). */}
        <span id="glance" aria-hidden="true" className="absolute bottom-0 left-0 h-svh w-px" />
      </div>
    </section>
  );
}

/** The desk at 1 a.m.: faint stars up top, a low amber lamp, grain. Gradients only. */
function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_0%,rgba(255,255,255,.05),transparent_70%)]" />
      <div className="absolute -bottom-[30%] -left-[10%] h-[80%] w-[60%] bg-[radial-gradient(closest-side,rgba(245,185,77,.12),transparent)]" />
      <Starfield className="opacity-40 [mask-image:linear-gradient(180deg,#000,transparent_45%)]" />
      <Grain />
      <div data-part="page-bg" className="absolute inset-0 hidden bg-bg opacity-0 scene:block" />
    </div>
  );
}
