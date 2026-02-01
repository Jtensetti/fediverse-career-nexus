import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseArticleImageUploadResult {
  uploadImage: (file: File) => Promise<string | null>;
  isUploading: boolean;
}

/**
 * Hook for uploading images to the articles storage bucket
 * Used by the article editor for inline images
 */
export function useArticleImageUpload(): UseArticleImageUploadResult {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return null;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return null;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload images");
        return null;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/inline-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('articles')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error("Failed to upload image");
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('articles')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Failed to upload image");
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { uploadImage, isUploading };
}
