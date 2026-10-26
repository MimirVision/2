/** Subscription check (RevenueCat) and usage quotas (Cloudflare KV). */

export interface AccessEnv {
  QUOTA: KVNamespace;
  REVENUECAT_SECRET_KEY: string;
  ENTITLEMENT_ID: string;
  FREE_SCANS: string;
  PRO_DAILY_LIMIT: string;
}

export type Decision =
  | { allowed: true; pro: boolean; commit: () => Promise<void> }
  | { allowed: false; reason: "paywall" | "daily_limit" };

const USER_ID = /^[A-Za-z0-9$:._-]{8,120}$/;
// Max free scans per IP per day, so reinstalling the app doesn't give unlimited free scans.
const FREE_PER_IP_PER_DAY = 5;

export function isValidUserId(id: string | null): id is string {
  return !!id && USER_ID.test(id);
}

export async function hasEntitlement(env: AccessEnv, userId: string, now = Date.now()): Promise<boolean> {
  const cacheKey = `ent:${userId}`;
  const cached = await env.QUOTA.get(cacheKey);
  if (cached === "1") return true;

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}` },
  });
  if (!res.ok) throw new Error(`RevenueCat ${res.status}`);
  const body = (await res.json()) as {
    subscriber?: { entitlements?: Record<string, { expires_date: string | null }> };
  };
  const ent = body.subscriber?.entitlements?.[env.ENTITLEMENT_ID];
  const active = !!ent && (ent.expires_date === null || Date.parse(ent.expires_date) > now);
  // Only cache "active": a user who just bought must be let through on the very next request.
  if (active) await env.QUOTA.put(cacheKey, "1", { expirationTtl: 300 });
  return active;
}

export async function decide(env: AccessEnv, userId: string, ip: string, now = new Date()): Promise<Decision> {
  const day = now.toISOString().slice(0, 10);

  if (await hasEntitlement(env, userId, now.getTime())) {
    const key = `day:${userId}:${day}`;
    const used = Number((await env.QUOTA.get(key)) ?? 0);
    if (used >= Number(env.PRO_DAILY_LIMIT)) return { allowed: false, reason: "daily_limit" };
    return {
      allowed: true,
      pro: true,
      commit: () => env.QUOTA.put(key, String(used + 1), { expirationTtl: 60 * 60 * 26 }),
    };
  }

  const userKey = `free:${userId}`;
  const ipKey = `ipfree:${ip}:${day}`;
  const [userUsed, ipUsed] = await Promise.all([
    env.QUOTA.get(userKey).then((v) => Number(v ?? 0)),
    env.QUOTA.get(ipKey).then((v) => Number(v ?? 0)),
  ]);
  if (userUsed >= Number(env.FREE_SCANS) || ipUsed >= FREE_PER_IP_PER_DAY) {
    return { allowed: false, reason: "paywall" };
  }
  return {
    allowed: true,
    pro: false,
    commit: async () => {
      await Promise.all([
        env.QUOTA.put(userKey, String(userUsed + 1)),
        env.QUOTA.put(ipKey, String(ipUsed + 1), { expirationTtl: 60 * 60 * 26 }),
      ]);
    },
  };
}
