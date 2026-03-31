-- Spring Clean: Drop unused tables and profile columns

-- Drop tables that have zero frontend references
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS cross_post_settings CASCADE;
DROP TABLE IF EXISTS event_attendees CASCADE;
DROP TABLE IF EXISTS post_reactions CASCADE;
DROP TABLE IF EXISTS post_boosts CASCADE;
DROP TABLE IF EXISTS security_incidents CASCADE;
DROP TABLE IF EXISTS user_cw_preferences CASCADE;

-- Drop unused columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS public_email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS show_email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS trust_level;