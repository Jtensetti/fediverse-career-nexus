
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ConnectionDegree } from "@/components/ConnectionBadge";

// Connection Types
export interface Connection {
  id?: string;
  user_id: string;
  connected_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at?: string;
  updated_at?: string;
}

export interface ConnectionUser {
  id: string;
  username: string;
  displayName: string;
  headline?: string;
  avatarUrl?: string;
  connectionDegree?: ConnectionDegree;
  mutualConnections?: number;
}

// Get user's connections
export const getUserConnections = async (status = 'accepted') => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const { data, error } = await supabase
      .from('user_connections')
      .select('*, profiles!connected_user_id(*)')
      .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
      .eq('status', status);
    
    if (error) throw error;
    
    // Transform the data to return consistent structure regardless of which side of the connection the user is on
    return data.map(connection => {
      const isInitiator = connection.user_id === user.id;
      const otherUserId = isInitiator ? connection.connected_user_id : connection.user_id;
      
      return {
        id: connection.id,
        user_id: user.id,
        connected_user_id: otherUserId,
        status: connection.status,
        created_at: connection.created_at,
        updated_at: connection.updated_at,
        otherUser: connection.profiles
      };
    });
  } catch (error) {
    console.error('Error fetching user connections:', error);
    toast({
      variant: "destructive",
      title: "Failed to load connections",
      description: "There was an error loading your network connections."
    });
    return [];
  }
};

// Get connection suggestions
export const getConnectionSuggestions = async (limit = 10) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // This is a simplified approach - in a real app with lots of users,
    // you might want a more sophisticated recommendation algorithm
    const { data, error } = await supabase.rpc('get_connection_suggestions', { 
      current_user_id: user.id,
      limit_count: limit 
    });
    
    if (error) {
      console.error('Error in RPC:', error);
      // Fallback to a simple query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .limit(limit);
      
      if (fallbackError) throw fallbackError;
      return fallbackData || [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching connection suggestions:', error);
    toast({
      variant: "destructive",
      title: "Failed to load suggestions",
      description: "There was an error loading connection suggestions."
    });
    return [];
  }
};

// Create a connection request
export const sendConnectionRequest = async (connectedUserId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const connection: Connection = {
      user_id: user.id,
      connected_user_id: connectedUserId,
      status: 'pending'
    };
    
    const { data, error } = await supabase
      .from('user_connections')
      .insert(connection)
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique violation
        toast({
          title: "Connection already exists",
          description: "You already have a connection with this user."
        });
        return null;
      }
      throw error;
    }
    
    toast({
      title: "Connection requested",
      description: "Your connection request has been sent."
    });
    
    return data;
  } catch (error) {
    console.error('Error sending connection request:', error);
    toast({
      variant: "destructive",
      title: "Failed to send request",
      description: "There was an error sending your connection request."
    });
    return null;
  }
};

// Accept a connection request
export const acceptConnectionRequest = async (connectionId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const { data, error } = await supabase
      .from('user_connections')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', connectionId)
      .eq('connected_user_id', user.id) // Only the recipient can accept
      .select()
      .single();
    
    if (error) throw error;
    
    toast({
      title: "Connection accepted",
      description: "You are now connected with this user."
    });
    
    return data;
  } catch (error) {
    console.error('Error accepting connection request:', error);
    toast({
      variant: "destructive",
      title: "Failed to accept request",
      description: "There was an error accepting the connection request."
    });
    return null;
  }
};

// Reject a connection request
export const rejectConnectionRequest = async (connectionId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const { data, error } = await supabase
      .from('user_connections')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', connectionId)
      .eq('connected_user_id', user.id) // Only the recipient can reject
      .select()
      .single();
    
    if (error) throw error;
    
    toast({
      title: "Connection rejected",
      description: "You have rejected this connection request."
    });
    
    return data;
  } catch (error) {
    console.error('Error rejecting connection request:', error);
    toast({
      variant: "destructive",
      title: "Failed to reject request",
      description: "There was an error rejecting the connection request."
    });
    return null;
  }
};

// Remove a connection
export const removeConnection = async (connectionId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const { error } = await supabase
      .from('user_connections')
      .delete()
      .or(`and(user_id.eq.${user.id},id.eq.${connectionId}),and(connected_user_id.eq.${user.id},id.eq.${connectionId})`);
    
    if (error) throw error;
    
    toast({
      title: "Connection removed",
      description: "You have removed this connection."
    });
    
    return true;
  } catch (error) {
    console.error('Error removing connection:', error);
    toast({
      variant: "destructive",
      title: "Failed to remove connection",
      description: "There was an error removing the connection."
    });
    return false;
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
    
    // The function returns 1 (1st degree), 2 (2nd degree), or 3+ (other)
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
    return true; // Default to visible if error
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
    
    toast({
      title: "Settings updated",
      description: `Your network connections are now ${showNetworkConnections ? 'visible' : 'hidden'} to others.`
    });
    
    return true;
  } catch (error) {
    console.error('Error updating network visibility settings:', error);
    toast({
      variant: "destructive",
      title: "Failed to update settings",
      description: "There was an error updating your network visibility settings."
    });
    return false;
  }
};
