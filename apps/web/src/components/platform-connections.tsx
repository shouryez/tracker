import { getAdapter } from "@upsolve/adapters";
import { CONNECTABLE, getAccounts } from "@/lib/data";
import { PLATFORM_LABEL, PLATFORM_PROFILE_URL } from "./platform-meta";
import { PlatformRow } from "./platform-row";
import { PlatformMark } from "./site-icons";

const PLACEHOLDER = {
  leetcode: "LeetCode username",
  codeforces: "Codeforces handle",
  geeksforgeeks: "GeeksforGeeks username",
} as const;

export async function PlatformConnections({ userId }: { userId: string }) {
  const accounts = await getAccounts(userId);

  return (
    <div className="flex flex-col gap-2.5">
      {CONNECTABLE.map((platform) => {
        const a = accounts.find((x) => x.platform === platform) ?? null;
        const verifying = Boolean(a && !a.verified && a.verifyRequestedAt);
        return (
          <PlatformRow
            key={platform}
            platform={platform}
            label={PLATFORM_LABEL[platform]}
            placeholder={PLACEHOLDER[platform]}
            profileUrl={a ? (PLATFORM_PROFILE_URL[platform]?.(a.handle) ?? null) : null}
            verifyInstructions={
              a && verifying
                ? getAdapter(platform).verifyInstructions({
                    code: a.verifyCode ?? "",
                    requestedAt: a.verifyRequestedAt!,
                  })
                : null
            }
            account={
              a && {
                id: a.id,
                handle: a.handle,
                verified: a.verified,
                verifyCode: a.verifyCode,
                verifying,
                status: a.status,
                syncing: a.syncing,
                lastSyncedAt: a.lastSyncedAt?.toISOString() ?? null,
                lastError: a.lastError,
                solved: a.snapshot?.solved.total ?? null,
              }
            }
          />
        );
      })}
      {(["codechef", "atcoder"] as const).map((site) => (
        <div
          key={site}
          className="flex items-center gap-2.5 rounded-[16px] border border-dashed border-line-2 p-4 opacity-60"
        >
          <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-surface-2 text-ink-3">
            <PlatformMark site={site} size={16} />
          </span>
          <span className="text-14 font-[600] text-ink-2">
            {site === "codechef" ? "CodeChef" : "AtCoder"}
          </span>
          <span className="ml-auto rounded-full border border-line-2 px-2 py-0.5 text-11 text-ink-3">
            coming soon
          </span>
        </div>
      ))}
    </div>
  );
}

// DsaKaro
