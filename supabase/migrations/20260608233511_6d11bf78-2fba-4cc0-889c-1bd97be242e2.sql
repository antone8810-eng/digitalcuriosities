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