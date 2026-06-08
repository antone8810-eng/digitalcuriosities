
CREATE OR REPLACE FUNCTION public.mine_dgc()
RETURNS TABLE(new_balance NUMERIC, reward NUMERIC, last_mined_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  prev TIMESTAMPTZ;
  reward_amt NUMERIC;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT p.last_mined_at INTO prev FROM public.profiles p WHERE p.id = uid FOR UPDATE;
  IF prev IS NOT NULL AND prev > now() - INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'COOLDOWN:%', extract(epoch from (prev + INTERVAL '24 hours' - now()))::int;
  END IF;
  reward_amt := 1 + floor(random() * 5);
  UPDATE public.profiles
    SET dgc_balance = dgc_balance + reward_amt, last_mined_at = now()
    WHERE id = uid
    RETURNING dgc_balance, last_mined_at INTO new_balance, last_mined_at;
  reward := reward_amt;
  RETURN NEXT;
END; $$;

REVOKE EXECUTE ON FUNCTION public.mine_dgc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mine_dgc() TO authenticated;
