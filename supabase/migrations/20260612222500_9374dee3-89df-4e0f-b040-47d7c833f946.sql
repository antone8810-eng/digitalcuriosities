CREATE TABLE public.users (
  id text PRIMARY KEY,
  auth_user_id uuid UNIQUE,
  pi_username text,
  dgc_balance numeric NOT NULL DEFAULT 0,
  last_mine_at timestamp with time zone,
  vip_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own Pi user row"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.mine_dgc()
 RETURNS TABLE(new_balance numeric, reward numeric, last_mined_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid UUID := auth.uid();
  prev TIMESTAMPTZ;
  reward_amt NUMERIC;
  out_balance NUMERIC;
  out_last TIMESTAMPTZ;
  pi_uid TEXT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT p.last_mined_at, p.pi_wallet_address INTO prev, pi_uid FROM public.profiles p WHERE p.id = uid FOR UPDATE;
  IF prev IS NOT NULL AND prev > now() - INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'COOLDOWN:%', extract(epoch from (prev + INTERVAL '24 hours' - now()))::int;
  END IF;
  reward_amt := 1 + floor(random() * 5);
  UPDATE public.profiles p
    SET dgc_balance = p.dgc_balance + reward_amt, last_mined_at = now()
    WHERE p.id = uid
    RETURNING p.dgc_balance, p.last_mined_at INTO out_balance, out_last;
  IF pi_uid IS NOT NULL THEN
    UPDATE public.users
      SET dgc_balance = out_balance,
          last_mine_at = out_last
      WHERE id = pi_uid;
  END IF;
  new_balance := out_balance;
  last_mined_at := out_last;
  reward := reward_amt;
  RETURN NEXT;
END; $function$;