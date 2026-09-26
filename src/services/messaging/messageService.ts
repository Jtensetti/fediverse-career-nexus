import { UserFacingError, userFacingErrorMessage } from '@/lib/userFacingError';
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { decryptIncomingMessage, encryptOutgoingMessage, inboxRevision } from './inboxKeysService';
import { MESSAGE_ENCRYPTION, type SealedMessage } from '@/lib/privateMessages';

import { tx } from "@/i18n/tx";
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
  encryption_version?: string;
  job_conversation_id?: string | null;
  sender_key_fingerprint?: string | null;
  recipient_key_fingerprint?: string | null;
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
  next: MessageCursor | null;
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
      toast.error(tx("ui.messageService.duMasteVaraInloggad"));
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
        read_at,
        created_at,
        is_federated,
        delivery_status
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching messages:', error);
      toast.error(tx("ui.messageService.failedToLoadConversations"));
      return [];
    }

    // Group messages by conversation partner
    const conversationMap = new Map<string, Message>();
    for (const msg of messages || []) {
      const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, { ...msg, content: '' } as Message);
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
    toast.error(tx("ui.messageService.kundeInteLaddaKonversationer"));
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
 * The server returns ciphertext. Only this browser opens new messages.
 */
export interface MessageCursor { id: string; created_at: string }
export interface MessagePage { messages: Message[]; next: MessageCursor | null }

export async function getMessagePage(partnerId: string, before?: MessageCursor): Promise<MessagePage> {
  const revision = inboxRevision();
  const { data, error } = await supabase.functions.invoke('encrypt-message', {
    body: { action: 'list', partnerId, before }
  });
  if (error || data?.error || !Array.isArray(data?.messages)) throw new UserFacingError('ui.messageConversation.felVidLaddningAv');
  const messages = await Promise.all(data.messages.map(readPrivateMessage));
  if (revision !== inboxRevision()) throw new UserFacingError('runtimeErrors.inboxLocked');
  return { ...data, messages };
}

async function readPrivateMessage(message: Message): Promise<Message> {
  if (message.encryption_version !== MESSAGE_ENCRYPTION) return message;
  const content = await decryptIncomingMessage(message as SealedMessage);
  return { ...message, content };
}

export async function getMessages(partnerId: string): Promise<Message[]> {
  return (await getMessagePage(partnerId)).messages;
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
 * Encrypt and send a local message to both participants.
 */
export async function sendMessage(recipientId: string, content: string, jobConversationId: string | null = null): Promise<Message> {
  const sealed = await encryptOutgoingMessage(recipientId, content, jobConversationId);
  const { data, error } = await supabase.functions.invoke('encrypt-message', {
    body: { action: 'send', partnerId: recipientId, ...sealed }
  });
  if (error || data?.error || !data?.message) throw new UserFacingError('ui.messageConversation.kundeInteSkickaMeddelande');
  return readPrivateMessage(data.message);
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

  // Fetch through the authenticated endpoint before opening a realtime message.
  const decryptSingleMessage = async (message: Message): Promise<Message> => {
    if (!message.is_encrypted || !message.encrypted_content) {
      return message;
    }

    try {
      const { data, error } = await supabase.functions.invoke('encrypt-message', {
        body: { action: 'read', messageId: message.id }
      });

      if (error || !data?.message) {
        console.error('Failed to decrypt real-time message:', error);
        return { ...message, content: tx('reviewUI.encryptedUnavailable') };
      }

      return await readPrivateMessage(data.message);
    } catch (err) {
      console.error('Decryption error for real-time message:', err);
      toast.error(userFacingErrorMessage(err, 'reviewUI.encryptedUnavailable'));
      return { ...message, content: tx('reviewUI.encryptedUnavailable') };
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

    const page = await getMessagePage(partnerId);

    return {
      conversation,
      ...page
    };
  } catch (error) {
    if (error instanceof UserFacingError) throw error;
    throw new UserFacingError('ui.messageService.kundeInteLaddaKonversationer');
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
export async function getOtherParticipant(conversation: Conversation): Promise<ParticipantInfo | null> {
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
    // Use public_profiles view for all lookups (excludes private profile fields)
    const { data: profile } = await supabase
      .from('public_profiles')
      .select('id, username, fullname, avatar_url')
      .eq('id', partnerId)
      .maybeSingle();

    if (profile?.id) {
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
