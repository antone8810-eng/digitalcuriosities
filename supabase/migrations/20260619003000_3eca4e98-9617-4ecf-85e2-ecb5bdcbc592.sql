WITH completed_vip AS (
  SELECT
    user_id,
    max(updated_at) + (count(*)::int * INTERVAL '30 days') AS restored_vip_until
  FROM public.pi_payments
  WHERE status = 'completed'
  GROUP BY user_id
)
UPDATE public.users u
SET vip_until = GREATEST(u.vip_until, completed_vip.restored_vip_until)
FROM completed_vip
WHERE u.auth_user_id = completed_vip.user_id;

UPDATE public.profiles p
SET vip_until = u.vip_until
FROM public.users u
WHERE p.id = u.auth_user_id
  AND u.vip_until IS NOT NULL;