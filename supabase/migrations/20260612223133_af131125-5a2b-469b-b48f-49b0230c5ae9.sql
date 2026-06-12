REVOKE EXECUTE ON FUNCTION public.sync_profile_to_pi_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_profile_to_pi_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_profile_to_pi_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_profile_to_pi_user() TO service_role;