import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Returns { canShowAd } — false when the user has an active VIP subscription.
// Re-evaluates on every render so expiry takes effect in real time.
export function useAd() {
  const [vipUntil, setVipUntil] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { if (!cancelled) setLoaded(true); return; }
      const { data } = await supabase
        .from("profiles")
        .select("vip_until")
        .eq("id", u.user.id)
        .single();
      if (!cancelled) {
        setVipUntil((data as { vip_until: string | null } | null)?.vip_until ?? null);
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const isVip = !!vipUntil && new Date(vipUntil).getTime() > Date.now();
  return { canShowAd: loaded && !isVip, isVip, vipUntil };
}
