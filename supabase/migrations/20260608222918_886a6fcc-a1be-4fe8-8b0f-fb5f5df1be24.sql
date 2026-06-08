
-- purchase_curio RPC
CREATE OR REPLACE FUNCTION public.purchase_curio(_curio_id uuid)
RETURNS TABLE(new_balance numeric, seller_id uuid, price numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer uuid := auth.uid();
  c record;
  bal numeric;
BEGIN
  IF buyer IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id, owner_id, price, currency INTO c FROM public.curiosities WHERE id = _curio_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Curio not found'; END IF;
  IF c.owner_id = buyer THEN RAISE EXCEPTION 'You already own this curio'; END IF;
  IF c.currency <> 'DGC' THEN RAISE EXCEPTION 'Only DGC purchases supported'; END IF;

  SELECT dgc_balance INTO bal FROM public.profiles WHERE id = buyer FOR UPDATE;
  IF bal < c.price THEN RAISE EXCEPTION 'Insufficient DGC balance'; END IF;

  UPDATE public.profiles SET dgc_balance = dgc_balance - c.price WHERE id = buyer
    RETURNING dgc_balance INTO new_balance;
  UPDATE public.profiles SET dgc_balance = dgc_balance + c.price WHERE id = c.owner_id;
  UPDATE public.curiosities SET owner_id = buyer WHERE id = _curio_id;

  seller_id := c.owner_id;
  price := c.price;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purchase_curio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_curio(uuid) TO authenticated;

-- Storage policies for curio-images bucket
CREATE POLICY "curio-images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'curio-images');

CREATE POLICY "curio-images authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'curio-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "curio-images owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'curio-images' AND owner = auth.uid());

CREATE POLICY "curio-images owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'curio-images' AND owner = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.curiosities;
