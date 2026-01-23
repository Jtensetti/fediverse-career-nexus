-- Allow reactions on messages (previously only post/reply)
ALTER TABLE public.reactions
  DROP CONSTRAINT IF EXISTS reactions_target_type_check;

ALTER TABLE public.reactions
  ADD CONSTRAINT reactions_target_type_check
  CHECK (
    target_type = ANY (ARRAY['post'::text, 'reply'::text, 'message'::text])
  );