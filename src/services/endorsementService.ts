import { supabase } from "@/integrations/supabase/client";
import { notificationService } from "./notificationService";

export interface Endorsement {
  id: string;
  skill_id: string;
  endorser_id: string;
  created_at: string;
  endorser?: {
    id: string;
    fullname: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface SkillWithEndorsements {
  id: string;
  name: string;
  user_id: string;
  endorsements: number;
  endorsement_list: Endorsement[];
  user_has_endorsed: boolean;
}

export const endorsementService = {
  async getSkillsWithEndorsements(userId: string): Promise<SkillWithEndorsements[]> {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    // Get skills
    const { data: skills, error: skillsError } = await supabase
      .from('skills')
      .select('id, name, user_id, endorsements')
      .eq('user_id', userId)
      .order('endorsements', { ascending: false });

    if (skillsError || !skills) return [];

    // Get all endorsements for these skills
    const skillIds = skills.map(s => s.id);
    const { data: endorsementsData } = await supabase
      .from('skill_endorsements')
      .select('id, skill_id, endorser_id, created_at')
      .in('skill_id', skillIds);

    // Get unique endorser IDs and fetch their profiles from public_profiles view
    const endorserIds = [...new Set((endorsementsData || []).map(e => e.endorser_id))];
    const { data: profiles } = endorserIds.length > 0 
      ? await supabase.from('public_profiles').select('id, fullname, username, avatar_url').in('id', endorserIds)
      : { data: [] };
    
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Enrich endorsements with profile data
    const enrichedEndorsements = (endorsementsData || []).map(e => ({
      ...e,
      endorser: profileMap.get(e.endorser_id) || null
    }));

    // Map endorsements to skills
    return skills.map(skill => ({
      ...skill,
      endorsements: skill.endorsements || 0,
      endorsement_list: enrichedEndorsements
        .filter(e => e.skill_id === skill.id)
        .map(e => ({
          id: e.id,
          skill_id: e.skill_id,
          endorser_id: e.endorser_id,
          created_at: e.created_at,
          endorser: e.endorser as Endorsement['endorser'],
        })),
      user_has_endorsed: currentUser 
        ? enrichedEndorsements.some(e => e.skill_id === skill.id && e.endorser_id === currentUser.id)
        : false,
    }));
  },

  async endorseSkill(skillId: string, skillOwnerId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('skill_endorsements')
      .insert({
        skill_id: skillId,
        endorser_id: user.id,
      });

    if (error) {
      console.error('Error endorsing skill:', error);
      return false;
    }

    // Get skill name for notification
    const { data: skill } = await supabase
      .from('skills')
      .select('name')
      .eq('id', skillId)
      .single();

    // Create notification
    await notificationService.createNotification({
      type: 'endorsement',
      recipientId: skillOwnerId,
      actorId: user.id,
      content: `endorsed your skill: ${skill?.name || 'Unknown'}`,
      objectId: skillId,
      objectType: 'skill',
    });

    return true;
  },

  async removeEndorsement(skillId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('skill_endorsements')
      .delete()
      .eq('skill_id', skillId)
      .eq('endorser_id', user.id);

    if (error) {
      console.error('Error removing endorsement:', error);
      return false;
    }

    return true;
  },

  async toggleEndorsement(skillId: string, skillOwnerId: string, currentlyEndorsed: boolean): Promise<boolean> {
    if (currentlyEndorsed) {
      return this.removeEndorsement(skillId);
    } else {
      return this.endorseSkill(skillId, skillOwnerId);
    }
  },
};
