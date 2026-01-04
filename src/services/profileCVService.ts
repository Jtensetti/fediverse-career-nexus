
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Experience Types
export interface Experience {
  id?: string;
  user_id: string;
  title: string;
  company: string;
  company_domain?: string;
  location?: string;
  start_date: string;
  end_date?: string;
  is_current_role: boolean;
  description?: string;
  verification_status?: string;
  created_at?: string;
  updated_at?: string;
}

// Education Types
export interface Education {
  id?: string;
  user_id: string;
  institution: string;
  degree: string;
  field: string;
  start_year: number;
  end_year?: number;
  verification_status?: string;
  created_at?: string;
  updated_at?: string;
}

// Skill Types
export interface Skill {
  id?: string;
  user_id: string;
  name: string;
  endorsements?: number;
  created_at?: string;
}

// Experience Services
export const getUserExperiences = async (userId?: string) => {
  try {
    const { data, error } = await supabase
      .from('experiences')
      .select('*')
      .order('is_current_role', { ascending: false })
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user experiences:', error);
    toast({
      variant: "destructive",
      title: "Failed to load experiences",
      description: "There was an error loading your experience data."
    });
    return [];
  }
};

export const createExperience = async (experience: Experience) => {
  try {
    // Ensure user_id is set
    if (!experience.user_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        experience.user_id = user.id;
      } else {
        throw new Error("User not authenticated");
      }
    }
    
    const { data, error } = await supabase
      .from('experiences')
      .insert(experience)
      .select()
      .single();
    
    if (error) throw error;
    
    toast({
      title: "Experience added",
      description: "Your experience has been successfully added to your profile."
    });
    
    return data;
  } catch (error) {
    console.error('Error creating experience:', error);
    toast({
      variant: "destructive",
      title: "Failed to add experience",
      description: "There was an error adding your experience."
    });
    return null;
  }
};

export const updateExperience = async (id: string, experience: Partial<Experience>) => {
  try {
    const { data, error } = await supabase
      .from('experiences')
      .update(experience)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    toast({
      title: "Experience updated",
      description: "Your experience has been successfully updated."
    });
    
    return data;
  } catch (error) {
    console.error('Error updating experience:', error);
    toast({
      variant: "destructive",
      title: "Failed to update experience",
      description: "There was an error updating your experience."
    });
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
    
    toast({
      title: "Experience deleted",
      description: "Your experience has been successfully removed."
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting experience:', error);
    toast({
      variant: "destructive",
      title: "Failed to delete experience",
      description: "There was an error removing your experience."
    });
    return false;
  }
};

// Education Services
export const getUserEducation = async (userId?: string) => {
  try {
    const { data, error } = await supabase
      .from('education')
      .select('*')
      .order('start_year', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user education:', error);
    toast({
      variant: "destructive",
      title: "Failed to load education",
      description: "There was an error loading your education data."
    });
    return [];
  }
};

export const createEducation = async (education: Education) => {
  try {
    // Ensure user_id is set
    if (!education.user_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        education.user_id = user.id;
      } else {
        throw new Error("User not authenticated");
      }
    }
    
    const { data, error } = await supabase
      .from('education')
      .insert(education)
      .select()
      .single();
    
    if (error) throw error;
    
    toast({
      title: "Education added",
      description: "Your education has been successfully added to your profile."
    });
    
    return data;
  } catch (error) {
    console.error('Error creating education:', error);
    toast({
      variant: "destructive",
      title: "Failed to add education",
      description: "There was an error adding your education."
    });
    return null;
  }
};

export const updateEducation = async (id: string, education: Partial<Education>) => {
  try {
    const { data, error } = await supabase
      .from('education')
      .update(education)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    toast({
      title: "Education updated",
      description: "Your education has been successfully updated."
    });
    
    return data;
  } catch (error) {
    console.error('Error updating education:', error);
    toast({
      variant: "destructive",
      title: "Failed to update education",
      description: "There was an error updating your education."
    });
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
    
    toast({
      title: "Education deleted",
      description: "Your education has been successfully removed."
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting education:', error);
    toast({
      variant: "destructive",
      title: "Failed to delete education",
      description: "There was an error removing your education."
    });
    return false;
  }
};

// Skills Services
export const getUserSkills = async (userId?: string) => {
  try {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user skills:', error);
    toast({
      variant: "destructive",
      title: "Failed to load skills",
      description: "There was an error loading your skills data."
    });
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
      .insert(skill)
      .select()
      .single();
    
    if (error) {
      // Check if error is due to unique constraint violation
      if (error.code === '23505') {
        toast({
          variant: "destructive",
          title: "Duplicate skill",
          description: "This skill already exists in your profile."
        });
      } else {
        throw error;
      }
      return null;
    }
    
    toast({
      title: "Skill added",
      description: "Your skill has been successfully added to your profile."
    });
    
    return data;
  } catch (error) {
    console.error('Error creating skill:', error);
    toast({
      variant: "destructive",
      title: "Failed to add skill",
      description: "There was an error adding your skill."
    });
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
    
    toast({
      title: "Skill deleted",
      description: "Your skill has been successfully removed."
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting skill:', error);
    toast({
      variant: "destructive",
      title: "Failed to delete skill",
      description: "There was an error removing your skill."
    });
    return false;
  }
};

// Verification Services - Update status directly without RPC
export const requestExperienceVerification = async (experienceId: string) => {
  try {
    const { data, error } = await supabase
      .from('experiences')
      .update({ verification_status: 'pending' })
      .eq('id', experienceId)
      .select()
      .single();
    
    if (error) throw error;
    
    toast({
      title: "Verification requested",
      description: "Your experience verification request has been submitted."
    });
    
    return data;
  } catch (error) {
    console.error('Error requesting experience verification:', error);
    toast({
      variant: "destructive",
      title: "Verification request failed",
      description: "There was an error requesting verification for your experience."
    });
    return null;
  }
};

export const requestEducationVerification = async (educationId: string) => {
  try {
    const { data, error } = await supabase
      .from('education')
      .update({ verification_status: 'pending' })
      .eq('id', educationId)
      .select()
      .single();
    
    if (error) throw error;
    
    toast({
      title: "Verification requested",
      description: "Your education verification request has been submitted."
    });
    
    return data;
  } catch (error) {
    console.error('Error requesting education verification:', error);
    toast({
      variant: "destructive",
      title: "Verification request failed",
      description: "There was an error requesting verification for your education."
    });
    return null;
  }
};
