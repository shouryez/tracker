"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button, ButtonArrow, cn } from "@upsolve/ui";
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
  const [step, setStep] = useState<0 | 1>(0);
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
        <section>
          <Heading
            muted={editing ? "Edit your profile." : "First things first."}
            main="About you."
          />
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
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
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
          <p className="mt-4 text-xs text-ink-3">
            We ask for your graduation year, not your age. Your profile is private until you make it
            public.
          </p>
          <div className="mt-8 flex justify-end">
            <Button variant="primary" onClick={() => checkStepOne() && setStep(1)}>
              Next <ButtonArrow />
            </Button>
          </div>
        </section>
      ) : (
        <section>
          <Heading muted="What are you" main="practising for?" />

          <fieldset>
            <legend className="sr-only">Goal</legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {GOALS.map((g) => (
                <label
                  key={g.value}
                  className={cn(
                    "cursor-pointer rounded-md border bg-surface p-4 transition-colors duration-[var(--dur-base)]",
                    goal === g.value
                      ? "border-primary shadow-[0_0_0_4px_var(--primary-soft)]"
                      : "border-line hover:border-line-2",
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
                  <span className="block font-[550]">{g.label}</span>
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
                        ? "border-transparent bg-ink text-bg"
                        : "border-line-2 text-ink-2 hover:text-ink",
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
              <div className="inline-flex rounded-full border border-line bg-surface-2 p-[3px]">
                {DAILY_GOALS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={dailyGoal === m}
                    onClick={() => setDailyGoal(m)}
                    className={cn(
                      "h-[34px] rounded-full px-3.5 font-mono text-[13px] transition-colors duration-[var(--dur-base)]",
                      dailyGoal === m ? "bg-surface text-ink shadow-card" : "text-ink-2",
                    )}
                  >
                    {m < 60 ? `${m}m` : `${m / 60}h`}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {errors.form && <ErrorText>{errors.form}</ErrorText>}

          <div className="mt-8 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)} disabled={pending}>
              Back
            </Button>
            <Button variant="primary" onClick={submit} disabled={pending}>
              {pending ? "Saving…" : editing ? "Save" : "Next"} {!pending && <ButtonArrow />}
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
      <span className="text-ink-3">{muted}</span> <em>{main}</em>
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
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(inputClass, "pr-2", !value && "text-ink-3")}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}
