
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Simple message interface matching our database schema
export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  sender?: {
    id: string;
    username?: string;
    fullname?: string;
    avatar_url?: string;
  };
  recipient?: {
    id: string;
    username?: string;
    fullname?: string;
    avatar_url?: string;
  };
}

// Legacy interfaces for backward compatibility with existing components
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

export type DirectMessage = Message;

export interface MessageContent {
  content: string;
  isEncrypted: boolean;
  encryptedContent?: string;
}

export interface ConversationWithMessages {
  conversation: Conversation;
  messages: Message[];
}

// Store active channel subscriptions
const activeSubscriptions: Record<string, ReturnType<typeof supabase.channel>> = {};

/**
 * Get all conversations for the current user
 * This returns a list of unique users the current user has messaged with
 */
export async function getConversations(): Promise<Conversation[]> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast.error('You must be logged in to view conversations');
      return [];
    }

    const userId = sessionData.session.user.id;

    // Get all messages where user is sender or recipient
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        content,
        read_at,
        created_at
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load conversations');
      return [];
    }

    // Group messages by conversation partner
    const conversationMap = new Map<string, Message>();
    for (const msg of messages || []) {
      const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, msg as Message);
      }
    }

    // Convert to Conversation format
    const conversations: Conversation[] = [];
    for (const [partnerId, lastMessage] of conversationMap) {
      conversations.push({
        id: partnerId, // Use partner ID as conversation ID
        created_at: lastMessage.created_at,
        updated_at: lastMessage.created_at,
        last_message_at: lastMessage.created_at,
        lastMessage: lastMessage
      });
    }

    return conversations;
  } catch (error) {
    console.error('Error in getConversations:', error);
    toast.error('Failed to load conversations');
    return [];
  }
}

/**
 * Get a single conversation by ID (partner user ID)
 */
export async function getConversation(partnerId: string): Promise<Conversation | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return null;
    }

    const userId = sessionData.session.user.id;

    // Get the latest message with this partner
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !messages || messages.length === 0) {
      // Return a new empty conversation
      return {
        id: partnerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      };
    }

    const lastMessage = messages[0];
    return {
      id: partnerId,
      created_at: lastMessage.created_at,
      updated_at: lastMessage.created_at,
      last_message_at: lastMessage.created_at,
      lastMessage: lastMessage as Message
    };
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return null;
  }
}

/**
 * Get messages with a specific user
 */
export async function getMessages(partnerId: string): Promise<Message[]> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast.error('You must be logged in to view messages');
      return [];
    }

    const userId = sessionData.session.user.id;

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
      return [];
    }

    return (messages || []) as Message[];
  } catch (error) {
    console.error('Error in getMessages:', error);
    toast.error('Failed to load messages');
    return [];
  }
}

/**
 * Send a message to a user
 */
export async function sendMessage(recipientId: string, content: string): Promise<Message | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast.error('You must be logged in to send messages');
      return null;
    }

    const senderId = sessionData.session.user.id;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        content
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return null;
    }

    return data as Message;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    toast.error('Failed to send message');
    return null;
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(partnerId: string): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

    const userId = sessionData.session.user.id;

    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', partnerId)
      .eq('recipient_id', userId)
      .is('read_at', null);
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

/**
 * Subscribe to new messages
 */
export function subscribeToMessages(
  partnerId: string,
  onMessage: (message: Message) => void
): { unsubscribe: () => void } {
  const channelId = `messages:${partnerId}`;
  
  // Unsubscribe from existing channel if any
  if (activeSubscriptions[channelId]) {
    supabase.removeChannel(activeSubscriptions[channelId]);
  }

  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      (payload) => {
        const message = payload.new as Message;
        onMessage(message);
      }
    )
    .subscribe();

  activeSubscriptions[channelId] = channel;

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
      delete activeSubscriptions[channelId];
    }
  };
}

/**
 * Get unread message count
 */
export async function getUnreadMessageCount(): Promise<number> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return 0;

    const userId = sessionData.session.user.id;

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .is('read_at', null);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadMessageCount:', error);
    return 0;
  }
}

// Legacy function exports for backward compatibility
export const createConversation = async (participantId: string): Promise<Conversation | null> => {
  return getConversation(participantId);
};

export const getConversationMessages = getMessages;

export const sendMessageToConversation = async (conversationId: string, content: string): Promise<Message | null> => {
  return sendMessage(conversationId, content);
};

/**
 * Get conversation with all messages - for use by MessageConversation page
 */
export async function getConversationWithMessages(partnerId: string): Promise<ConversationWithMessages | null> {
  try {
    const conversation = await getConversation(partnerId);
    if (!conversation) return null;
    
    const messages = await getMessages(partnerId);
    
    return {
      conversation,
      messages
    };
  } catch (error) {
    console.error('Error in getConversationWithMessages:', error);
    return null;
  }
}

/**
 * Unsubscribe from message channel
 */
export function unsubscribeFromMessages(channelId: string): void {
  const fullChannelId = `messages:${channelId}`;
  if (activeSubscriptions[fullChannelId]) {
    supabase.removeChannel(activeSubscriptions[fullChannelId]);
    delete activeSubscriptions[fullChannelId];
  }
}

/**
 * Get the other participant's profile from a conversation
 */
export async function getOtherParticipant(conversation: Conversation, currentUserId: string): Promise<any> {
  try {
    const partnerId = conversation.id;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, fullname, avatar_url')
      .eq('id', partnerId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching participant profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getOtherParticipant:', error);
    return null;
  }
}
