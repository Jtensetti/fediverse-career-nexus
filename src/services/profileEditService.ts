import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { createUserActor } from "./actorService";

export interface ProfileUpdateData {
  fullname?: string;
  headline?: string;
  bio?: string;
  phone?: string;
  location?: string;
}

/**
 * Updates a user's profile information in the database
 */
export const updateUserProfile = async (profileData: ProfileUpdateData): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to update your profile");
      return false;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        fullname: profileData.fullname,
        headline: profileData.headline,
        bio: profileData.bio,
        phone: profileData.phone,
        location: profileData.location,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (error) throw error;

    toast.success("Profile updated successfully");
    return true;
  } catch (error) {
    console.error("Error updating profile:", error);
    toast.error("Failed to update profile");
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
      toast.error("You must be logged in to upload an avatar");
      return null;
    }

    // Generate a unique filename to prevent collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${uuidv4()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload image to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get the public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Update the profile with the new avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (updateError) throw updateError;

    toast.success("Avatar updated successfully");
    return publicUrl;
  } catch (error) {
    console.error("Error uploading avatar:", error);
    toast.error("Failed to upload avatar");
    return null;
  }
};

export const updateProfile = async (profileData: any) => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      throw new Error('You must be logged in to update your profile');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', session.session.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // If username was updated and this is the first time setting it, create actor
    if (profileData.username) {
      // Check if user has an actor
      const { data: existingActor } = await supabase
        .from('actors')
        .select('id')
        .eq('user_id', session.session.user.id)
        .single();

      if (!existingActor) {
        console.log('Creating actor for new username:', profileData.username);
        const actorCreated = await createUserActor(session.session.user.id);
        if (actorCreated) {
          console.log('Actor created successfully');
        } else {
          console.warn('Failed to create actor, but profile update succeeded');
        }
      }
    }

    return data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};
