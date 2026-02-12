
-- Fix remaining tables: drop existing constraints first, then re-add with CASCADE

-- starter_pack_members
ALTER TABLE public.starter_pack_members DROP CONSTRAINT IF EXISTS starter_pack_members_user_id_fkey;
ALTER TABLE public.starter_pack_members
  ADD CONSTRAINT starter_pack_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_bans
ALTER TABLE public.user_bans DROP CONSTRAINT IF EXISTS user_bans_user_id_fkey;
ALTER TABLE public.user_bans
  ADD CONSTRAINT user_bans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_connections
ALTER TABLE public.user_connections DROP CONSTRAINT IF EXISTS user_connections_user_id_fkey;
ALTER TABLE public.user_connections
  ADD CONSTRAINT user_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_cw_preferences
ALTER TABLE public.user_cw_preferences DROP CONSTRAINT IF EXISTS user_cw_preferences_user_id_fkey;
ALTER TABLE public.user_cw_preferences
  ADD CONSTRAINT user_cw_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_feed_preferences
ALTER TABLE public.user_feed_preferences DROP CONSTRAINT IF EXISTS user_feed_preferences_user_id_fkey;
ALTER TABLE public.user_feed_preferences
  ADD CONSTRAINT user_feed_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_followed_packs
ALTER TABLE public.user_followed_packs DROP CONSTRAINT IF EXISTS user_followed_packs_user_id_fkey;
ALTER TABLE public.user_followed_packs
  ADD CONSTRAINT user_followed_packs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
