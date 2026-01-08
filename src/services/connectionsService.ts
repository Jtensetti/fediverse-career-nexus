
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConnectionDegree } from "@/components/ConnectionBadge";
import { notificationService } from "./notificationService";

export interface NetworkConnection {
  id: string;
  username: string;
  displayName: string;
  headline: string;
  avatarUrl: string;
  connectionDegree: ConnectionDegree;
  isVerified: boolean;
  mutualConnections: number;
}

export interface NetworkSuggestion {
  id: string;
  username: string;
  displayName: string;
  headline: string;
  avatarUrl: string;
  connectionDegree: ConnectionDegree;
  mutualConnections: number;
  suggestionReason?: string;
}

export const getUserConnections = async (): Promise<NetworkConnection[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: connections, error } = await supabase
      .from("user_connections")
      .select("id, user_id, connected_user_id, status")
      .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
      .eq("status", "accepted");

    if (error) {
      console.error("Error fetching connections:", error);
      return [];
    }

    const otherUserIds = Array.from(
      new Set(
        (connections || []).map((c: any) =>
          c.user_id === user.id ? c.connected_user_id : c.user_id
        )
      )
    );

    if (otherUserIds.length === 0) return [];

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, fullname, headline, avatar_url, is_verified")
      .in("id", otherUserIds);

    if (profilesError) {
      console.error("Error fetching connection profiles:", profilesError);
      return [];
    }

    const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

    return (connections || [])
      .map((c: any) => {
        const otherId = c.user_id === user.id ? c.connected_user_id : c.user_id;
        const profile = profileById.get(otherId);
        if (!profile) return null;

        return {
          id: c.id,
          username: profile.username || "",
          displayName: profile.fullname || profile.username || "",
          headline: profile.headline || "",
          avatarUrl: profile.avatar_url || "",
          connectionDegree: 1 as ConnectionDegree,
          isVerified: profile.is_verified || false,
          mutualConnections: 0,
        };
      })
      .filter(Boolean) as NetworkConnection[];
  } catch (error) {
    console.error("Error fetching connections:", error);
    toast.error("Failed to load connections");
    return [];
  }
};

export const getConnectionSuggestions = async (): Promise<NetworkSuggestion[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Use the smart suggestions RPC function
    const { data: suggestions, error } = await supabase
      .rpc('get_smart_suggestions', { p_user_id: user.id, p_limit: 10 });

    if (error) {
      console.error("Error fetching smart suggestions:", error);
      // Fall back to simple query if RPC fails
      return await getSimpleSuggestions(user.id);
    }

    if (!suggestions || suggestions.length === 0) {
      // Fall back to simple query if no smart suggestions found
      return await getSimpleSuggestions(user.id);
    }

    return suggestions.map((profile: any) => ({
      id: profile.user_id,
      username: profile.username || "",
      displayName: profile.fullname || profile.username || "",
      headline: profile.headline || "",
      avatarUrl: profile.avatar_url || "",
      connectionDegree: profile.mutual_count > 0 ? 2 as ConnectionDegree : 3 as ConnectionDegree,
      isVerified: profile.is_verified || false,
      mutualConnections: Number(profile.mutual_count) || 0,
      suggestionReason: profile.suggestion_reason || "Suggested for you"
    }));
  } catch (error) {
    console.error("Error fetching connection suggestions:", error);
    toast.error("Failed to load connection suggestions");
    return [];
  }
};

// Fallback simple suggestions when RPC is unavailable
const getSimpleSuggestions = async (userId: string): Promise<NetworkSuggestion[]> => {
  const { data: suggestions, error } = await supabase
    .from("profiles")
    .select("id, username, fullname, headline, avatar_url, is_verified")
    .neq("id", userId)
    .limit(10);

  if (error || !suggestions) return [];

  // Filter out users who are already connected
  const { data: connections } = await supabase
    .from("user_connections")
    .select("connected_user_id, user_id")
    .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`)
    .in("status", ["accepted", "pending"]);

  const connectedUserIds = new Set<string>();
  
  if (connections) {
    connections.forEach(conn => {
      if (conn.user_id === userId) {
        connectedUserIds.add(conn.connected_user_id);
      } else {
        connectedUserIds.add(conn.user_id);
      }
    });
  }

  const filteredSuggestions = suggestions.filter(
    profile => !connectedUserIds.has(profile.id)
  );

  return filteredSuggestions.map(profile => ({
    id: profile.id,
    username: profile.username || "",
    displayName: profile.fullname || profile.username || "",
    headline: profile.headline || "",
    avatarUrl: profile.avatar_url || "",
    connectionDegree: 3 as ConnectionDegree,
    isVerified: profile.is_verified || false,
    mutualConnections: 0,
    suggestionReason: "Suggested for you"
  }));
};

export const sendConnectionRequest = async (userId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to connect with others");
      return false;
    }

    if (user.id === userId) {
      toast.error("You can't connect with yourself");
      return false;
    }

    // Check existing relationship in either direction.
    // This prevents duplicate records like:
    //  - A -> B pending
    //  - B -> A accepted
    const { data: existing, error: existingError } = await supabase
      .from("user_connections")
      .select("id, user_id, connected_user_id, status, created_at")
      .or(
        `and(user_id.eq.${user.id},connected_user_id.eq.${userId}),and(user_id.eq.${userId},connected_user_id.eq.${user.id})`
      )
      .order("created_at", { ascending: false });

    if (existingError) throw existingError;

    const rows = existing || [];

    const accepted = rows.find((r: any) => r.status === "accepted");
    if (accepted) {
      // Cleanup: remove any outgoing pending duplicates
      const outgoingDuplicate = rows.find(
        (r: any) => r.status === "pending" && r.user_id === user.id
      );

      if (outgoingDuplicate) {
        await supabase.from("user_connections").delete().eq("id", outgoingDuplicate.id);
      }

      toast.success("You're already connected");
      return true;
    }

    const incomingPending = rows.find(
      (r: any) => r.status === "pending" && r.user_id === userId && r.connected_user_id === user.id
    );
    if (incomingPending) {
      // If they already requested you, auto-accept.
      return await acceptConnectionRequest(incomingPending.id);
    }

    const outgoingPending = rows.find(
      (r: any) => r.status === "pending" && r.user_id === user.id && r.connected_user_id === userId
    );
    if (outgoingPending) {
      toast.success("Connection request already pending");
      return true;
    }

    const rejected = rows.find((r: any) => r.status === "rejected");
    if (rejected) {
      const { data: updated, error: updateError } = await supabase
        .from("user_connections")
        .update({
          user_id: user.id,
          connected_user_id: userId,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", rejected.id)
        .select()
        .single();

      if (updateError) throw updateError;

      try {
        await notificationService.createNotification({
          type: 'connection_request',
          recipientId: userId,
          actorId: user.id,
          content: 'sent you a connection request',
          objectId: updated.id,
          objectType: 'connection'
        });
      } catch (notifError) {
        console.warn('Failed to create connection notification:', notifError);
      }

      toast.success("Connection request sent");
      return true;
    }

    // Create the connection request
    const { data, error } = await supabase
      .from("user_connections")
      .insert({
        user_id: user.id,
        connected_user_id: userId,
        status: "pending"
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification for the recipient
    try {
      await notificationService.createNotification({
        type: 'connection_request',
        recipientId: userId,
        actorId: user.id,
        content: 'sent you a connection request',
        objectId: data.id,
        objectType: 'connection'
      });
    } catch (notifError) {
      console.warn('Failed to create connection notification:', notifError);
    }

    toast.success("Connection request sent");
    return true;
  } catch (error) {
    console.error("Error sending connection request:", error);
    toast.error("Failed to send connection request");
    return false;
  }
};

export const acceptConnectionRequest = async (connectionId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Get the connection to find the sender
    const { data: connection, error: connectionError } = await supabase
      .from("user_connections")
      .select("user_id")
      .eq("id", connectionId)
      .single();

    if (connectionError) throw connectionError;

    const { error } = await supabase
      .from("user_connections")
      .update({ 
        status: "accepted",
        updated_at: new Date().toISOString()
      })
      .eq("id", connectionId)
      .eq("connected_user_id", user.id);

    if (error) throw error;

    // Cleanup: if both users sent requests to each other, delete the duplicate pending row
    if (connection?.user_id) {
      await supabase
        .from("user_connections")
        .delete()
        .eq("status", "pending")
        .or(
          `and(user_id.eq.${user.id},connected_user_id.eq.${connection.user_id}),and(user_id.eq.${connection.user_id},connected_user_id.eq.${user.id})`
        );

      // Notify the original requester that their request was accepted
      try {
        await notificationService.createNotification({
          type: 'connection_accepted',
          recipientId: connection.user_id,
          actorId: user.id,
          content: 'accepted your connection request',
          objectId: connectionId,
          objectType: 'connection'
        });
      } catch (notifError) {
        console.warn('Failed to create acceptance notification:', notifError);
      }
    }

    toast.success("Connection accepted");
    return true;
  } catch (error) {
    console.error("Error accepting connection:", error);
    toast.error("Failed to accept connection");
    return false;
  }
};

export const rejectConnectionRequest = async (connectionId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("user_connections")
      .update({ status: "rejected" })
      .eq("id", connectionId)
      .eq("connected_user_id", user.id);

    if (error) throw error;

    toast.success("Connection rejected");
    return true;
  } catch (error) {
    console.error("Error rejecting connection:", error);
    toast.error("Failed to reject connection");
    return false;
  }
};

export const removeConnection = async (connectionId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("user_connections")
      .delete()
      .or(`and(user_id.eq.${user.id},id.eq.${connectionId}),and(connected_user_id.eq.${user.id},id.eq.${connectionId})`);

    if (error) throw error;

    toast.success("Connection removed");
    return true;
  } catch (error) {
    console.error("Error removing connection:", error);
    toast.error("Failed to remove connection");
    return false;
  }
};

export interface PendingConnectionRequest {
  id: string;
  username: string;
  displayName: string;
  headline: string;
  avatarUrl: string;
  createdAt: string;
}

export const getPendingConnectionRequests = async (): Promise<PendingConnectionRequest[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get pending requests where the current user is the recipient
    const { data: requests, error } = await supabase
      .from("user_connections")
      .select(`
        id,
        created_at,
        user_id,
        requester_profile:profiles!user_id(id, username, fullname, headline, avatar_url)
      `)
      .eq("connected_user_id", user.id)
      .eq("status", "pending");

    if (error) {
      console.error("Error fetching pending requests:", error);
      return [];
    }

    return (requests || []).map(request => {
      let profile;
      if (request.requester_profile !== null) {
        if (Array.isArray(request.requester_profile)) {
          profile = request.requester_profile.length > 0 ? request.requester_profile[0] : null;
        } else {
          profile = request.requester_profile;
        }
      }
      
      if (!profile) return null;
      
      return {
        id: request.id,
        username: profile.username || "",
        displayName: profile.fullname || profile.username || "",
        headline: profile.headline || "",
        avatarUrl: profile.avatar_url || "",
        createdAt: request.created_at,
      };
    }).filter(Boolean) as PendingConnectionRequest[];
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    toast.error("Failed to load connection requests");
  return [];
  }
};

// Get outgoing pending requests (requests the current user has sent)
export const getSentConnectionRequests = async (): Promise<string[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: rows, error } = await supabase
      .from("user_connections")
      .select("user_id, connected_user_id, status")
      .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
      .in("status", ["pending", "accepted"]);

    if (error) {
      console.error("Error fetching sent requests:", error);
      return [];
    }

    const accepted = new Set<string>();

    (rows || []).forEach((r: any) => {
      if (r.status !== 'accepted') return;
      const otherId = r.user_id === user.id ? r.connected_user_id : r.user_id;
      accepted.add(otherId);
    });

    const pendingOutgoing = (rows || [])
      .filter((r: any) => r.status === 'pending' && r.user_id === user.id)
      .map((r: any) => r.connected_user_id)
      .filter((otherId: string) => !accepted.has(otherId));

    return Array.from(new Set(pendingOutgoing));
  } catch (error) {
    console.error("Error fetching sent requests:", error);
    return [];
  }
};

export type ConnectionRelationshipStatus =
  | "none"
  | "accepted"
  | "pending_outgoing"
  | "pending_incoming"
  | "rejected";

export interface ConnectionRelationship {
  status: ConnectionRelationshipStatus;
  connectionId?: string;
}

export const getConnectionRelationship = async (
  targetUserId: string
): Promise<ConnectionRelationship> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { status: "none" };

    const { data: rows, error } = await supabase
      .from("user_connections")
      .select("id, user_id, connected_user_id, status, created_at")
      .or(
        `and(user_id.eq.${user.id},connected_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},connected_user_id.eq.${user.id})`
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    const accepted = (rows || []).find((r: any) => r.status === "accepted");
    if (accepted) return { status: "accepted", connectionId: accepted.id };

    const outgoing = (rows || []).find(
      (r: any) => r.status === "pending" && r.user_id === user.id
    );
    if (outgoing) return { status: "pending_outgoing", connectionId: outgoing.id };

    const incoming = (rows || []).find(
      (r: any) => r.status === "pending" && r.connected_user_id === user.id
    );
    if (incoming) return { status: "pending_incoming", connectionId: incoming.id };

    const rejected = (rows || []).find((r: any) => r.status === "rejected");
    if (rejected) return { status: "rejected", connectionId: rejected.id };

    return { status: "none" };
  } catch (error) {
    console.error("Error fetching connection relationship:", error);
    return { status: "none" };
  }
};

// Get connection degree between current user and another user
export const getConnectionDegree = async (targetUserId: string): Promise<ConnectionDegree> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    if (user.id === targetUserId) return 0 as ConnectionDegree;
    
    const { data, error } = await supabase
      .rpc('get_connection_degree', { 
        source_user_id: user.id, 
        target_user_id: targetUserId 
      });
    
    if (error) throw error;
    
    return (data <= 3 ? data as ConnectionDegree : null);
  } catch (error) {
    console.error('Error getting connection degree:', error);
    return null;
  }
};

// Get visibility settings for network connections
export const getProfileVisibilitySettings = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('show_network_connections')
      .eq('user_id', user.id)
      .single();
    
    if (error) throw error;
    
    return data?.show_network_connections ?? true;
  } catch (error) {
    console.error('Error fetching network visibility settings:', error);
    return true;
  }
};

// Update visibility settings for network connections
export const updateProfileVisibilitySettings = async (showNetworkConnections: boolean): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const { error } = await supabase
      .from('user_settings')
      .update({ 
        show_network_connections: showNetworkConnections,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    toast.success(`Your network connections are now ${showNetworkConnections ? 'visible' : 'hidden'} to others.`);
    
    return true;
  } catch (error) {
    console.error('Error updating network visibility settings:', error);
    toast.error("Failed to update network visibility settings");
    return false;
  }
};
