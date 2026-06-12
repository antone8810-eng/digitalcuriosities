import { useUser } from "@/hooks/use-user";

// Returns { canShowAd } — false when the user has an active VIP subscription.
// Re-evaluates on every render so expiry takes effect in real time.
export function useAd() {
  const { data: user, isLoading } = useUser();
  const vipUntil = user?.vip_until ?? null;
  const isVip = !!vipUntil && new Date(vipUntil).getTime() > Date.now();
  return { canShowAd: !isLoading && !isVip, isVip, vipUntil };
}
