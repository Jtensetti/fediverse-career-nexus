-- Fix can_message_user to use the correct table (user_connections) 
-- and call the existing are_users_connected function for consistency.
DROP FUNCTION IF EXISTS public.can_message_user(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.can_message_user(
    p_sender_id uuid,
    p_recipient_id uuid,
    p_job_post_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_connected BOOLEAN := FALSE;
    has_job_conversation BOOLEAN := FALSE;
    job_active BOOLEAN := FALSE;
    recipient_is_remote BOOLEAN;
    recipient_actor_url TEXT;
BEGIN
    -- Cannot message yourself
    IF p_sender_id = p_recipient_id THEN
        RETURN jsonb_build_object(
            'can_message', FALSE,
            'is_federated', FALSE,
            'reason', 'cannot_message_self'
        );
    END IF;
    
    -- Check if job_post_id is provided (job inquiry context)
    IF p_job_post_id IS NOT NULL THEN
        -- Check if job is active
        SELECT is_active INTO job_active
        FROM job_posts
        WHERE id = p_job_post_id AND (user_id = p_recipient_id OR user_id = p_sender_id);
        
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
            WHERE job_conversations.job_post_id = p_job_post_id
            AND ((applicant_id = p_sender_id AND poster_id = p_recipient_id) 
                 OR (applicant_id = p_recipient_id AND poster_id = p_sender_id))
        ) INTO has_job_conversation;
        
        IF has_job_conversation THEN
            RETURN jsonb_build_object(
                'can_message', TRUE,
                'is_federated', FALSE,
                'reason', 'existing_job_conversation'
            );
        END IF;
    END IF;
    
    -- Use the existing are_users_connected function which correctly queries user_connections
    SELECT are_users_connected(p_sender_id, p_recipient_id) INTO is_connected;
    
    IF is_connected THEN
        RETURN jsonb_build_object(
            'can_message', TRUE,
            'is_federated', FALSE,
            'reason', 'connected'
        );
    END IF;
    
    -- Check if recipient is federated (has remote_actor_url in actors)
    SELECT a.is_remote, a.remote_actor_url 
    INTO recipient_is_remote, recipient_actor_url
    FROM actors a WHERE a.user_id = p_recipient_id;
    
    IF recipient_is_remote = TRUE AND recipient_actor_url IS NOT NULL THEN
        RETURN jsonb_build_object(
            'can_message', TRUE,
            'is_federated', TRUE,
            'remote_actor_url', recipient_actor_url,
            'reason', 'federated_user'
        );
    END IF;
    
    -- Not connected and not federated
    RETURN jsonb_build_object(
        'can_message', FALSE,
        'is_federated', FALSE,
        'reason', 'not_connected'
    );
END;
$$;