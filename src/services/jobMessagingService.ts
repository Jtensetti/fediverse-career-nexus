import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface JobConversation {
  id: string;
  job_post_id: string;
  applicant_id: string;
  poster_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Check if user can message about a specific job
 */
export async function canMessageAboutJob(jobPostId: string, posterId: string): Promise<boolean> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return false;
    }

    const userId = sessionData.session.user.id;
    
    // Can't message yourself
    if (userId === posterId) {
      return false;
    }

    // Check if job is active
    const { data: job } = await supabase
      .from('job_posts')
      .select('is_active')
      .eq('id', jobPostId)
      .single();

    if (job?.is_active) {
      return true;
    }

    // Check if there's an existing conversation
    const { data: conversation } = await supabase
      .from('job_conversations')
      .select('id')
      .eq('job_post_id', jobPostId)
      .or(`applicant_id.eq.${userId},poster_id.eq.${userId}`)
      .single();

    return !!conversation;
  } catch (error) {
    console.error('Error checking job messaging permission:', error);
    return false;
  }
}

/**
 * Get or create a job conversation
 */
export async function getOrCreateJobConversation(
  jobPostId: string, 
  posterId: string
): Promise<JobConversation | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast.error('You must be logged in to start a conversation');
      return null;
    }

    const userId = sessionData.session.user.id;

    // Check for existing conversation
    const { data: existing } = await supabase
      .from('job_conversations')
      .select('*')
      .eq('job_post_id', jobPostId)
      .eq('applicant_id', userId)
      .single();

    if (existing) {
      return existing as JobConversation;
    }

    // Create new conversation
    const { data: newConversation, error } = await supabase
      .from('job_conversations')
      .insert({
        job_post_id: jobPostId,
        applicant_id: userId,
        poster_id: posterId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating job conversation:', error);
      toast.error('Failed to start conversation');
      return null;
    }

    return newConversation as JobConversation;
  } catch (error) {
    console.error('Error in getOrCreateJobConversation:', error);
    return null;
  }
}

/**
 * Send a message about a job
 */
export async function sendJobMessage(
  jobPostId: string,
  recipientId: string,
  content: string
): Promise<boolean> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast.error('You must be logged in to send messages');
      return false;
    }

    const userId = sessionData.session.user.id;

    // Get or create conversation
    let conversationId: string | null = null;
    
    // Check if we're the poster or applicant
    const { data: existingConv } = await supabase
      .from('job_conversations')
      .select('id')
      .eq('job_post_id', jobPostId)
      .or(`and(applicant_id.eq.${userId},poster_id.eq.${recipientId}),and(applicant_id.eq.${recipientId},poster_id.eq.${userId})`)
      .single();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      // Create new conversation (current user is applicant)
      const conversation = await getOrCreateJobConversation(jobPostId, recipientId);
      conversationId = conversation?.id || null;
    }

    if (!conversationId) {
      return false;
    }

    // Send the message
    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        recipient_id: recipientId,
        content,
        job_conversation_id: conversationId
      });

    if (error) {
      console.error('Error sending job message:', error);
      toast.error('Failed to send message');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in sendJobMessage:', error);
    return false;
  }
}

/**
 * Get messages for a job conversation
 */
export async function getJobConversationMessages(jobPostId: string, partnerId: string) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return [];
    }

    const userId = sessionData.session.user.id;

    // Get conversation
    const { data: conversation } = await supabase
      .from('job_conversations')
      .select('id')
      .eq('job_post_id', jobPostId)
      .or(`and(applicant_id.eq.${userId},poster_id.eq.${partnerId}),and(applicant_id.eq.${partnerId},poster_id.eq.${userId})`)
      .single();

    if (!conversation) {
      return [];
    }

    // Get messages for this conversation
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('job_conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching job messages:', error);
      return [];
    }

    return messages || [];
  } catch (error) {
    console.error('Error in getJobConversationMessages:', error);
    return [];
  }
}

/**
 * Get all job conversations for the current user
 */
export async function getUserJobConversations(): Promise<Array<JobConversation & { job_title?: string; partner_name?: string }>> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return [];
    }

    const userId = sessionData.session.user.id;

    const { data, error } = await supabase
      .from('job_conversations')
      .select(`
        *,
        job_posts!inner(title, company)
      `)
      .or(`applicant_id.eq.${userId},poster_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching job conversations:', error);
      return [];
    }

    return (data || []).map(conv => ({
      ...conv,
      job_title: (conv as any).job_posts?.title,
      partner_name: (conv as any).job_posts?.company
    }));
  } catch (error) {
    console.error('Error in getUserJobConversations:', error);
    return [];
  }
}
