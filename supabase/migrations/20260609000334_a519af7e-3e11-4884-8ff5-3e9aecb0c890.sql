ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vip_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.pi_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id TEXT NOT NULL UNIQUE,
  txid TEXT,
  amount NUMERIC NOT NULL,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pi_payments TO authenticated;
GRANT ALL ON public.pi_payments TO service_role;

ALTER TABLE public.pi_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own pi payments" ON public.pi_payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER pi_payments_set_updated_at
  BEFORE UPDATE ON public.pi_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();