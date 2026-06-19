CREATE OR REPLACE FUNCTION public.sync_profile_to_pi_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.pi_wallet_address IS NOT NULL AND length(trim(NEW.pi_wallet_address)) > 0 THEN
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
      pi_username = COALESCE(EXCLUDED.pi_username, public.users.pi_username),
      dgc_balance = GREATEST(public.users.dgc_balance, EXCLUDED.dgc_balance),
      last_mine_at = GREATEST(public.users.last_mine_at, EXCLUDED.last_mine_at),
      vip_until = GREATEST(public.users.vip_until, EXCLUDED.vip_until);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mine_dgc()
RETURNS TABLE(new_balance numeric, reward numeric, last_mined_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  prev timestamptz;
  reward_amt numeric;
  out_balance numeric;
  out_last timestamptz;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT u.last_mine_at
    INTO prev
    FROM public.users u
    WHERE u.auth_user_id = uid
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User row not found. Please sign in again.';
  END IF;

  IF prev IS NOT NULL AND prev > now() - INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'COOLDOWN:%', extract(epoch from (prev + INTERVAL '24 hours' - now()))::int;
  END IF;

  reward_amt := 1 + floor(random() * 5);

  UPDATE public.users u
    SET dgc_balance = u.dgc_balance + reward_amt,
        last_mine_at = now()
    WHERE u.auth_user_id = uid
    RETURNING u.dgc_balance, u.last_mine_at INTO out_balance, out_last;

  UPDATE public.profiles p
    SET dgc_balance = out_balance,
        last_mined_at = out_last
    WHERE p.id = uid;

  new_balance := out_balance;
  last_mined_at := out_last;
  reward := reward_amt;
  RETURN NEXT;
END;
$function$;

UPDATE public.users u
SET dgc_balance = GREATEST(u.dgc_balance, COALESCE(p.dgc_balance, 0)),
    last_mine_at = GREATEST(u.last_mine_at, p.last_mined_at),
    vip_until = GREATEST(u.vip_until, p.vip_until),
    pi_username = COALESCE(u.pi_username, p.pi_username)
FROM public.profiles p
WHERE p.id = u.auth_user_id;

UPDATE public.profiles p
SET dgc_balance = u.dgc_balance,
    last_mined_at = u.last_mine_at,
    vip_until = u.vip_until,
    pi_wallet_address = u.id,
    pi_username = COALESCE(p.pi_username, u.pi_username)
FROM public.users u
WHERE p.id = u.auth_user_id;

GRANT EXECUTE ON FUNCTION public.mine_dgc() TO authenticated;