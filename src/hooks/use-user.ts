import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  pi_username: string | null;
  pi_wallet_address: string | null;
  dgc_balance: number;
  last_mined_at: string | null;
  vip_until: string | null;
};

export const userQueryKey = ["current-user"] as const;

export function useUser() {
  const query = useQuery<UserProfile | null>({
    queryKey: userQueryKey,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,pi_username,pi_wallet_address,dgc_balance,last_mined_at,vip_until")
        .eq("id", u.user.id)
        .single();
      if (error) throw error;
      return { ...(data as Omit<UserProfile, "email">), email: u.user.email ?? null };
    },
    staleTime: 10_000,
  });
  return query;
}

export function useRefreshUser() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: userQueryKey });
}

export function setUserCache(updater: (prev: UserProfile | null | undefined) => UserProfile | null) {
  // Helper used outside React (not commonly needed).
  return updater;
}
