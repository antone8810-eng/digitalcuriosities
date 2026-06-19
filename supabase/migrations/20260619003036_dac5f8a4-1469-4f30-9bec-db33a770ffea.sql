DROP FUNCTION IF EXISTS public.mine_dgc();

CREATE OR REPLACE FUNCTION public.mine_dgc(_auth_user_id uuid)
RETURNS TABLE(new_balance numeric, reward numeric, last_mined_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prev timestamptz;
  reward_amt numeric;
  out_balance numeric;
  out_last timestamptz;
BEGIN
  IF _auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT u.last_mine_at
    INTO prev
    FROM public.users u
    WHERE u.auth_user_id = _auth_user_id
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
    WHERE u.auth_user_id = _auth_user_id
    RETURNING u.dgc_balance, u.last_mine_at INTO out_balance, out_last;

  UPDATE public.profiles p
    SET dgc_balance = out_balance,
        last_mined_at = out_last
    WHERE p.id = _auth_user_id;

  new_balance := out_balance;
  last_mined_at := out_last;
  reward := reward_amt;
  RETURN NEXT;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.mine_dgc(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mine_dgc(uuid) TO service_role;

DROP FUNCTION IF EXISTS public.purchase_curio(uuid);

CREATE OR REPLACE FUNCTION public.purchase_curio(_auth_user_id uuid, _curio_id uuid)
RETURNS TABLE(new_balance numeric, seller_id uuid, price numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c record;
  bal numeric;
BEGIN
  IF _auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, owner_id, price, currency
    INTO c
    FROM public.curiosities
    WHERE id = _curio_id
    FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Curio not found'; END IF;
  IF c.owner_id = _auth_user_id THEN RAISE EXCEPTION 'You already own this curio'; END IF;
  IF c.currency <> 'DGC' THEN RAISE EXCEPTION 'Only DGC purchases supported'; END IF;

  SELECT dgc_balance
    INTO bal
    FROM public.users
    WHERE auth_user_id = _auth_user_id
    FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'User row not found. Please sign in again.'; END IF;
  IF bal < c.price THEN RAISE EXCEPTION 'Insufficient DGC balance'; END IF;

  UPDATE public.users
    SET dgc_balance = dgc_balance - c.price
    WHERE auth_user_id = _auth_user_id
    RETURNING dgc_balance INTO new_balance;

  UPDATE public.users
    SET dgc_balance = dgc_balance + c.price
    WHERE auth_user_id = c.owner_id;

  UPDATE public.curiosities
    SET owner_id = _auth_user_id
    WHERE id = _curio_id;

  UPDATE public.profiles p
    SET dgc_balance = u.dgc_balance
    FROM public.users u
    WHERE p.id = u.auth_user_id
      AND p.id IN (_auth_user_id, c.owner_id);

  seller_id := c.owner_id;
  price := c.price;
  RETURN NEXT;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.purchase_curio(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_curio(uuid, uuid) TO service_role;