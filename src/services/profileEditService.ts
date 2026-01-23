
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { createUserActor } from "./actorService";

export interface ProfileUpdateData {
  username?: string;
  fullname?: string;
  headline?: string;
  bio?: string;
  phone?: string;
  location?: string;
}

/**
 * Checks if a username is available (not already taken)
 */
export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username.toLowerCase())
      .neq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error checking username availability:", error);
      return false;
    }

    return !data; // Available if no matching profile found
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
    console.log('👤 updateUserProfile - Current user:', {
      user_id: user?.id,
      email: user?.email,
      user_exists: !!user
    });
    
    if (!user) {
      console.error('❌ No user found in updateUserProfile');
      toast.error("You must be logged in to update your profile");
      return false;
    }

    console.log('📝 Updating profile with data:', profileData);

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

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      console.error('❌ Profile update error:', error);
      toast.error(`Failed to update profile: ${error.message}`);
      return false;
    }

    // If username was updated, also update the actor's preferred_username for federation
    if (profileData.username) {
      const { error: actorError } = await supabase
        .from("actors")
        .update({ 
          preferred_username: profileData.username.toLowerCase(),
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (actorError) {
        console.warn('⚠️ Failed to update actor username:', actorError);
        // Don't fail the whole operation, just log the warning
      }
    }

    console.log('✅ Profile updated successfully');
    toast.success("Profile updated successfully");
    return true;
  } catch (error) {
    console.error("❌ Error updating profile:", error);
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
    console.log('🖼️ uploadProfileAvatar - Current user:', {
      user_id: user?.id,
      email: user?.email,
      user_exists: !!user
    });
    
    if (!user) {
      console.error('❌ No user found in uploadProfileAvatar');
      toast.error("You must be logged in to upload an avatar");
      return null;
    }

    // Generate a unique filename to prevent collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${uuidv4()}.${fileExt}`;
    const filePath = fileName;

    console.log('📤 Uploading avatar to path:', filePath);

    // Upload image to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Avatar upload error:', uploadError);
      toast.error(`Failed to upload avatar: ${uploadError.message}`);
      return null;
    }

    // Get the public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    console.log('🔗 Avatar public URL:', publicUrl);

    // Update the profile with the new avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (updateError) {
      console.error('❌ Avatar URL update error:', updateError);
      toast.error(`Failed to update profile with avatar: ${updateError.message}`);
      return null;
    }

    console.log('✅ Avatar updated successfully');
    toast.success("Avatar updated successfully");
    return publicUrl;
  } catch (error) {
    console.error("❌ Error uploading avatar:", error);
    toast.error("Failed to upload avatar");
    return null;
  }
};

export const updateProfile = async (profileData: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('📋 updateProfile - Current user:', {
      user_exists: !!user,
      user_id: user?.id,
      email: user?.email
    });
    
    if (!user) {
      console.error('❌ No user found in updateProfile');
      toast.error('You must be logged in to update your profile');
      throw new Error('You must be logged in to update your profile');
    }

    console.log('📝 Updating profile with data:', profileData);

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
      console.error('❌ Profile update error:', error);
      toast.error(`Failed to update profile: ${error.message}`);
      throw error;
    }

    console.log('✅ Profile updated successfully:', data);

    // If username was updated and this is the first time setting it, create actor
    if (profileData.username) {
      // Check if user has an actor
      const { data: existingActor } = await supabase
        .from('actors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!existingActor) {
        console.log('🎭 Creating actor for new username:', profileData.username);
        const actorCreated = await createUserActor(user.id);
        if (actorCreated) {
          console.log('✅ Actor created successfully');
          toast.success("Profile and actor created successfully");
        } else {
          console.warn('⚠️ Failed to create actor, but profile update succeeded');
          toast.warning("Profile updated but actor creation failed");
        }
      }
    }

    return data;
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    throw error;
  }
};
