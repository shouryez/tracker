import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { themeScript } from "@upsolve/ui";
import { Toaster } from "@/components/toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Mono is for timers, counts and small labels: not preloaded, so it doesn't compete with
// the text font for the first paint.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  // Absolute base for link previews (share cards). Set NEXT_PUBLIC_SITE_URL in production.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3005"),
  title: {
    default: "DsaKaro: every problem you solve, remembered",
    template: "%s · DsaKaro",
  },
  description:
    "Track time, verdicts and progress across LeetCode, Codeforces, GFG and more, then know exactly what to revise next.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme is set by themeScript before paint, so the server value may differ.
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        {/* We ship our own dark theme; this stops Dark Reader rewriting SVGs (hydration mismatch). */}
        <meta name="darkreader-lock" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <a
          href="#main"
          className="fixed top-3 left-3 z-[100] -translate-y-20 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-bg focus:translate-y-0"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
