
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

// Types
export type Conversation = {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  participants?: ConversationParticipant[];
  lastMessage?: DirectMessage;
};

export type ConversationParticipant = {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  is_active: boolean;
  encryption_public_key: string | null;
};

export type DirectMessage = {
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
};

export type MessageContent = {
  content: string;
  isEncrypted: boolean;
  encryptedContent?: string;
};

// Channel cache to prevent duplicate subscriptions
const channelCache: Record<string, RealtimeChannel> = {};

// Functions
export async function getConversations() {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      participants:conversation_participants(*)
    `)
    .order('last_message_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }

  return data as Conversation[];
}

export async function getConversationWithMessages(conversationId: string) {
  // Get conversation with participants
  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select(`
      *,
      participants:conversation_participants(*)
    `)
    .eq('id', conversationId)
    .single();

  if (conversationError) {
    console.error('Error fetching conversation:', conversationError);
    throw conversationError;
  }

  // Get messages for this conversation
  const { data: messages, error: messagesError } = await supabase
    .from('direct_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('Error fetching messages:', messagesError);
    throw messagesError;
  }

  return {
    conversation: conversation as Conversation,
    messages: messages as DirectMessage[]
  };
}

export async function createConversation(otherUserId: string) {
  // Call the Supabase function to create a conversation
  const { data, error } = await supabase
    .rpc('create_conversation', { other_user_id: otherUserId });

  if (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }

  return data as string; // Returns the conversation ID
}

export async function sendMessage(conversationId: string, messageContent: MessageContent) {
  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      conversation_id: conversationId,
      content: messageContent.content,
      encrypted_content: messageContent.encryptedContent || null,
      is_encrypted: messageContent.isEncrypted
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    throw error;
  }

  return data as DirectMessage;
}

export async function markMessageAsRead(messageId: string) {
  const { data, error } = await supabase
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }

  return data as DirectMessage;
}

export async function getOtherParticipant(conversation: Conversation, currentUserId: string) {
  if (!conversation.participants || conversation.participants.length < 2) {
    return null;
  }
  
  const otherParticipant = conversation.participants.find(p => p.user_id !== currentUserId);
  
  if (!otherParticipant) {
    return null;
  }
  
  // Get user details
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', otherParticipant.user_id)
    .single();

  if (error) {
    console.error('Error fetching participant profile:', error);
    return { id: otherParticipant.user_id, username: 'Unknown User' };
  }

  return data;
}

export function subscribeToMessages(
  conversationId: string, 
  onNewMessage: (message: DirectMessage) => void,
  onError: (error: any) => void
) {
  // If we already have a channel for this conversation, return it
  if (channelCache[conversationId]) {
    return channelCache[conversationId];
  }

  // Create a new channel
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        onNewMessage(payload.new as DirectMessage);
      }
    )
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') {
        onError(new Error(`Failed to subscribe: ${status}`));
      }
    });

  // Cache the channel
  channelCache[conversationId] = channel;
  return channel;
}

export function unsubscribeFromMessages(conversationId: string) {
  if (channelCache[conversationId]) {
    supabase.removeChannel(channelCache[conversationId]);
    delete channelCache[conversationId];
  }
}

// Optional: implement encryption helpers if needed
export const encryptionUtils = {
  generateKeyPair: async () => {
    // Implementation would depend on chosen encryption library
    // This is a placeholder
    return { publicKey: '', privateKey: '' };
  },
  
  encryptMessage: async (message: string, publicKey: string) => {
    // Implementation would depend on chosen encryption library
    // This is a placeholder
    return message;
  },
  
  decryptMessage: async (encryptedMessage: string, privateKey: string) => {
    // Implementation would depend on chosen encryption library
    // This is a placeholder
    return encryptedMessage;
  }
};
