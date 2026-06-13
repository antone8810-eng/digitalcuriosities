import { createContext, createElement, useCallback, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserProfile = {
  id: string;
  auth_user_id: string | null;
  display_name: string | null;
  pi_username: string | null;
  pi_wallet_address: string | null;
  dgc_balance: number;
  last_mine_at: string | null;
  last_mined_at: string | null;
  vip_until: string | null;
};

export const userQueryKey = ["current-user"] as const;

type UserContextValue = UseQueryResult<UserProfile | null> & {
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

function useCurrentUserQuery() {
  return useQuery<UserProfile | null>({
    queryKey: userQueryKey,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;

      const { data: piUser, error } = await supabase
        .from("users")
        .select("id,auth_user_id,pi_username,dgc_balance,last_mine_at,vip_until")
        .eq("auth_user_id", u.user.id)
        .maybeSingle();
      if (error) throw error;
      if (!piUser) return null;

      return {
        id: piUser.id,
        auth_user_id: piUser.auth_user_id,
        display_name: piUser.pi_username,
        pi_username: piUser.pi_username,
        pi_wallet_address: piUser.id, // Pi UID doubles as the wallet identifier
        dgc_balance: Number(piUser.dgc_balance ?? 0),
        last_mine_at: piUser.last_mine_at,
        last_mined_at: piUser.last_mine_at,
        vip_until: piUser.vip_until,
      };
    },
    staleTime: 10_000,
  });
}

export function UserProvider({ children }: { children: ReactNode }) {
  const query = useCurrentUserQuery();
  const qc = useQueryClient();
  const refreshUser = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: userQueryKey });
  }, [qc]);

  return createElement(UserContext.Provider, { value: { ...query, refreshUser } }, children);
}

export function useUser() {
  const context = useContext(UserContext);
  return context ?? useCurrentUserQuery();
}

export function useRefreshUser() {
  const context = useContext(UserContext);
  const qc = useQueryClient();
  return context?.refreshUser ?? (() => qc.invalidateQueries({ queryKey: userQueryKey }));
}
