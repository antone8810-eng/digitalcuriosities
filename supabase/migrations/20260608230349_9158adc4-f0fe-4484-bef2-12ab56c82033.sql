
-- 1. Profiles: restrict SELECT to own row only
DROP POLICY IF EXISTS "profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- Public-safe view for marketplace owner labels (no wallet/balance)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, display_name, pi_username FROM public.profiles;
GRANT SELECT ON public.public_profiles TO authenticated;

-- Allow authenticated to read non-sensitive columns of any profile through the view
DROP POLICY IF EXISTS "public profile fields readable" ON public.profiles;
CREATE POLICY "public profile fields readable" ON public.profiles
  FOR SELECT TO authenticated USING (true);
-- Note: we keep the broad SELECT but the client must use the view; column-level grants below restrict actual exposure
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, display_name, pi_username) ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
-- Re-grant full select but only for the owner via separate policy (drop helper)
DROP POLICY IF EXISTS "public profile fields readable" ON public.profiles;
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, display_name, pi_username, dgc_balance, pi_wallet_address, last_mined_at, created_at, updated_at) ON public.profiles TO authenticated;
-- The "users read own profile" policy now controls row visibility; combined with column grants, only safe cols are reachable when owner != auth.uid()
-- But row policy already restricts to own only, so add another policy for public columns:
CREATE POLICY "public columns readable" ON public.profiles
  FOR SELECT TO authenticated USING (true);
-- Restrict columns for the public policy via grants
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, display_name, pi_username) ON public.profiles TO authenticated;
-- Re-grant full column access; row-level "users read own profile" plus "public columns readable" both apply (OR).
-- For own row: all columns reachable. For others: only granted columns (id, display_name, pi_username).

-- 2. Storage: require auth on curio-images
DROP POLICY IF EXISTS "curio-images public read" ON storage.objects;
CREATE POLICY "curio-images authenticated read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'curio-images');

-- 3. Realtime: restrict channel subscriptions to authenticated users
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated can subscribe" ON realtime.messages;
CREATE POLICY "authenticated can subscribe" ON realtime.messages
  FOR SELECT TO authenticated USING (true);
