
-- 1. Profiles: drop blanket-read policy; keep owner-only read.
DROP POLICY IF EXISTS "public columns readable" ON public.profiles;

-- Ensure public_profiles view is reachable by authenticated peers.
GRANT SELECT ON public.public_profiles TO authenticated;

-- 2. Explicit deny policies for pi_payments client mutations.
CREATE POLICY "deny client insert pi_payments" ON public.pi_payments
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "deny client update pi_payments" ON public.pi_payments
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny client delete pi_payments" ON public.pi_payments
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

-- 3. Explicit deny policies for users client mutations.
CREATE POLICY "deny client insert users" ON public.users
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "deny client update users" ON public.users
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny client delete users" ON public.users
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

COMMENT ON TABLE public.pi_payments IS 'Writes happen only via service-role server functions (create-pi-payment, complete-pi-payment). Client writes are explicitly denied.';
COMMENT ON TABLE public.users IS 'Writes happen only via the verifyPiAuth server function using the service role. Client writes are explicitly denied.';
