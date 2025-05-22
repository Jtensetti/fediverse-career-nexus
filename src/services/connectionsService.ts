
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConnectionDegree } from "@/components/ConnectionBadge";

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
}

export const getUserConnections = async (): Promise<NetworkConnection[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // First, fetch connections where the user is the initiator
    const { data: connections, error } = await supabase
      .from("user_connections")
      .select(`
        id,
        status,
        created_at,
        user_id,
        connected_user_id,
        connected_profile:profiles!connected_user_id(id, username, fullname, headline, avatar_url, is_verified)
      `)
      .eq("user_id", user.id)
      .eq("status", "accepted");

    if (error) {
      console.error("Error fetching connections:", error);
      return [];
    }

    // Get connections where the user is the receiver
    const { data: reverseConnections, error: reverseError } = await supabase
      .from("user_connections")
      .select(`
        id,
        status,
        created_at,
        user_id,
        connected_user_id,
        user_profile:profiles!user_id(id, username, fullname, headline, avatar_url, is_verified)
      `)
      .eq("connected_user_id", user.id)
      .eq("status", "accepted");

    if (reverseError) {
      console.error("Error fetching reverse connections:", reverseError);
      return [];
    }

    // Process regular connections (where user is the initiator)
    const normalizedConnections = connections?.map(connection => {
      // Check if connected_profile exists
      if (!connection.connected_profile) {
        console.warn("Connected profile is missing for connection:", connection.id);
        return null;
      }
      
      // Try to get the profile either as an array or as an object
      let profile;
      if (connection.connected_profile !== null) {
        if (Array.isArray(connection.connected_profile)) {
          profile = connection.connected_profile.length > 0 ? connection.connected_profile[0] : null;
        } else {
          profile = connection.connected_profile;
        }
      }
      
      if (!profile) {
        console.warn("Connected profile data is invalid for connection:", connection.id);
        return null;
      }
      
      return {
        id: connection.id,
        username: profile.username || "",
        displayName: profile.fullname || profile.username || "",
        headline: profile.headline || "",
        avatarUrl: profile.avatar_url || "",
        connectionDegree: 1 as ConnectionDegree,
        isVerified: profile.is_verified || false,
        mutualConnections: 0, 
      };
    }).filter(Boolean) as NetworkConnection[] || [];

    // Process reverse connections (where user is the receiver)
    const normalizedReverseConnections = reverseConnections?.map(connection => {
      // Check if user_profile exists
      if (!connection.user_profile) {
        console.warn("User profile is missing for reverse connection:", connection.id);
        return null;
      }
      
      // Try to get the profile either as an array or as an object
      let profile;
      if (connection.user_profile !== null) {
        if (Array.isArray(connection.user_profile)) {
          profile = connection.user_profile.length > 0 ? connection.user_profile[0] : null;
        } else {
          profile = connection.user_profile;
        }
      }
      
      if (!profile) {
        console.warn("User profile data is invalid for reverse connection:", connection.id);
        return null;
      }
      
      return {
        id: connection.id,
        username: profile.username || "",
        displayName: profile.fullname || profile.username || "",
        headline: profile.headline || "",
        avatarUrl: profile.avatar_url || "",
        connectionDegree: 1 as ConnectionDegree,
        isVerified: profile.is_verified || false,
        mutualConnections: 0,
      };
    }).filter(Boolean) as NetworkConnection[] || [];

    return [...normalizedConnections, ...normalizedReverseConnections];
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

    // Simple suggestion query - get users who are not connected to the current user
    const { data: suggestions, error } = await supabase
      .from("profiles")
      .select("id, username, fullname, headline, avatar_url, is_verified")
      .neq("id", user.id)
      .limit(10);

    if (error) {
      console.error("Error fetching connection suggestions:", error);
      return [];
    }

    // Filter out users who are already connected
    const { data: connections } = await supabase
      .from("user_connections")
      .select("connected_user_id, user_id")
      .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
      .in("status", ["accepted", "pending"]);

    const connectedUserIds = new Set<string>();
    
    if (connections) {
      connections.forEach(conn => {
        if (conn.user_id === user.id) {
          connectedUserIds.add(conn.connected_user_id);
        } else {
          connectedUserIds.add(conn.user_id);
        }
      });
    }

    const filteredSuggestions = suggestions?.filter(
      profile => !connectedUserIds.has(profile.id)
    ) || [];

    return filteredSuggestions.map(profile => ({
      id: profile.id,
      username: profile.username || "",
      displayName: profile.fullname || profile.username || "",
      headline: profile.headline || "",
      avatarUrl: profile.avatar_url || "",
      connectionDegree: 2 as ConnectionDegree, // Assume 2nd degree for suggestions
      isVerified: profile.is_verified || false,
      mutualConnections: 0
    }));
  } catch (error) {
    console.error("Error fetching connection suggestions:", error);
    toast.error("Failed to load connection suggestions");
    return [];
  }
};

export const sendConnectionRequest = async (userId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to connect with others");
      return false;
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

    if (error) {
      if (error.code === "23505") { // Unique constraint violation
        toast.error("You already have a connection or pending request with this user");
        return false;
      }
      throw error;
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

    const { error } = await supabase
      .from("user_connections")
      .update({ status: "accepted" })
      .eq("id", connectionId)
      .eq("connected_user_id", user.id);

    if (error) throw error;

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
