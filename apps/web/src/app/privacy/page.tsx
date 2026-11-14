import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { Logo, ThemeToggle } from "@upsolve/ui";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What DsaKaro and its browser extension collect, why, who can see it, and how to delete it.",
};

const UPDATED = "14 November 2026";
const CONTACT = "cutubuildlabs@gmail.com";

// Plain, static and specific: it says only what the app and extension actually do
// (apps/extension, lib/ext-ingest.ts, actions/verification.ts). Update it with them.

const NEVER = [
  "Your code anywhere except your own LeetCode submissions",
  "Your passwords or your LeetCode / GFG cookies",
  "Which websites you visit (Lab mode keeps only two totals)",
  "Selling or renting your data, or showing you ads",
];

const COLLECT = [
  "Your email and name, to sign you in",
  "Time on each problem and the judge's verdicts",
  "What you add yourself: to-dos, ticks, notes, goals",
];

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="mx-auto flex h-[72px] w-[min(820px,100%-32px)] items-center justify-between">
        <Link href="/" aria-label="DsaKaro home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main id="main" className="mx-auto w-[min(820px,100%-32px)] pt-8 pb-24">
        <p className="label-mono">Last updated {UPDATED}</p>
        <h1 className="mt-3 font-display text-[clamp(38px,6vw,60px)] leading-[1] tracking-[-0.02em]">
          Privacy, <em>in plain words.</em>
        </h1>
        <p className="mt-4 max-w-[62ch] text-[15.5px] leading-relaxed text-ink-2">
          DsaKaro (dsakaro.site) and the DsaKaro browser extension help you track your coding
          practice. This page covers both: what we collect, why, who can see it, and how to delete
          it.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Summary title="What we keep" items={COLLECT} icon="yes" />
          <Summary title="What we never take" items={NEVER} icon="no" />
        </div>

        <article className="mt-12 flex flex-col gap-10 text-[15px] leading-relaxed text-ink-2 [&_strong]:font-[600] [&_strong]:text-ink">
          <Section n="1" title="What we collect">
            <Item label="Your account">
              Your email address and name when you sign in with Google or an emailed link (handled
              by Supabase Auth), plus the settings you choose: timezone, daily goal, reminder hour,
              college.
            </Item>
            <Item label="Coding profiles you connect">
              The usernames you add (for example LeetCode, Codeforces, GeeksforGeeks) and the public
              information those sites show for them: solved problems, submissions and contest
              ratings.
            </Item>
            <Item label="From the browser extension">
              On LeetCode and GeeksforGeeks problem pages: which problem you have open, how long you
              actively worked on it, whether the timer is running or paused, and each judged
              submission&apos;s verdict, language, runtime, memory and time. If you answer the short
              card after an Accepted, also how you solved it, the pattern and your one-line note.
            </Item>
            <Item label="Your submitted code (extension, LeetCode)">
              When you press Submit on LeetCode, the extension saves the code of that submission
              and, if it fails, the failing test LeetCode shows you. It&apos;s used for bug autopsy:
              the code of a failed submission is sent to our AI provider (NVIDIA&apos;s API) to name
              the bug, and the answer is stored with it. Only you can see it. Delete all of it any
              time in Settings, Browser extension. Code you type but don&apos;t submit is never
              read.
            </Item>
            <Item label="History import (extension)">
              When you connect, the extension reads your past LeetCode submissions using your own
              logged-in LeetCode session, inside your browser, and sends only the verdict details
              above (never code). Your LeetCode cookies never leave your browser.
            </Item>
            <Item label="takeUforward sheet sync (extension)">
              Your Striver sheets stay the same on both sites. When you open or tick a Striver sheet
              on takeuforward.org while signed in there, the extension reads which items you&apos;ve
              ticked and sends only those items&apos; names to DsaKaro. Items you tick or untick in
              DsaKaro are ticked or unticked on takeUforward the same way, from a takeuforward.org
              tab, as your own takeUforward page would. Your takeUforward cookies and account
              details never leave your browser.
            </Item>
            <Item label="Lab mode (extension, only while you run a focus session)">
              The extension looks at the address and title of your active tab to decide whether
              you&apos;re on a coding site (focus) or not (away). It keeps and sends only{" "}
              <strong>two totals and a count of switches</strong>. Addresses and titles are never
              stored or sent.
            </Item>
            <Item label="Save for later">
              When you save a page with the extension, its address and title, and for YouTube the
              time in the video you were at.
            </Item>
            <Item label="What you create">
              To-do items, sheet ticks and stars, notes, weekly goals, groups you make or join, and
              problems you share with them.
            </Item>
            <Item label="College verification (optional)">
              If you verify your college, the photo of your ID card you upload. It is used only to
              check it, and <strong>deleted as soon as it&apos;s reviewed</strong>, approved or not.
            </Item>
            <Item label="Technical">
              Sign-in cookies that keep you logged in. Our hosting provider keeps standard request
              logs (such as IP address and browser type) for security and debugging. We don&apos;t
              use analytics or advertising trackers.
            </Item>
          </Section>

          <Section n="2" title="How we use it">
            <p>
              Only to run DsaKaro for you: your dashboard and stats, the revision queue,
              Today&apos;s list, sheets, groups and leaderboards, reminders and contest alerts, and
              the weekly summary email. We don&apos;t sell or rent your data, don&apos;t use it for
              ads, and don&apos;t share it with anyone except the services below that run the app.
            </p>
            <p>
              The use of information received from the extension follows the{" "}
              <a
                href="https://developer.chrome.com/docs/webstore/program-policies/user-data-faq"
                className="text-ink underline underline-offset-4"
              >
                Chrome Web Store User Data Policy
              </a>
              , including its Limited Use requirements.
            </p>
          </Section>

          <Section n="3" title="Who can see it">
            <p>
              <strong>Your data is private by default.</strong> Others see it only where you choose:
            </p>
            <ul className="flex list-disc flex-col gap-1.5 pl-5">
              <li>A public profile page, only if you turn it on.</li>
              <li>Leaderboards, only if you opt in.</li>
              <li>
                Members of groups you join see your progress there and, if &quot;share live&quot; is
                on in Settings, that you&apos;re solving right now.
              </li>
              <li>
                The DsaKaro admin sees a college ID photo only to review it, before it&apos;s
                deleted.
              </li>
            </ul>
          </Section>

          <Section n="4" title="Services that process it">
            <ul className="flex list-disc flex-col gap-1.5 pl-5">
              <li>
                <strong>Supabase</strong>: database and sign-in. Data is stored in its Mumbai
                (India) region.
              </li>
              <li>
                <strong>Vercel</strong>: hosts the website and its servers.
              </li>
              <li>
                <strong>Resend</strong>: sends the weekly summary email.
              </li>
              <li>
                <strong>Google</strong>: only if you sign in with Google.
              </li>
            </ul>
          </Section>

          <Section n="5" title="Your choices, and deleting your data">
            <ul className="flex list-disc flex-col gap-1.5 pl-5">
              <li>
                Turn off reminders, contest alerts and the weekly email in Settings, or use the
                unsubscribe link in any email.
              </li>
              <li>Disconnect a coding profile, or disconnect the extension, in Settings.</li>
              <li>Delete all your saved code, and the bug autopsies made from it, in Settings.</li>
              <li>
                Uninstalling the extension deletes everything it stored in your browser; unsent
                sessions are discarded.
              </li>
              <li>
                To delete your account and all its data, email{" "}
                <a
                  href={`mailto:${CONTACT}?subject=Delete%20my%20DsaKaro%20account`}
                  className="text-ink underline underline-offset-4"
                >
                  {CONTACT}
                </a>{" "}
                from the address you sign in with. We delete it within 30 days.
              </li>
            </ul>
            <p>We keep your data while your account exists, and delete it when you ask.</p>
          </Section>

          <Section n="6" title="Children">
            <p>
              DsaKaro is meant for students aged 13 and over and isn&apos;t directed at younger
              children.
            </p>
          </Section>

          <Section n="7" title="Changes and contact">
            <p>
              If this policy changes, we&apos;ll update the date at the top, and tell you in the app
              for anything important. Questions:{" "}
              <a href={`mailto:${CONTACT}`} className="text-ink underline underline-offset-4">
                {CONTACT}
              </a>
              .
            </p>
          </Section>
        </article>
      </main>
    </div>
  );
}

function Summary({ title, items, icon }: { title: string; items: string[]; icon: "yes" | "no" }) {
  return (
    <div className="surface-card rounded-[20px] p-5">
      <p className="label-mono">{title}</p>
      <ul className="mt-3 flex flex-col gap-2 text-[14px]">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className={
                icon === "yes"
                  ? "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-surface-3 text-ink-2"
                  : "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--signal)_18%,transparent)] text-ink"
              }
            >
              {icon === "yes" ? <Check size={12} /> : <X size={12} />}
            </span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`s${n}`} className="flex flex-col gap-3">
      <h2
        id={`s${n}`}
        className="flex items-baseline gap-3 text-[20px] font-[650] tracking-[-0.02em] text-ink"
      >
        <span className="font-mono text-[13px] font-medium text-ink-4">{n.padStart(2, "0")}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-[15px] font-[600] text-ink">{label}</h3>
      <p className="mt-1">{children}</p>
    </div>
  );
}
