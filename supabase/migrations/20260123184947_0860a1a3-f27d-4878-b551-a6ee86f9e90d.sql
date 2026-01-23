-- Enable realtime for reactions table to support live reaction updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;