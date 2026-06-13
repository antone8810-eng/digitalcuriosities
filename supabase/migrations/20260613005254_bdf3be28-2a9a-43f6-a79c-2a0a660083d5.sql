
CREATE OR REPLACE FUNCTION public.mine_dgc()
RETURNS TABLE(new_balance numeric, reward numeric, last_mined_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  prev timestamptz;
  reward_amt numeric;
  out_balance numeric;
  out_last timestamptz;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT u.last_mine_at INTO prev FROM public.users u WHERE u.auth_user_id = uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User row not found. Please sign in again.'; END IF;
  IF prev IS NOT NULL AND prev > now() - INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'COOLDOWN:%', extract(epoch from (prev + INTERVAL '24 hours' - now()))::int;
  END IF;
  reward_amt := 1 + floor(random() * 5);
  UPDATE public.users u
    SET dgc_balance = u.dgc_balance + reward_amt, last_mine_at = now()
    WHERE u.auth_user_id = uid
    RETURNING u.dgc_balance, u.last_mine_at INTO out_balance, out_last;
  new_balance := out_balance;
  last_mined_at := out_last;
  reward := reward_amt;
  RETURN NEXT;
END; $$;
