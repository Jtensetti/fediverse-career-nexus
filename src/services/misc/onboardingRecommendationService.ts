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
  { id: "samhallsplanering", label: "Samhällsplanering & infrastruktur", keywords: ["samhällsplanering", "stadsplanering", "infrastruktur", "trafik", "bygg", "plan- och bygglagen", "pbl"] },
  { id: "socialtjanst", label: "Socialtjänst & omsorg", keywords: ["socialtjänst", "socialsekreterare", "omsorg", "äldreomsorg", "lss", "ifo", "barn och unga"] },
  { id: "skola", label: "Skola & utbildning", keywords: ["skola", "rektor", "lärare", "förskola", "utbildning", "skolverket", "barn- och utbildning"] },
  { id: "vard", label: "Hälso- & sjukvård", keywords: ["sjukvård", "vård", "hälso", "region", "vårdcentral", "sjuksköterska", "läkare"] },
  { id: "digitalisering", label: "Digitalisering & e-förvaltning", keywords: ["digitalisering", "e-förvaltning", "it", "system", "digital", "tjänstedesign"] },
  { id: "upphandling", label: "Upphandling & inköp", keywords: ["upphandling", "inköp", "lou", "loi", "avtal", "leverantör"] },
  { id: "krisberedskap", label: "Säkerhet & krisberedskap", keywords: ["säkerhet", "krisberedskap", "civilförsvar", "msb", "totalförsvar", "informationssäkerhet"] },
  { id: "hallbarhet", label: "Hållbarhet & klimat", keywords: ["hållbarhet", "klimat", "miljö", "agenda 2030", "miljöstrategi"] },
  { id: "hr", label: "HR & kompetensförsörjning", keywords: ["hr", "personal", "kompetensförsörjning", "rekrytering", "arbetsmiljö"] },
  { id: "ekonomi", label: "Ekonomi & styrning", keywords: ["ekonomi", "controller", "budget", "styrning", "redovisning", "kommunal ekonomi"] },
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
