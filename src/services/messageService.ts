import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notificationService } from "./notificationService";

// Simple message interface matching our database schema
export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  is_federated?: boolean;
  delivery_status?: string;
  is_encrypted?: boolean;
  encrypted_content?: string | null;
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

export interface ParticipantInfo {
  id: string;
  username?: string;
  fullname?: string;
  avatar_url?: string;
  isFederated: boolean;
  homeInstance?: string;
  found: boolean;
}

export interface CanMessageResult {
  can_message: boolean;
  is_federated: boolean;
  remote_actor_url?: string;
  reason: string;
}

// Store active channel subscriptions
const activeSubscriptions: Record<string, ReturnType<typeof supabase.channel>> = {};

/**
 * Check if current user can message another user
 */
export async function canMessageUser(recipientId: string): Promise<CanMessageResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return { can_message: false, is_federated: false, reason: 'not_authenticated' };
    }

    const senderId = sessionData.session.user.id;

    const { data, error } = await supabase.rpc('can_message_user', {
      p_sender_id: senderId,
      p_recipient_id: recipientId
    });

    if (error) {
      console.error('Error checking message permission:', error);
      return { can_message: false, is_federated: false, reason: 'error' };
    }

    // Cast the JSONB response
    const result = data as unknown as CanMessageResult;
    return result || { can_message: false, is_federated: false, reason: 'error' };
  } catch (error) {
    console.error('Error in canMessageUser:', error);
    return { can_message: false, is_federated: false, reason: 'error' };
  }
}

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
        created_at,
        is_federated,
        delivery_status
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
 * Uses edge function for decryption of encrypted messages
 */
export async function getMessages(partnerId: string): Promise<Message[]> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast.error('You must be logged in to view messages');
      return [];
    }

    const userId = sessionData.session.user.id;

    // Fetch messages first
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

    // Check if any messages need decryption
    const hasEncrypted = messages?.some(m => m.is_encrypted && m.encrypted_content);
    
    if (!hasEncrypted) {
      return (messages || []) as Message[];
    }

    // Use edge function to decrypt messages
    try {
      const { data: decryptedData, error: decryptError } = await supabase.functions.invoke('encrypt-message', {
        body: { action: 'decrypt-batch', partnerId }
      });

      if (decryptError) {
        console.error('Error decrypting messages:', decryptError);
        // Fall back to returning messages as-is (with encrypted content masked)
        return (messages || []).map(m => ({
          ...m,
          content: m.is_encrypted ? '[Encrypted message]' : m.content
        })) as Message[];
      }

      return (decryptedData?.messages || messages || []) as Message[];
    } catch (decryptErr) {
      console.error('Decryption failed:', decryptErr);
      return (messages || []).map(m => ({
        ...m,
        content: m.is_encrypted ? '[Encrypted message]' : m.content
      })) as Message[];
    }
  } catch (error) {
    console.error('Error in getMessages:', error);
    toast.error('Failed to load messages');
    return [];
  }
}

/**
 * Check if two users are connected
 */
export async function areUsersConnected(userId1: string, userId2: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('are_users_connected', { user1: userId1, user2: userId2 });
    
    if (error) {
      console.error('Error checking connection status:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error in areUsersConnected:', error);
    return false;
  }
}

/**
 * Send a message to a user (handles both local and federated)
 */
export async function sendMessage(recipientId: string, content: string): Promise<Message | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast.error('You must be logged in to send messages');
      return null;
    }

    const senderId = sessionData.session.user.id;

    // Check messaging capability using new RPC
    const canMessageResult = await canMessageUser(recipientId);

    if (!canMessageResult.can_message) {
      if (canMessageResult.reason === 'not_connected') {
        toast.error('You can only message users you are connected with');
      } else if (canMessageResult.reason === 'cannot_message_self') {
        toast.error('You cannot message yourself');
      } else {
        toast.error('Cannot send message to this user');
      }
      return null;
    }

    // If federated, call edge function
    if (canMessageResult.is_federated && canMessageResult.remote_actor_url) {
      return await sendFederatedMessage(recipientId, content, canMessageResult.remote_actor_url);
    }

    // Encrypt the message content before storing
    let encryptedContent: string | null = null;
    let isEncrypted = false;
    
    try {
      const { data: encryptData, error: encryptError } = await supabase.functions.invoke('encrypt-message', {
        body: { action: 'encrypt', content }
      });
      
      if (encryptError) {
        console.error('Encryption error:', encryptError);
      } else if (encryptData?.encryptedContent) {
        encryptedContent = encryptData.encryptedContent;
        isEncrypted = true;
        console.log('Message encrypted successfully');
      } else {
        console.error('Encryption returned no data:', encryptData);
      }
    } catch (encryptErr) {
      console.error('Message encryption failed:', encryptErr);
    }

    // Local message - insert with encryption
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        content: isEncrypted ? '' : content, // Store empty content if encrypted
        encrypted_content: encryptedContent,
        is_encrypted: isEncrypted,
        is_federated: false,
        delivery_status: 'local'
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      // Check if it's an RLS violation (not connected)
      if (error.code === '42501' || error.message.includes('row-level security')) {
        toast.error('You can only message users you are connected with');
      } else {
        toast.error('Failed to send message');
      }
      return null;
    }
    
    // Return with decrypted content for immediate display
    const returnData = { ...data, content } as Message;

    // Create notification for the recipient
    try {
      await notificationService.createNotification({
        type: 'message',
        recipientId: recipientId,
        actorId: senderId,
        content: content.length > 100 ? content.substring(0, 100) + '...' : content,
        objectId: data.id,
        objectType: 'message'
      });
    } catch (notifError) {
      console.error('Failed to create message notification:', notifError);
    }

    return returnData;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    toast.error('Failed to send message');
    return null;
  }
}

/**
 * Send a federated message via edge function
 */
async function sendFederatedMessage(
  recipientId: string,
  content: string,
  remoteActorUrl: string
): Promise<Message | null> {
  try {
    const { data, error } = await supabase.functions.invoke('send-dm', {
      body: { recipientId, content, remoteActorUrl }
    });

    if (error) {
      console.error('Error sending federated message:', error);
      toast.error('Failed to send message to federated user');
      return null;
    }

    if (data.error) {
      console.error('Federated message error:', data.error);
      if (data.message) {
        // Message was stored but delivery failed
        toast.warning('Message saved but delivery to remote server failed');
        return data.message as Message;
      }
      toast.error('Failed to deliver message');
      return null;
    }

    toast.success('Message sent to federated user');
    return data.message as Message;
  } catch (error) {
    console.error('Error in sendFederatedMessage:', error);
    toast.error('Failed to send federated message');
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
 * Subscribe to new messages with a specific partner
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

  // Get current user id for filtering
  let currentUserId: string | null = null;
  supabase.auth.getSession().then(({ data }) => {
    currentUserId = data.session?.user?.id || null;
  });

  // Helper to decrypt a single message via edge function
  const decryptSingleMessage = async (message: Message): Promise<Message> => {
    if (!message.is_encrypted || !message.encrypted_content) {
      return message;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('encrypt-message', {
        body: { action: 'decrypt', messageId: message.id }
      });
      
      if (error || !data?.content) {
        console.error('Failed to decrypt real-time message:', error);
        return { ...message, content: '[Encrypted message]' };
      }
      
      return { ...message, content: data.content };
    } catch (err) {
      console.error('Decryption error for real-time message:', err);
      return { ...message, content: '[Encrypted message]' };
    }
  };

  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      async (payload) => {
        const message = payload.new as Message;
        // Only process messages for this conversation
        const isRelevant = 
          (message.sender_id === partnerId && message.recipient_id === currentUserId) ||
          (message.sender_id === currentUserId && message.recipient_id === partnerId);
        
        if (isRelevant) {
          // Decrypt encrypted messages before passing to callback
          const decryptedMessage = await decryptSingleMessage(message);
          onMessage(decryptedMessage);
        }
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
 * Get the other participant's profile from a conversation (handles both local and federated users)
 */
export async function getOtherParticipant(conversation: Conversation, currentUserId: string): Promise<ParticipantInfo | null> {
  try {
    const partnerId = conversation.id;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!partnerId || !uuidRegex.test(partnerId)) {
      console.error('Invalid partner ID format:', partnerId);
      return null;
    }

    // Use the RPC function to get participant info
    const { data, error } = await supabase.rpc('get_participant_info', {
      participant_id: partnerId
    });

    if (error) {
      console.error('Error fetching participant info:', error);
      // Fallback to direct query
      return await getParticipantFallback(partnerId);
    }

    // Cast the JSONB response
    const result = data as unknown as {
      id: string;
      username?: string;
      fullname?: string;
      avatar_url?: string;
      is_federated?: boolean;
      home_instance?: string;
      found: boolean;
    };

    if (!result || !result.found) {
      // Try fallback
      return await getParticipantFallback(partnerId);
    }

    return {
      id: result.id,
      username: result.username,
      fullname: result.fullname,
      avatar_url: result.avatar_url,
      isFederated: result.is_federated || false,
      homeInstance: result.home_instance,
      found: true
    };
  } catch (error) {
    console.error('Error in getOtherParticipant:', error);
    return null;
  }
}

/**
 * Fallback function to get participant info when RPC fails
 */
async function getParticipantFallback(partnerId: string): Promise<ParticipantInfo | null> {
  try {
    // Use public_profiles view for all lookups (bypasses RLS restrictions)
    const { data: profile } = await supabase
      .from('public_profiles')
      .select('id, username, fullname, avatar_url')
      .eq('id', partnerId)
      .maybeSingle();

    if (profile) {
      return {
        id: profile.id,
        username: profile.username || undefined,
        fullname: profile.fullname || undefined,
        avatar_url: profile.avatar_url || undefined,
        isFederated: false,
        found: true
      };
    }

    // Check if this might be a federated user via the actors table
    const { data: actor } = await supabase
      .from('public_actors')
      .select('id, preferred_username, remote_actor_url, is_remote')
      .eq('user_id', partnerId)
      .maybeSingle();

    if (actor && actor.is_remote) {
      // Extract home instance from remote_actor_url
      let homeInstance: string | undefined;
      try {
        if (actor.remote_actor_url) {
          homeInstance = new URL(actor.remote_actor_url).host;
        }
      } catch {}

      return {
        id: partnerId,
        username: actor.preferred_username || undefined,
        isFederated: true,
        homeInstance,
        found: true
      };
    }

    return null;
  } catch (error) {
    console.error('Error in getParticipantFallback:', error);
    return null;
  }
}
