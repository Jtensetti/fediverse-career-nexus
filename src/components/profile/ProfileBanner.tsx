import { useState, useId } from "react";
import { Camera, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const fileInputId = `profile-header-upload-${useId().replace(/:/g, "")}`;
  const { t } = useTranslation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("banner.invalidImage", "Please upload an image file"));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("banner.imageTooLarge", "Please upload an image smaller than 10MB"));
      return;
    }

    try {
      setIsUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t("banner.mustBeLoggedIn", "You must be logged in"));
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
      toast.success(t("banner.headerUpdated", "Header image updated!"));
    } catch (error) {
      console.error("Error uploading header:", error);
      toast.error(t("banner.uploadError", "Failed to upload header image"));
    } finally {
      setIsUploading(false);
      // allow re-selecting the same file
      e.currentTarget.value = "";
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
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent pointer-events-none" />

      {/* Upload button for own profile */}
      {isOwnProfile && (
        <>
          <input
            id={fileInputId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
            disabled={isUploading}
          />

          <Button
            asChild
            type="button"
            variant="secondary"
            size="sm"
            className={cn(
              "absolute bottom-4 right-4 z-10 gap-2 transition-all duration-300",
              // Always visible on mobile (no hover), hover-reveal on md+
              "opacity-100 translate-y-0 md:opacity-0 md:translate-y-2",
              (isHovered || isUploading) && "md:opacity-100 md:translate-y-0",
              isUploading && "pointer-events-none"
            )}
          >
            <label htmlFor={fileInputId} className="cursor-pointer">
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 animate-pulse" />
                  {t("banner.uploading", "Uploading...")}
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  {headerUrl ? t("banner.changeHeader", "Change Header") : t("banner.addHeader", "Add Header")}
                </>
              )}
            </label>
          </Button>
        </>
      )}
    </div>
  );
};

export default ProfileBanner;
