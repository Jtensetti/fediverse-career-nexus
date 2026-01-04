import { useState, useRef } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileBannerProps {
  headerUrl?: string | null;
  isOwnProfile?: boolean;
  onHeaderChange?: (url: string) => void;
  className?: string;
}

const ProfileBanner = ({
  headerUrl,
  isOwnProfile = false,
  onHeaderChange,
  className,
}: ProfileBannerProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Please upload an image smaller than 10MB");
      return;
    }

    try {
      setIsUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/header-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      onHeaderChange?.(publicUrl);
      toast.success("Header image updated!");
    } catch (error) {
      console.error("Error uploading header:", error);
      toast.error("Failed to upload header image");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={cn(
        "relative w-full h-48 md:h-72 lg:h-80 overflow-hidden",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Image or Gradient */}
      {headerUrl ? (
        <img
          src={headerUrl}
          alt="Profile header"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-secondary/30" />
      )}

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

      {/* Upload button for own profile */}
      {isOwnProfile && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <Button
            variant="secondary"
            size="sm"
            className={cn(
              "absolute bottom-4 right-4 gap-2 transition-all duration-300",
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            )}
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Upload className="h-4 w-4 animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                {headerUrl ? "Change Header" : "Add Header"}
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
};

export default ProfileBanner;
