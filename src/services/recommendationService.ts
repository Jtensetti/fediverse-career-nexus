import { supabase } from "@/integrations/supabase/client";
import { notificationService } from "./notificationService";

export type RecommendationStatus = 'pending' | 'approved' | 'rejected' | 'requested';
export type RelationshipType = 'colleague' | 'manager' | 'direct_report' | 'client' | 'mentor' | 'other';

export interface Recommendation {
  id: string;
  recommender_id: string;
  recipient_id: string;
  relationship: RelationshipType;
  position_at_time: string | null;
  content: string;
  status: RecommendationStatus;
  created_at: string;
  updated_at: string;
  recommender?: {
    id: string;
    fullname: string | null;
    username: string | null;
    avatar_url: string | null;
    headline: string | null;
  };
  recipient?: {
    id: string;
    fullname: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

// Helper to enrich recommendations with profile data from public_profiles view
async function enrichWithProfiles(recommendations: any[], profileField: 'recommender_id' | 'recipient_id', targetField: 'recommender' | 'recipient'): Promise<Recommendation[]> {
  if (recommendations.length === 0) return [];

  const userIds = [...new Set(recommendations.map(r => r[profileField]).filter(Boolean))];
  
  if (userIds.length === 0) {
    return recommendations as Recommendation[];
  }

  const { data: profiles } = await supabase
    .from('public_profiles')
    .select('id, fullname, username, avatar_url, headline')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  return recommendations.map(rec => ({
    ...rec,
    [targetField]: rec[profileField] ? profileMap.get(rec[profileField]) || null : null
  })) as Recommendation[];
}

export const recommendationService = {
  async getReceivedRecommendations(userId: string): Promise<Recommendation[]> {
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('recipient_id', userId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }

    return enrichWithProfiles(data || [], 'recommender_id', 'recommender');
  },

  async getPendingRecommendations(): Promise<Recommendation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('recipient_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) return [];
    return enrichWithProfiles(data || [], 'recommender_id', 'recommender');
  },

  async getGivenRecommendations(): Promise<Recommendation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('recommender_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return [];
    return enrichWithProfiles(data || [], 'recipient_id', 'recipient');
  },

  async writeRecommendation(params: {
    recipientId: string;
    relationship: RelationshipType;
    content: string;
    positionAtTime?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    if (user.id === params.recipientId) {
      return { success: false, error: "You can't recommend yourself" };
    }

    const { error } = await supabase
      .from('recommendations')
      .insert({
        recommender_id: user.id,
        recipient_id: params.recipientId,
        relationship: params.relationship,
        content: params.content,
        position_at_time: params.positionAtTime,
        status: 'pending',
      });

    if (error) {
      console.error('Error writing recommendation:', error);
      return { success: false, error: error.message };
    }

    // Notify the recipient
    await notificationService.createNotification({
      type: 'recommendation_received',
      recipientId: params.recipientId,
      actorId: user.id,
      content: 'wrote you a recommendation',
      objectType: 'profile',
      objectId: params.recipientId,
    });

    return { success: true };
  },

  async updateStatus(recommendationId: string, status: 'approved' | 'rejected'): Promise<boolean> {
    const { error } = await supabase
      .from('recommendations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', recommendationId);

    if (error) {
      console.error('Error updating recommendation status:', error);
      return false;
    }

    return true;
  },

  async requestRecommendation(userId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Just send a notification - the actual recommendation will be written by the other user
    await notificationService.createNotification({
      type: 'recommendation_request',
      recipientId: userId,
      actorId: user.id,
      content: 'requested a recommendation from you',
      objectType: 'profile',
      objectId: user.id,
    });

    return true;
  },

  getRelationshipLabel(relationship: RelationshipType): string {
    const labels: Record<RelationshipType, string> = {
      colleague: 'Colleague',
      manager: 'Manager',
      direct_report: 'Direct Report',
      client: 'Client',
      mentor: 'Mentor',
      other: 'Other',
    };
    return labels[relationship] || 'Other';
  },
};
