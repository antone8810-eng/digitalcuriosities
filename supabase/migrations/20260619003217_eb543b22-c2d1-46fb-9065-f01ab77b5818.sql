UPDATE public.users
SET dgc_balance = GREATEST(dgc_balance, 4)
WHERE id = 'e8b13211-a8d0-4aac-905c-543931443312'
  AND pi_username = 'Lina251013';

UPDATE public.profiles p
SET dgc_balance = u.dgc_balance,
    last_mined_at = u.last_mine_at,
    vip_until = u.vip_until
FROM public.users u
WHERE p.id = u.auth_user_id
  AND u.id = 'e8b13211-a8d0-4aac-905c-543931443312'
  AND u.pi_username = 'Lina251013';