"use client";

import { useState, useTransition, type ReactNode } from "react";
import { GraduationCap, Target } from "lucide-react";
import { Button, ButtonArrow, SegmentedControl, cn } from "@upsolve/ui";
import { Select as Combo } from "@/components/fx/select";
import { saveProfile } from "@/app/actions/profile";
import {
  BRANCHES,
  COMPANIES,
  CURRENT_YEARS,
  DAILY_GOALS,
  GOALS,
  HANDLE_PATTERN,
  LANGUAGES,
  gradYearOptions,
} from "@/lib/profile-options";
import { CollegePicker, inputClass, type CollegeChoice } from "./college-picker";
import { OnboardingSteps } from "./steps";

type Defaults = {
  name: string;
  handle: string;
  college: { id: string; name: string } | null;
  branch: string;
  gradYear: number | null;
  currentYear: number | null;
  goal: string;
  targetCompanies: string[];
  mainLanguage: string;
  dailyGoalMin: number;
};

const STEP_ONE_FIELDS = ["name", "handle", "collegeId", "branch", "gradYear", "currentYear"];

export function ProfileForm({ defaults, editing }: { defaults: Defaults; editing: boolean }) {
  const [step, setStepRaw] = useState<0 | 1>(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const setStep = (s: 0 | 1) => {
    setDir(s > step ? 1 : -1);
    setStepRaw(s);
  };
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(defaults.name);
  const [handle, setHandle] = useState(defaults.handle);
  const [college, setCollege] = useState<CollegeChoice>(
    defaults.college ? { kind: "existing", ...defaults.college } : null,
  );
  const [branch, setBranch] = useState(defaults.branch);
  const [gradYear, setGradYear] = useState(defaults.gradYear?.toString() ?? "");
  const [currentYear, setCurrentYear] = useState(defaults.currentYear?.toString() ?? "");
  const [goal, setGoal] = useState(defaults.goal);
  const [companies, setCompanies] = useState<string[]>(defaults.targetCompanies);
  const [customCompany, setCustomCompany] = useState("");
  const [language, setLanguage] = useState(defaults.mainLanguage);
  const [dailyGoal, setDailyGoal] = useState(defaults.dailyGoalMin);

  function checkStepOne() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Tell us your name";
    if (!HANDLE_PATTERN.test(handle.trim().toLowerCase()))
      e.handle = "3–20 characters: lowercase letters, numbers and _";
    if (!college) e.collegeId = "Pick your college, or add it if it's missing";
    if (!branch) e.branch = "Pick your branch";
    if (!gradYear) e.gradYear = "Pick your graduation year";
    if (!currentYear) e.currentYear = "Pick your current year";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit() {
    setErrors({});
    startTransition(async () => {
      const result = await saveProfile({
        name,
        handle,
        collegeId: college?.kind === "existing" ? college.id : null,
        newCollegeName: college?.kind === "new" ? college.name : null,
        branch: branch as (typeof BRANCHES)[number],
        gradYear,
        currentYear,
        goal,
        targetCompanies: companies,
        mainLanguage: language as (typeof LANGUAGES)[number],
        dailyGoalMin: dailyGoal,
      });
      // On success the action redirects, so we only get here with errors.
      if (result && !result.ok) {
        setErrors(result.errors);
        if (Object.keys(result.errors).some((k) => STEP_ONE_FIELDS.includes(k))) setStep(0);
      }
    });
  }

  function toggleCompany(c: string) {
    setCompanies((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c].slice(0, 12)));
  }

  function addCustomCompany() {
    const c = customCompany.trim();
    if (c && !companies.includes(c)) setCompanies((cs) => [...cs, c].slice(0, 12));
    setCustomCompany("");
  }

  return (
    <div>
      <OnboardingSteps current={step} />

      {step === 0 ? (
        <section
          key="s0"
          className={
            dir === 1
              ? "animate-[slide-in-r_var(--dur-slow)_var(--ease-out)]"
              : "animate-[slide-in-l_var(--dur-slow)_var(--ease-out)]"
          }
        >
          <Heading
            muted={editing ? "Edit your profile." : "First things first."}
            main="About you."
          />
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" error={errors.name} htmlFor="name">
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className={inputClass}
                />
              </Field>
              <Field
                label="Profile handle"
                hint={`upsolve.in/u/${handle || "you"}`}
                error={errors.handle}
                htmlFor="handle"
              >
                <input
                  id="handle"
                  value={handle}
                  onChange={(e) =>
                    setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                  }
                  maxLength={20}
                  spellCheck={false}
                  className={cn(inputClass, "font-mono")}
                />
              </Field>
              <Field label="College" error={errors.collegeId} className="sm:col-span-2">
                <CollegePicker
                  value={college}
                  onChange={setCollege}
                  invalid={Boolean(errors.collegeId)}
                />
              </Field>
              <Field label="Branch" error={errors.branch} htmlFor="branch">
                <Select
                  id="branch"
                  value={branch}
                  onChange={setBranch}
                  placeholder="Pick your branch"
                  options={BRANCHES.map((b) => [b, b])}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Graduating" error={errors.gradYear} htmlFor="gradYear">
                  <Select
                    id="gradYear"
                    value={gradYear}
                    onChange={setGradYear}
                    placeholder="Year"
                    options={gradYearOptions().map((y) => [String(y), String(y)])}
                  />
                </Field>
                <Field label="Currently in" error={errors.currentYear} htmlFor="currentYear">
                  <Select
                    id="currentYear"
                    value={currentYear}
                    onChange={setCurrentYear}
                    placeholder="Year"
                    options={CURRENT_YEARS.map((c) => [String(c.value), c.label])}
                  />
                </Field>
              </div>
            </div>
            <ProfilePreview
              name={name}
              handle={handle}
              college={college?.name ?? null}
              branch={branch}
              gradYear={gradYear}
            />
          </div>
          <p className="mt-4 text-xs text-ink-3">
            We ask for your graduation year, not your age. Your profile is private until you make it
            public.
          </p>
          <div className="mt-8 flex justify-end">
            <Button variant="signal" onClick={() => checkStepOne() && setStep(1)}>
              Next <ButtonArrow />
            </Button>
          </div>
        </section>
      ) : (
        <section
          key="s1"
          className={
            dir === 1
              ? "animate-[slide-in-r_var(--dur-slow)_var(--ease-out)]"
              : "animate-[slide-in-l_var(--dur-slow)_var(--ease-out)]"
          }
        >
          <Heading muted="What are you" main="practising for?" />

          <fieldset>
            <legend className="sr-only">Goal</legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {GOALS.map((g) => (
                <label
                  key={g.value}
                  className={cn(
                    "surface-card relative cursor-pointer rounded-[16px] p-4 transition-[border-color,box-shadow,transform] duration-[var(--dur-base)] hover:-translate-y-0.5",
                    goal === g.value
                      ? "border-violet shadow-[var(--e1),0_0_0_4px_var(--color-violet-soft)]"
                      : "hover:border-line-2",
                  )}
                >
                  <input
                    type="radio"
                    name="goal"
                    value={g.value}
                    checked={goal === g.value}
                    onChange={() => setGoal(g.value)}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-2 font-[600]">
                    <Target
                      size={15}
                      aria-hidden="true"
                      className={goal === g.value ? "text-violet" : "text-ink-3"}
                    />
                    {g.label}
                  </span>
                  <span className="block text-[13px] text-ink-2">{g.detail}</span>
                </label>
              ))}
            </div>
            {errors.goal && <ErrorText>{errors.goal}</ErrorText>}
          </fieldset>

          <fieldset className="mt-7">
            <legend className="mb-2 text-[13px] font-medium">
              Target companies <span className="font-normal text-ink-3">· optional, up to 12</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {[
                ...COMPANIES,
                ...companies.filter((c) => !(COMPANIES as readonly string[]).includes(c)),
              ].map((c) => {
                const on = companies.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleCompany(c)}
                    className={cn(
                      "h-8 rounded-full border px-3 text-[13px] transition-colors duration-[var(--dur-base)]",
                      on
                        ? "border-violet-line bg-violet-soft text-ink"
                        : "border-line-2 text-ink-2 hover:border-line-3 hover:text-ink",
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <div className="mt-2.5 flex max-w-sm gap-2">
              <input
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomCompany();
                  }
                }}
                placeholder="Another company"
                maxLength={40}
                className={cn(inputClass, "h-[34px]")}
              />
              <Button size="sm" variant="secondary" onClick={addCustomCompany}>
                Add
              </Button>
            </div>
          </fieldset>

          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <Field label="Main language" error={errors.mainLanguage} htmlFor="language">
              <Select
                id="language"
                value={language}
                onChange={setLanguage}
                placeholder="Pick a language"
                options={LANGUAGES.map((l) => [l, l])}
              />
            </Field>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium">Daily goal</legend>
              <SegmentedControl
                label="Daily goal"
                value={String(dailyGoal)}
                onChange={(v) => setDailyGoal(Number(v))}
                items={DAILY_GOALS.map((m) => ({
                  value: String(m),
                  label: m < 60 ? `${m}m` : `${m / 60}h`,
                }))}
              />
            </fieldset>
          </div>

          {errors.form && <ErrorText>{errors.form}</ErrorText>}

          <div className="mt-8 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)} disabled={pending}>
              Back
            </Button>
            <Button variant="signal" onClick={submit} loading={pending}>
              {editing ? "Save" : "Next"} <ButtonArrow />
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function Heading({ muted, main }: { muted: string; main: string }) {
  return (
    <h1 className="mb-8 font-display text-[clamp(36px,6vw,52px)] leading-none tracking-[-0.02em]">
      {muted} <em className="text-violet">{main}</em>
    </h1>
  );
}

function Field({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium"
      >
        {label}
        {hint && (
          <span className="truncate font-mono text-[11px] font-normal text-ink-3">{hint}</span>
        )}
      </label>
      {children}
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-1.5 text-[12.5px] text-bad">
      {children}
    </p>
  );
}

function Select({
  id,
  value,
  onChange,
  placeholder,
  options,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: [string, string][];
}) {
  return (
    <Combo
      label={placeholder}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      options={options.map(([v, label]) => ({ value: v, label }))}
      className={id}
    />
  );
}

/** Live preview of the public profile card while you type. */
function ProfilePreview({
  name,
  handle,
  college,
  branch,
  gradYear,
}: {
  name: string;
  handle: string;
  college: string | null;
  branch: string;
  gradYear: string;
}) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";
  return (
    <aside aria-label="Profile preview" className="sticky top-6 hidden lg:block">
      <p className="mb-2 label-mono">Preview</p>
      <div className="surface-hero relative overflow-hidden rounded-[22px] p-5">
        <span aria-hidden="true" className="grain absolute inset-0" />
        <span className="relative grid size-16 place-items-center rounded-full bg-[linear-gradient(135deg,var(--violet),var(--ember))] text-20 font-[600] text-white ring-4 ring-white/15">
          {initials}
        </span>
        <p className="relative mt-4 truncate text-20 font-[600]">{name || "Your name"}</p>
        <p className="relative truncate font-mono text-12 text-white/65">
          upsolve.in/u/{handle || "you"}
        </p>
        <p className="relative mt-3 flex items-center gap-1.5 text-13 text-white/80">
          <GraduationCap size={14} aria-hidden="true" />
          <span className="truncate">{college ?? "Your college"}</span>
        </p>
        <p className="relative mt-1 text-12 text-white/60">
          {[branch, gradYear && `Batch ${gradYear}`].filter(Boolean).join(" · ") ||
            "Branch · batch"}
        </p>
        <div aria-hidden="true" className="relative mt-4 grid grid-flow-col grid-rows-4 gap-[3px]">
          {Array.from({ length: 4 * 14 }, (_, i) => (
            <i
              key={i}
              className="size-2.5 rounded-[2px]"
              style={{
                background: i % 7 === 3 || i % 11 === 0 ? "#a48bff" : "rgba(255,255,255,.1)",
              }}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
