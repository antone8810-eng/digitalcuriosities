
CREATE OR REPLACE FUNCTION public.claim_mining_reward(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev timestamptz;
  reward_amt numeric := 0.01;
  new_bal numeric;
  next_available timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT u.last_mine_at INTO prev
  FROM public.users u
  WHERE u.auth_user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User row not found. Please sign in again.';
  END IF;

  IF prev IS NOT NULL AND prev > now() - INTERVAL '24 hours' THEN
    next_available := prev + INTERVAL '24 hours';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'On cooldown',
      'next_at', next_available
    );
  END IF;

  UPDATE public.users u
    SET dgc_balance = u.dgc_balance + reward_amt,
        last_mine_at = now()
    WHERE u.auth_user_id = p_user_id
    RETURNING u.dgc_balance, u.last_mine_at INTO new_bal, next_available;

  UPDATE public.profiles p
    SET dgc_balance = new_bal,
        last_mined_at = next_available
    WHERE p.id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'reward', reward_amt,
    'new_balance', new_bal,
    'next_at', next_available + INTERVAL '24 hours'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_mining_reward(uuid) TO authenticated;
