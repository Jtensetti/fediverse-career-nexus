
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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
    toast.error("Failed to load experiences", { description: "There was an error loading your experience data." });
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

    toast("Experience added", { description: "Your experience has been successfully added to your profile." });

    return data;
  } catch (error: any) {
    console.error('Error creating experience:', error);
    toast.error("Failed to add experience", { description: error?.message || "There was an error adding your experience." });
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

    toast("Experience updated", { description: "Your experience has been successfully updated." });

    return data;
  } catch (error: any) {
    console.error('Error updating experience:', error);
    toast.error("Failed to update experience", { description: error?.message || "There was an error updating your experience." });
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

    toast("Experience deleted", { description: "Your experience has been successfully removed." });

    return true;
  } catch (error) {
    console.error('Error deleting experience:', error);
    toast.error("Failed to delete experience", { description: "There was an error removing your experience." });
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
    toast.error("Failed to load education", { description: "There was an error loading your education data." });
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

    toast("Education added", { description: "Your education has been successfully added to your profile." });

    return data;
  } catch (error: any) {
    console.error('Error creating education:', error);
    toast.error("Failed to add education", { description: error?.message || "There was an error adding your education." });
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

    toast("Education updated", { description: "Your education has been successfully updated." });

    return data;
  } catch (error: any) {
    console.error('Error updating education:', error);
    toast.error("Failed to update education", { description: error?.message || "There was an error updating your education." });
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

    toast("Education deleted", { description: "Your education has been successfully removed." });

    return true;
  } catch (error) {
    console.error('Error deleting education:', error);
    toast.error("Failed to delete education", { description: "There was an error removing your education." });
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
    toast.error("Failed to load skills", { description: "There was an error loading your skills data." });
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
        toast.error("Duplicate skill", { description: "This skill already exists in your profile." });
      } else {
        throw error;
      }
      return null;
    }

    toast("Skill added", { description: "Your skill has been successfully added to your profile." });

    return data;
  } catch (error) {
    console.error('Error creating skill:', error);
    toast.error("Failed to add skill", { description: "There was an error adding your skill." });
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

    toast("Skill deleted", { description: "Your skill has been successfully removed." });

    return true;
  } catch (error) {
    console.error('Error deleting skill:', error);
    toast.error("Failed to delete skill", { description: "There was an error removing your skill." });
    return false;
  }
};
