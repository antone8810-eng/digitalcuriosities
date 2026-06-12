CREATE OR REPLACE FUNCTION public.sync_profile_to_pi_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.pi_wallet_address IS NOT NULL THEN
    INSERT INTO public.users (
      id,
      auth_user_id,
      pi_username,
      dgc_balance,
      last_mine_at,
      vip_until
    ) VALUES (
      NEW.pi_wallet_address,
      NEW.id,
      NEW.pi_username,
      COALESCE(NEW.dgc_balance, 0),
      NEW.last_mined_at,
      NEW.vip_until
    )
    ON CONFLICT (id) DO UPDATE SET
      auth_user_id = EXCLUDED.auth_user_id,
      pi_username = EXCLUDED.pi_username,
      dgc_balance = EXCLUDED.dgc_balance,
      last_mine_at = EXCLUDED.last_mine_at,
      vip_until = EXCLUDED.vip_until;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER sync_profiles_to_users
AFTER INSERT OR UPDATE OF pi_wallet_address, pi_username, dgc_balance, last_mined_at, vip_until
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_to_pi_user();

INSERT INTO public.users (
  id,
  auth_user_id,
  pi_username,
  dgc_balance,
  last_mine_at,
  vip_until
)
SELECT
  pi_wallet_address,
  id,
  pi_username,
  dgc_balance,
  last_mined_at,
  vip_until
FROM public.profiles
WHERE pi_wallet_address IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  pi_username = EXCLUDED.pi_username,
  dgc_balance = EXCLUDED.dgc_balance,
  last_mine_at = EXCLUDED.last_mine_at,
  vip_until = EXCLUDED.vip_until;

CREATE OR REPLACE FUNCTION public.mine_dgc()
 RETURNS TABLE(new_balance numeric, reward numeric, last_mined_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  uid UUID := auth.uid();
  prev TIMESTAMPTZ;
  reward_amt NUMERIC;
  out_balance NUMERIC;
  out_last TIMESTAMPTZ;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT p.last_mined_at INTO prev FROM public.profiles p WHERE p.id = uid FOR UPDATE;
  IF prev IS NOT NULL AND prev > now() - INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'COOLDOWN:%', extract(epoch from (prev + INTERVAL '24 hours' - now()))::int;
  END IF;
  reward_amt := 1 + floor(random() * 5);
  UPDATE public.profiles p
    SET dgc_balance = p.dgc_balance + reward_amt, last_mined_at = now()
    WHERE p.id = uid
    RETURNING p.dgc_balance, p.last_mined_at INTO out_balance, out_last;
  new_balance := out_balance;
  last_mined_at := out_last;
  reward := reward_amt;
  RETURN NEXT;
END; $function$;