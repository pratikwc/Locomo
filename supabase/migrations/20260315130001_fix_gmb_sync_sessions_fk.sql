/*
  # Fix gmb_sync_sessions foreign key

  The gmb_sync_sessions table has a FK to auth.users, but this app uses a custom
  users table with a custom auth system. We need to drop that FK and instead
  reference public.users so inserts don't silently fail.

  Also fix api_rate_limits and gmb_api_cache which have the same issue.
*/

ALTER TABLE public.gmb_sync_sessions DROP CONSTRAINT IF EXISTS gmb_sync_sessions_user_id_fkey;

ALTER TABLE public.gmb_sync_sessions
  ADD CONSTRAINT gmb_sync_sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.api_rate_limits DROP CONSTRAINT IF EXISTS api_rate_limits_user_id_fkey;

ALTER TABLE public.api_rate_limits
  ADD CONSTRAINT api_rate_limits_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.gmb_api_cache DROP CONSTRAINT IF EXISTS gmb_api_cache_user_id_fkey;

ALTER TABLE public.gmb_api_cache
  ADD CONSTRAINT gmb_api_cache_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
