import { getAdapter } from "@upsolve/adapters";
import { CONNECTABLE, getAccounts } from "@/lib/data";
import { PLATFORM_LABEL, PLATFORM_PROFILE_URL } from "./platform-meta";
import { PlatformRow } from "./platform-row";

const PLACEHOLDER = {
  leetcode: "LeetCode username",
  codeforces: "Codeforces handle",
  geeksforgeeks: "GeeksforGeeks username",
} as const;

export async function PlatformConnections({ userId }: { userId: string }) {
  const accounts = await getAccounts(userId);

  return (
    <div>
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
      <p className="mt-4 font-mono text-[11px] text-ink-3">CodeChef and AtCoder are coming next.</p>
    </div>
  );
}
