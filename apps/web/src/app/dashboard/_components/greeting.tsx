import { getCurrentUser } from "@/lib/auth";

export async function Greeting() {
  const user = await getCurrentUser();
  const firstName = user.name?.split(" ")[0];

  return (
    <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.02] font-[550] tracking-[-0.04em]">
      {firstName ? `Hey, ${firstName}` : "Welcome to Upsolve"}
      <span className="block text-ink-3">Day 1 · Getting set up</span>
    </h1>
  );
}

export function GreetingSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <span className="h-8 w-56 animate-pulse rounded-sm bg-surface-3" />
      <span className="h-8 w-44 animate-pulse rounded-sm bg-surface-2" />
    </div>
  );
}
