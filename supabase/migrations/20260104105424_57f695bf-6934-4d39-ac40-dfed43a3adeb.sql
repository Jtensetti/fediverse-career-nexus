-- Fix handle_new_user to prevent duplicate key errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, username, created_at, updated_at)
  VALUES (NEW.id, 'user_' || substr(NEW.id::text, 1, 8), now(), now())
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create default user settings with ON CONFLICT to prevent duplicate key errors
  INSERT INTO public.user_settings (user_id, theme, show_network_connections)
  VALUES (NEW.id, 'system', true)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;