import { publicMediaUrl } from "@/lib/media";

import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { tx } from "@/i18n/tx";
export interface ProfileUpdateData {
  username?: string;
  fullname?: string;
  headline?: string;
  bio?: string;
  phone?: string;
  location?: string;
  contact_email?: string;
}

/**
 * Checks if a username is available (not already taken)
 */
export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.rpc("is_username_available", { candidate: username.trim().toLowerCase() });

    if (error) {
      console.error("Error checking username availability:", error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error("Error checking username:", error);
    return false;
  }
};

/**
 * Updates a user's profile information in the database
 */
export const updateUserProfile = async (profileData: ProfileUpdateData): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('No user found in updateUserProfile');
      toast.error(tx("ui.profileEditService.duMasteVaraInloggad"));
      return false;
    }

    // Build update object, only including defined fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (profileData.username !== undefined) updateData.username = profileData.username.toLowerCase();
    if (profileData.fullname !== undefined) updateData.fullname = profileData.fullname;
    if (profileData.headline !== undefined) updateData.headline = profileData.headline;
    if (profileData.bio !== undefined) updateData.bio = profileData.bio;
    if (profileData.phone !== undefined) updateData.phone = profileData.phone;
    if (profileData.location !== undefined) updateData.location = profileData.location;
    if (profileData.contact_email !== undefined) updateData.contact_email = profileData.contact_email;

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      console.error('Profile update error:', error);
      toast.error(`Kunde inte uppdatera profil: ${error.message}`);
      return false;
    }

    toast.success(tx("ui.profileEditService.profilUppdaterad"));
    return true;
  } catch (error) {
    console.error("Error updating profile:", error);
    toast.error(tx("ui.profileEditService.kundeInteUppdateraProfil"));
    return false;
  }
};

/**
 * Uploads a profile avatar image to Supabase storage
 */
export const uploadProfileAvatar = async (file: File): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('No user found in uploadProfileAvatar');
      toast.error(tx("ui.profileEditService.duMasteVaraInloggad2"));
      return null;
    }

    // Generate a unique filename to prevent collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
    const filePath = fileName;

    // Upload image to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '0',
        upsert: false
      });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      toast.error(`Kunde inte ladda upp avatar: ${uploadError.message}`);
      return null;
    }

    // Get the public URL for the uploaded image
    const publicUrl = publicMediaUrl('avatars', filePath);

    // Update the profile with the new avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (updateError) {
      console.error('Avatar URL update error:', updateError);
      toast.error(`Kunde inte uppdatera profilbild: ${updateError.message}`);
      return null;
    }

    toast.success(tx("ui.profileEditService.avatarUppdaterad"));
    return publicUrl;
  } catch (error) {
    console.error("Error uploading avatar:", error);
    toast.error(tx("ui.profileEditService.kundeInteLaddaUpp"));
    return null;
  }
};

export const updateProfile = async (profileData: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('No user found in updateProfile');
      toast.error(tx("ui.profileEditService.duMasteVaraInloggad"));
      throw new Error('Du måste vara inloggad');
    }

    // Make sure we're updating the right fields
    const updateData = {
      ...profileData,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      toast.error(`Failed to update profile: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};
