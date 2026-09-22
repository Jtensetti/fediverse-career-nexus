import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import i18n from "@/i18n";
import { sendMessage } from './messageService';

export interface JobConversation {
  id: string;
  job_post_id: string;
  applicant_id: string;
  poster_id: string;
  created_at: string;
  updated_at: string;
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
      toast.error(i18n.t('toasts.loginRequiredConversation'));
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
      toast.error(i18n.t('toasts.messageSendFailed'));
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
      toast.error(i18n.t('toasts.loginRequiredMessage'));
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

    await sendMessage(recipientId, content, conversationId);

    return true;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : i18n.t('toasts.messageSendFailed'));
    return false;
  }
}
