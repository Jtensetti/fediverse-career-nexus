
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import i18n from "@/i18n";

// =============== Payload Helpers ===============
// Normalize text: trim and convert empty strings to null
const normalizeText = (value: string | undefined | null): string | null => {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

// Normalize multiline text: preserve internal line breaks, only trim leading/trailing whitespace
const normalizeMultilineText = (value: string | undefined | null): string | null => {
  if (value === undefined || value === null) return null;
  // Normalize line endings (CRLF -> LF) and trim only the very start/end
  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  return normalized === '' ? null : normalized;
};

// Normalize date: ensure YYYY-MM-DD format or null
const normalizeDate = (value: string | undefined | null): string | null => {
  if (value === undefined || value === null) return null;
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed === '') return null;

  // If it's already a valid YYYY-MM-DD format, return it
  const dateOnly = trimmed.substring(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;

  // Try to parse and format the date
  try {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Fall through to return null
  }

  return null;
};

// Normalize year: ensure valid integer or null
const normalizeYear = (value: number | string | undefined | null): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (isNaN(parsed)) return null;
  return parsed;
};

// Editable rows also represent an unsaved form, which has no database ID yet.
type EditableRow<T, Required extends keyof T> = Pick<T, Required> & Partial<Omit<T, Required>>;
export type Experience = EditableRow<import('@/integrations/supabase/types').Tables<'experiences'>, 'user_id' | 'title' | 'company' | 'start_date' | 'is_current_role'>;
export type Education = EditableRow<import('@/integrations/supabase/types').Tables<'education'>, 'user_id' | 'institution' | 'degree' | 'field' | 'start_year'>;
export type Skill = EditableRow<import('@/integrations/supabase/types').Tables<'skills'>, 'user_id' | 'name'>;

// Experience Services
export const getUserExperiences = async (userId?: string) => {
  try {
    // Determine target user ID - use provided ID or fall back to current user
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) {
      console.error('No user ID available for fetching experiences');
      return [];
    }

    const { data, error } = await supabase
      .from('experiences')
      .select('*')
      .eq('user_id', targetUserId)
      .order('is_current_role', { ascending: false })
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user experiences:', error);
    toast.error(i18n.t("profileCV.experienceLoadFailed"));
    return [];
  }
};

export const createExperience = async (experience: Experience) => {
  try {
    // Ensure user_id is set
    let userId = experience.user_id;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      } else {
        throw new Error("User not authenticated");
      }
    }

    // Validate start_date is provided and valid
    const normalizedStartDate = normalizeDate(experience.start_date);
    if (!normalizedStartDate) {
      throw new Error("Start date is required and must be a valid date");
    }

    // Build a sanitized payload with only valid columns
    const payload = {
      user_id: userId,
      title: normalizeText(experience.title) || '',
      company: normalizeText(experience.company) || '',
      company_domain: normalizeText(experience.company_domain),
      location: normalizeText(experience.location),
      start_date: normalizedStartDate,
      end_date: experience.is_current_role ? null : normalizeDate(experience.end_date),
      is_current_role: experience.is_current_role || false,
      description: normalizeMultilineText(experience.description),
    };

    const { data, error } = await supabase
      .from('experiences')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Database error creating experience:', JSON.stringify(error, null, 2));
      throw new Error(error.message || 'Database error');
    }

    toast(i18n.t("profileCV.experienceAdded"));

    return data;
  } catch (error: any) {
    console.error('Error creating experience:', error);
    toast.error(i18n.t("profileCV.experienceAddFailed"));
    return null;
  }
};

export const updateExperience = async (id: string, experience: Partial<Experience>) => {
  try {
    // Build a sanitized payload with only valid columns (exclude id, created_at, updated_at, user_id)
    const payload: Record<string, any> = {};

    if (experience.title !== undefined) payload.title = normalizeText(experience.title) || '';
    if (experience.company !== undefined) payload.company = normalizeText(experience.company) || '';
    if (experience.company_domain !== undefined) payload.company_domain = normalizeText(experience.company_domain);
    if (experience.location !== undefined) payload.location = normalizeText(experience.location);
    if (experience.start_date !== undefined) payload.start_date = normalizeDate(experience.start_date);
    if (experience.is_current_role !== undefined) payload.is_current_role = experience.is_current_role;
    if (experience.end_date !== undefined || experience.is_current_role) {
      payload.end_date = experience.is_current_role ? null : normalizeDate(experience.end_date);
    }
    if (experience.description !== undefined) payload.description = normalizeMultilineText(experience.description);

    const { data, error } = await supabase
      .from('experiences')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error updating experience:', error);
      throw new Error(error.message || 'Database error');
    }

    toast(i18n.t("profileCV.experienceUpdated"));

    return data;
  } catch (error: any) {
    console.error('Error updating experience:', error);
    toast.error(i18n.t("profileCV.experienceUpdateFailed"));
    return null;
  }
};

export const deleteExperience = async (id: string) => {
  try {
    const { error } = await supabase
      .from('experiences')
      .delete()
      .eq('id', id);

    if (error) throw error;

    toast(i18n.t("profileCV.experienceDeleted"));

    return true;
  } catch (error) {
    console.error('Error deleting experience:', error);
    toast.error(i18n.t("profileCV.experienceDeleteFailed"));
    return false;
  }
};

// Education Services
export const getUserEducation = async (userId?: string) => {
  try {
    // Determine target user ID - use provided ID or fall back to current user
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) {
      console.error('No user ID available for fetching education');
      return [];
    }

    const { data, error } = await supabase
      .from('education')
      .select('*')
      .eq('user_id', targetUserId)
      .order('start_year', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user education:', error);
    toast.error(i18n.t("profileCV.educationLoadFailed"));
    return [];
  }
};

export const createEducation = async (education: Education) => {
  try {
    // Ensure user_id is set
    let userId = education.user_id;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      } else {
        throw new Error("User not authenticated");
      }
    }

    // Build a sanitized payload with only valid columns
    const payload = {
      user_id: userId,
      institution: normalizeText(education.institution) || '',
      degree: normalizeText(education.degree) || '',
      field: normalizeText(education.field),
      start_year: normalizeYear(education.start_year),
      end_year: normalizeYear(education.end_year),
    };

    const { data, error } = await supabase
      .from('education')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Database error creating education:', error);
      throw new Error(error.message || 'Database error');
    }

    toast(i18n.t("profileCV.educationAdded"));

    return data;
  } catch (error: any) {
    console.error('Error creating education:', error);
    toast.error(i18n.t("profileCV.educationAddFailed"));
    return null;
  }
};

export const updateEducation = async (id: string, education: Partial<Education>) => {
  try {
    // Build a sanitized payload with only valid columns
    const payload: Record<string, any> = {};

    if (education.institution !== undefined) payload.institution = normalizeText(education.institution) || '';
    if (education.degree !== undefined) payload.degree = normalizeText(education.degree) || '';
    if (education.field !== undefined) payload.field = normalizeText(education.field);
    if (education.start_year !== undefined) payload.start_year = normalizeYear(education.start_year);
    if (education.end_year !== undefined) payload.end_year = normalizeYear(education.end_year);

    const { data, error } = await supabase
      .from('education')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error updating education:', error);
      throw new Error(error.message || 'Database error');
    }

    toast(i18n.t("profileCV.educationUpdated"));

    return data;
  } catch (error: any) {
    console.error('Error updating education:', error);
    toast.error(i18n.t("profileCV.educationUpdateFailed"));
    return null;
  }
};

export const deleteEducation = async (id: string) => {
  try {
    const { error } = await supabase
      .from('education')
      .delete()
      .eq('id', id);

    if (error) throw error;

    toast(i18n.t("profileCV.educationDeleted"));

    return true;
  } catch (error) {
    console.error('Error deleting education:', error);
    toast.error(i18n.t("profileCV.educationDeleteFailed"));
    return false;
  }
};

// Skills Services
export const getUserSkills = async (userId?: string) => {
  try {
    // Determine target user ID - use provided ID or fall back to current user
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) {
      console.error('No user ID available for fetching skills');
      return [];
    }

    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('user_id', targetUserId)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user skills:', error);
    toast.error(i18n.t("profileCV.skillsLoadFailed"));
    return [];
  }
};

export const createSkill = async (skill: Skill) => {
  try {
    // Ensure user_id is set
    if (!skill.user_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        skill.user_id = user.id;
      } else {
        throw new Error("User not authenticated");
      }
    }

    const { data, error } = await supabase
      .from('skills')
      .insert({ name: skill.name, user_id: skill.user_id })
      .select()
      .single();

    if (error) {
      // Check if error is due to unique constraint violation
      if (error.code === '23505') {
        toast.error(i18n.t("profileCV.skillDuplicate"));
      } else {
        throw error;
      }
      return null;
    }

    toast(i18n.t("profileCV.skillAdded"));

    return data;
  } catch (error) {
    console.error('Error creating skill:', error);
    toast.error(i18n.t("profileCV.skillAddFailed"));
    return null;
  }
};

export const deleteSkill = async (id: string) => {
  try {
    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('id', id);

    if (error) throw error;

    toast(i18n.t("profileCV.skillDeleted"));

    return true;
  } catch (error) {
    console.error('Error deleting skill:', error);
    toast.error(i18n.t("profileCV.skillDeleteFailed"));
    return false;
  }
};
