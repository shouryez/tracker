import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hero } from "@/components/landing/hero/hero";
import { SmoothScroll } from "@/components/landing/landing-fx";

export const metadata: Metadata = { title: "Hero lab", robots: { index: false } };

/**
 * Dev-only tuning bench for the landing hero (design/LANDING-V3.md). Add ?debug for the
 * live progress readout, ?noscene for the static poster. Production builds 404 unless
 * DSAKARO_LAB=1 is set at build time (for testing a local `next start`).
 */
export default function HeroLab() {
  if (process.env.NODE_ENV === "production" && process.env.DSAKARO_LAB !== "1") notFound();
  return (
    <div className="relative overflow-x-clip">
      <Hero />
      <div className="mx-auto grid h-[80vh] w-[min(1200px,100%-32px)] place-items-center text-13 text-ink-3">
        End of the hero. The marquee and features follow here on the real page.
      </div>
      <SmoothScroll />
    </div>
  );
}

// DsaKaro
