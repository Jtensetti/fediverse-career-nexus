import { supabase } from "@/integrations/supabase/client";

export type SectionVisibility = 'everyone' | 'logged_in' | 'connections';

export const PROFILE_SECTIONS = [
  'experience', 'education', 'skills', 'articles', 'activity', 'connections'
] as const;

export type ProfileSection = typeof PROFILE_SECTIONS[number];

export interface SectionVisibilityMap {
  [section: string]: SectionVisibility;
}

const DEFAULT_VISIBILITY: SectionVisibility = 'everyone';

export async function getSectionVisibility(userId: string): Promise<SectionVisibilityMap> {
  const { data, error } = await supabase
    .from('profile_section_visibility')
    .select('section, visibility')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching section visibility:', error);
    return {};
  }

  const map: SectionVisibilityMap = {};
  for (const row of data || []) {
    map[row.section] = row.visibility as SectionVisibility;
  }
  return map;
}

export async function updateSectionVisibility(
  section: ProfileSection,
  visibility: SectionVisibility
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('profile_section_visibility')
    .upsert(
      { user_id: user.id, section, visibility, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,section' }
    );

  if (error) {
    console.error('Error updating section visibility:', error);
    return false;
  }
  return true;
}

export function canViewSection(
  sectionVisibility: SectionVisibility | undefined,
  isAuthenticated: boolean,
  isConnected: boolean
): boolean {
  const visibility = sectionVisibility || DEFAULT_VISIBILITY;
  
  switch (visibility) {
    case 'everyone':
      return true;
    case 'logged_in':
      return isAuthenticated;
    case 'connections':
      return isConnected;
    default:
      return true;
  }
}
