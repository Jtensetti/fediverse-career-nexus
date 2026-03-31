-- Drop dangerous exec_sql function that allows arbitrary SQL execution
DROP FUNCTION IF EXISTS public.exec_sql(text);