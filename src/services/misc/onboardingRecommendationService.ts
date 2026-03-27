import { supabase } from "@/integrations/supabase/client";

export interface RecommendedUser {
  user_id: string;
  username: string;
  fullname: string;
  headline: string;
  avatar_url: string;
  match_score: number;
  match_reason: string;
}

export const INTEREST_CATEGORIES = [
  { id: "design", label: "Design & UX", keywords: ["design", "designer", "ux", "ui", "product design", "graphic"] },
  { id: "engineering", label: "Engineering", keywords: ["developer", "engineer", "software", "code", "programming"] },
  { id: "ai", label: "AI & Machine Learning", keywords: ["ai", "ml", "machine learning", "data science", "artificial intelligence"] },
  { id: "marketing", label: "Marketing & Growth", keywords: ["marketing", "growth", "brand", "content", "seo"] },
  { id: "product", label: "Product Management", keywords: ["product manager", "pm", "product owner", "product"] },
  { id: "climate", label: "Climate & Sustainability", keywords: ["sustainability", "climate", "green", "environmental"] },
  { id: "startup", label: "Startups", keywords: ["founder", "entrepreneur", "startup", "ceo", "co-founder"] },
  { id: "opensource", label: "Open Source", keywords: ["open source", "oss", "foss", "community"] },
] as const;

export async function getOnboardingRecommendations(params: {
  headline?: string;
  role?: string;
  interests?: string[];
}): Promise<RecommendedUser[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Convert interest IDs to keywords for matching
  const interestKeywords = params.interests?.flatMap(interestId => {
    const category = INTEREST_CATEGORIES.find(c => c.id === interestId);
    return category ? category.keywords : [interestId];
  }) || [];

  const { data, error } = await supabase.rpc('get_onboarding_recommendations', {
    p_user_id: user.id,
    p_headline: params.headline || '',
    p_role: params.role || '',
    p_interests: interestKeywords,
    p_limit: 12
  });

  if (error) {
    console.error('Error fetching onboarding recommendations:', error);
    return [];
  }

  return (data as RecommendedUser[]) || [];
}

export async function followSelectedUsers(userIds: string[]): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const validUserIds = userIds.filter(id => id !== user.id);
  if (validUserIds.length === 0) return { success: true };

  const followRecords = validUserIds.map(authorId => ({
    follower_id: user.id,
    author_id: authorId,
    source: 'onboarding'
  }));

  const { error } = await supabase
    .from('author_follows')
    .upsert(followRecords, { 
      onConflict: 'follower_id,author_id',
      ignoreDuplicates: true 
    });

  if (error) {
    console.error('Error following users during onboarding:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
