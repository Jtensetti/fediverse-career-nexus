
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  participants?: ConversationParticipant[];
  lastMessage?: Message;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  is_active: boolean;
  encryption_public_key: string | null;
  user?: {
    id: string;
    username?: string;
    fullname?: string;
    avatar_url?: string;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  encrypted_content: string | null;
  is_encrypted: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sender?: {
    id: string;
    username?: string;
    fullname?: string;
    avatar_url?: string;
  };
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<Conversation[]> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast.error('You must be logged in to view conversations');
      return [];
    }

    const userId = sessionData.session.user.id;

    // Get all conversation IDs where the user is a participant
    const { data: participantsData, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (participantsError) throw participantsError;
    if (!participantsData || participantsData.length === 0) return [];

    const conversationIds = participantsData.map(p => p.conversation_id);

    // Get all conversations with these IDs
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false });

    if (conversationsError) throw conversationsError;
    if (!conversationsData) return [];

    // For each conversation, get the last message
    const conversationsWithLastMessage = await Promise.all(
      conversationsData.map(async (conversation) => {
        const { data: messagesData } = await supabase
          .from('direct_messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1);

        return {
          ...conversation,
          lastMessage: messagesData && messagesData.length > 0 ? messagesData[0] : undefined
        };
      })
    );

    return conversationsWithLastMessage;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    toast.error('Failed to load conversations');
    return [];
  }
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching conversation:', error);
    toast.error('Failed to load conversation');
    return null;
  }
}

/**
 * Get all messages for a conversation
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    toast.error('Failed to load messages');
    return [];
  }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(conversationId: string, content: string, isEncrypted = false, encryptedContent = ''): Promise<Message | null> {
  try {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    
    if (!userId) {
      toast.error('You must be logged in to send messages');
      return null;
    }
    
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        conversation_id: conversationId,
        content,
        encrypted_content: encryptedContent,
        is_encrypted: isEncrypted,
        sender_id: userId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    toast.error('Failed to send message');
    return null;
  }
}

/**
 * Create a new conversation with another user
 */
export async function createConversation(otherUserId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_conversation', {
      other_user_id: otherUserId
    });

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    toast.error(error.message || 'Failed to create conversation');
    return null;
  }
}

/**
 * Get conversation participants
 */
export async function getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]> {
  try {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching participants:', error);
    toast.error('Failed to load participants');
    return [];
  }
}

/**
 * Get the other participant in a conversation (for direct messages)
 */
export async function getOtherParticipant(conversation: Conversation, currentUserId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversation.id)
      .neq('user_id', currentUserId)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    
    if (data) {
      // Get user profile data
      // Note: You need to create a profiles table if you want to use it here
      // For now, we'll just return the user ID since we don't have a user profile table yet
      return { id: data.user_id };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching other participant:', error);
    return null;
  }
}

/**
 * Mark messages in a conversation as read
 */
export async function markMessagesAsRead(conversationId: string): Promise<boolean> {
  try {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    
    if (!userId) return false;
    
    const { error } = await supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return false;
  }
}
