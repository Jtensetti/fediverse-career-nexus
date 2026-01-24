-- Create job_conversations table to track messaging between job applicants and posters
-- This allows messaging without requiring a connection, tied to a specific job post

CREATE TABLE public.job_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_post_id UUID NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    poster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(job_post_id, applicant_id)
);

CREATE INDEX idx_job_conversations_job ON public.job_conversations(job_post_id);
CREATE INDEX idx_job_conversations_applicant ON public.job_conversations(applicant_id);
CREATE INDEX idx_job_conversations_poster ON public.job_conversations(poster_id);

ALTER TABLE public.job_conversations ENABLE ROW LEVEL SECURITY;

-- Both applicant and poster can view their job conversations
CREATE POLICY "Users can view their job conversations"
ON public.job_conversations FOR SELECT
USING (auth.uid() = applicant_id OR auth.uid() = poster_id);

-- Users can create job conversations (as applicant)
CREATE POLICY "Users can create job conversations"
ON public.job_conversations FOR INSERT
WITH CHECK (auth.uid() = applicant_id);

-- Add job_conversation_id to messages table to link messages to job conversations
ALTER TABLE public.messages ADD COLUMN job_conversation_id UUID REFERENCES public.job_conversations(id) ON DELETE CASCADE;

CREATE INDEX idx_messages_job_conversation ON public.messages(job_conversation_id);

-- Update the can_message_user function to allow messaging through job conversations
CREATE OR REPLACE FUNCTION public.can_message_user(sender_id UUID, recipient_id UUID, job_post_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
    is_connected BOOLEAN := FALSE;
    has_job_conversation BOOLEAN := FALSE;
    job_active BOOLEAN := FALSE;
BEGIN
    -- Cannot message yourself
    IF sender_id = recipient_id THEN
        RETURN jsonb_build_object(
            'can_message', FALSE,
            'is_federated', FALSE,
            'reason', 'cannot_message_self'
        );
    END IF;
    
    -- Check if job_post_id is provided (job inquiry context)
    IF job_post_id IS NOT NULL THEN
        -- Check if job is active
        SELECT is_active INTO job_active
        FROM job_posts
        WHERE id = job_post_id AND (user_id = recipient_id OR user_id = sender_id);
        
        IF job_active THEN
            RETURN jsonb_build_object(
                'can_message', TRUE,
                'is_federated', FALSE,
                'reason', 'job_inquiry'
            );
        END IF;
        
        -- Check if there's an existing conversation for this job
        SELECT EXISTS (
            SELECT 1 FROM job_conversations 
            WHERE job_conversations.job_post_id = can_message_user.job_post_id
            AND ((applicant_id = sender_id AND poster_id = recipient_id) 
                 OR (applicant_id = recipient_id AND poster_id = sender_id))
        ) INTO has_job_conversation;
        
        IF has_job_conversation THEN
            RETURN jsonb_build_object(
                'can_message', TRUE,
                'is_federated', FALSE,
                'reason', 'existing_job_conversation'
            );
        END IF;
    END IF;
    
    -- Check for existing connection
    SELECT EXISTS (
        SELECT 1 FROM connections 
        WHERE status = 'connected'
        AND ((requester_id = sender_id AND recipient_id = can_message_user.recipient_id)
             OR (requester_id = can_message_user.recipient_id AND recipient_id = sender_id))
    ) INTO is_connected;
    
    IF is_connected THEN
        RETURN jsonb_build_object(
            'can_message', TRUE,
            'is_federated', FALSE,
            'reason', 'connected'
        );
    END IF;
    
    -- Check if recipient is federated (has remote_actor_url in actors)
    SELECT jsonb_build_object(
        'can_message', TRUE,
        'is_federated', TRUE,
        'remote_actor_url', a.remote_actor_url,
        'reason', 'federated_user'
    ) INTO result
    FROM actors a
    WHERE a.user_id = recipient_id
    AND a.remote_actor_url IS NOT NULL;
    
    IF result IS NOT NULL THEN
        RETURN result;
    END IF;
    
    -- Not connected and not federated
    RETURN jsonb_build_object(
        'can_message', FALSE,
        'is_federated', FALSE,
        'reason', 'not_connected'
    );
END;
$$;

-- Enable realtime for job_conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_conversations;