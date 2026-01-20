-- Fix corrupted ap_objects where content->content is a "char-map" object
-- (has keys "0", "1", "2"... from spreading a string) but also has a "content" field with the actual text

-- This updates Note objects that have a corrupt inner structure
UPDATE ap_objects
SET 
  content = jsonb_set(
    content,
    '{content}',
    jsonb_build_object(
      'type', COALESCE(content->'content'->>'type', 'Note'),
      'content', content->'content'->>'content',
      'inReplyTo', content->'content'->'inReplyTo',
      'rootPost', content->'content'->'rootPost',
      'actor', content->'content'->'actor',
      'published', content->'content'->'published',
      'updated', now()::text
    ) - 'null'
  ),
  updated_at = now()
WHERE 
  content->>'type' = 'Note'
  AND jsonb_typeof(content->'content') = 'object'
  AND content->'content' ? '0'
  AND content->'content' ? 'content'
  AND jsonb_typeof(content->'content'->'content') = 'string';