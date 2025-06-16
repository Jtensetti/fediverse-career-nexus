
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

    if (error) {
      console.error('❌ Profile update error:', error);
      toast.error(`Failed to update profile: ${error.message}`);
      return false;
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
    const fileName = `${user.id}-${uuidv4()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

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
    const { data: session } = await supabase.auth.getSession();
    console.log('📋 updateProfile - Current session:', {
      session_exists: !!session.session,
      user_id: session.session?.user?.id,
      email: session.session?.user?.email
    });
    
    if (!session.session) {
      console.error('❌ No session found in updateProfile');
      toast.error('You must be logged in to update your profile');
      throw new Error('You must be logged in to update your profile');
    }

    console.log('📝 Updating profile with data:', profileData);

    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', session.session.user.id)
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
        .eq('user_id', session.session.user.id)
        .single();

      if (!existingActor) {
        console.log('🎭 Creating actor for new username:', profileData.username);
        const actorCreated = await createUserActor(session.session.user.id);
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
