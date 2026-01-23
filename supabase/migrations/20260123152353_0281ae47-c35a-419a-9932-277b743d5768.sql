-- Add encryption columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS encrypted_content text,
ADD COLUMN IF NOT EXISTS is_encrypted boolean DEFAULT false;

-- Create index for efficient queries on encrypted status
CREATE INDEX IF NOT EXISTS idx_messages_is_encrypted ON public.messages(is_encrypted);

-- Comment for documentation
COMMENT ON COLUMN public.messages.encrypted_content IS 'AES-GCM encrypted message content (base64 encoded)';
COMMENT ON COLUMN public.messages.is_encrypted IS 'Whether the message content is encrypted';