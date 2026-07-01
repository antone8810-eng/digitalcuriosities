CREATE OR REPLACE FUNCTION public.purchase_curio(_auth_user_id uuid, _curio_id uuid)
RETURNS TABLE(new_balance numeric, seller_id uuid, price numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c_id uuid;
  c_owner uuid;
  c_price numeric;
  c_currency text;
  bal numeric;
  new_bal numeric;
BEGIN
  IF _auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT cu.id, cu.owner_id, cu.price, cu.currency::text
    INTO c_id, c_owner, c_price, c_currency
    FROM public.curiosities cu
    WHERE cu.id = _curio_id
    FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Curio not found'; END IF;
  IF c_owner = _auth_user_id THEN RAISE EXCEPTION 'You already own this curio'; END IF;
  IF c_currency <> 'DGC' THEN RAISE EXCEPTION 'Only DGC purchases supported'; END IF;

  SELECT u.dgc_balance
    INTO bal
    FROM public.users u
    WHERE u.auth_user_id = _auth_user_id
    FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'User row not found. Please sign in again.'; END IF;
  IF bal < c_price THEN RAISE EXCEPTION 'Insufficient DGC balance'; END IF;

  UPDATE public.users
    SET dgc_balance = dgc_balance - c_price
    WHERE auth_user_id = _auth_user_id
    RETURNING dgc_balance INTO new_bal;

  UPDATE public.users
    SET dgc_balance = dgc_balance + c_price
    WHERE auth_user_id = c_owner;

  UPDATE public.curiosities
    SET owner_id = _auth_user_id
    WHERE id = _curio_id;

  UPDATE public.profiles p
    SET dgc_balance = u.dgc_balance
    FROM public.users u
    WHERE p.id = u.auth_user_id
      AND p.id IN (_auth_user_id, c_owner);

  new_balance := new_bal;
  seller_id := c_owner;
  price := c_price;
  RETURN NEXT;
END;
$function$;