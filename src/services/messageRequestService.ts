import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MessageRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  preview_text: string | null;
  intro_template: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'ignored';
  created_at: string;
  responded_at: string | null;
  sender?: {
    id: string;
    username: string | null;
    fullname: string | null;
    avatar_url: string | null;
    headline: string | null;
  };
  recipient?: {
    id: string;
    username: string | null;
    fullname: string | null;
    avatar_url: string | null;
  };
}

export type DmPrivacy = 'everyone' | 'connections' | 'connections_plus' | 'nobody';

export const INTRO_TEMPLATES = [
  { id: 'mutual_connection', label: 'Mutual connection', template: "Hi! I noticed we're both connected to..." },
  { id: 'saw_post', label: 'Saw your post', template: "I saw your post about... and wanted to reach out." },
  { id: 'event', label: 'Event', template: "We both attended... and I'd love to connect!" },
  { id: 'opportunity', label: 'Opportunity', template: "I have an opportunity that might interest you..." },
  { id: 'custom', label: 'Custom message', template: "" }
];

// Send a message request
export async function sendMessageRequest(
  recipientId: string,
  message: string,
  introTemplate?: string
): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      toast.error('You must be logged in');
      return false;
    }

    const senderId = session.session.user.id;
    
    if (senderId === recipientId) {
      toast.error('You cannot send a request to yourself');
      return false;
    }

    // Check recipient's DM privacy settings
    const { data: recipient } = await supabase
      .from('profiles')
      .select('dm_privacy')
      .eq('id', recipientId)
      .single();

    const dmPrivacy = ((recipient as any)?.dm_privacy as DmPrivacy) || 'connections';

    if (dmPrivacy === 'nobody') {
      toast.error('This user is not accepting messages');
      return false;
    }

    // Check if already connected (if privacy is 'connections')
    if (dmPrivacy === 'connections') {
      const { data: connected } = await supabase
        .rpc('are_users_connected', { user1: senderId, user2: recipientId });
      
      if (connected) {
        // They're connected, they can message directly
        toast.info('You can message this person directly');
        return false;
      }
    }

    // Check for existing pending request
    const { data: existing } = await supabase
      .from('message_requests')
      .select('id, status')
      .eq('sender_id', senderId)
      .eq('recipient_id', recipientId)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'pending') {
        toast.error('You already have a pending request to this person');
        return false;
      } else if (existing.status === 'declined') {
        toast.error('Your previous request was declined');
        return false;
      }
    }

    const { error } = await supabase
      .from('message_requests')
      .upsert({
        sender_id: senderId,
        recipient_id: recipientId,
        preview_text: message.substring(0, 200),
        intro_template: introTemplate,
        status: 'pending'
      }, {
        onConflict: 'sender_id,recipient_id'
      });

    if (error) throw error;

    toast.success('Message request sent!');
    return true;
  } catch (error) {
    console.error('Error sending message request:', error);
    toast.error('Failed to send request');
    return false;
  }
}

// Get pending message requests (received)
export async function getReceivedMessageRequests(): Promise<MessageRequest[]> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return [];

    const { data, error } = await supabase
      .from('message_requests')
      .select('*')
      .eq('recipient_id', session.session.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get sender profiles
    const senderIds = (data || []).map(r => r.sender_id);
    if (senderIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from('public_profiles')
      .select('id, username, fullname, avatar_url, headline')
      .in('id', senderIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return (data || []).map(request => ({
      ...request,
      status: request.status as MessageRequest['status'],
      sender: profileMap.get(request.sender_id)
    }));
  } catch (error) {
    console.error('Error fetching message requests:', error);
    return [];
  }
}

// Get sent message requests
export async function getSentMessageRequests(): Promise<MessageRequest[]> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return [];

    const { data, error } = await supabase
      .from('message_requests')
      .select('*')
      .eq('sender_id', session.session.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get recipient profiles
    const recipientIds = (data || []).map(r => r.recipient_id);
    if (recipientIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from('public_profiles')
      .select('id, username, fullname, avatar_url')
      .in('id', recipientIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return (data || []).map(request => ({
      ...request,
      status: request.status as MessageRequest['status'],
      recipient: profileMap.get(request.recipient_id)
    }));
  } catch (error) {
    console.error('Error fetching sent requests:', error);
    return [];
  }
}

// Accept a message request
export async function acceptMessageRequest(requestId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('message_requests')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw error;
    toast.success('Request accepted! You can now message each other.');
    return true;
  } catch (error) {
    console.error('Error accepting request:', error);
    toast.error('Failed to accept request');
    return false;
  }
}

// Decline a message request
export async function declineMessageRequest(requestId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('message_requests')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw error;
    toast.success('Request declined');
    return true;
  } catch (error) {
    console.error('Error declining request:', error);
    toast.error('Failed to decline request');
    return false;
  }
}

// Get count of pending requests
export async function getPendingRequestCount(): Promise<number> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return 0;

    const { count, error } = await supabase
      .from('message_requests')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', session.session.user.id)
      .eq('status', 'pending');

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting pending count:', error);
    return 0;
  }
}

// Check if user can message another user directly
export async function canMessageDirectly(targetUserId: string): Promise<{
  canMessage: boolean;
  reason?: string;
  needsRequest?: boolean;
}> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      return { canMessage: false, reason: 'Not logged in' };
    }

    const currentUserId = session.session.user.id;

    // Check if connected
    const { data: connected } = await supabase
      .rpc('are_users_connected', { user1: currentUserId, user2: targetUserId });

    if (connected) {
      return { canMessage: true };
    }

    // Check target's DM privacy
    const { data: target } = await supabase
      .from('profiles')
      .select('dm_privacy')
      .eq('id', targetUserId)
      .single();

    const dmPrivacy = ((target as any)?.dm_privacy as DmPrivacy) || 'connections';

    if (dmPrivacy === 'everyone') {
      return { canMessage: true };
    }

    if (dmPrivacy === 'nobody') {
      return { canMessage: false, reason: 'User not accepting messages' };
    }

    // Check for accepted request
    const { data: request } = await supabase
      .from('message_requests')
      .select('status')
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},recipient_id.eq.${currentUserId})`)
      .eq('status', 'accepted')
      .maybeSingle();

    if (request) {
      return { canMessage: true };
    }

    return { canMessage: false, needsRequest: true, reason: 'Send a message request first' };
  } catch (error) {
    console.error('Error checking message permissions:', error);
    return { canMessage: false, reason: 'Error checking permissions' };
  }
}

// Update DM privacy setting
export async function updateDmPrivacy(privacy: DmPrivacy): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      toast.error('You must be logged in');
      return false;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ dm_privacy: privacy })
      .eq('id', session.session.user.id);

    if (error) throw error;
    toast.success('Message settings updated');
    return true;
  } catch (error) {
    console.error('Error updating DM privacy:', error);
    toast.error('Failed to update settings');
    return false;
  }
}
