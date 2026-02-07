import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadCompanyImage, deleteCompanyImage } from "@/services/companyImageService";
import { updateCompany } from "@/services/companyService";

interface CompanyImageUploadProps {
  companyId: string;
  type: "logo" | "banner";
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  className?: string;
  children: React.ReactNode;
}

export default function CompanyImageUpload({
  companyId,
  type,
  currentUrl,
  onUploaded,
  className = "",
  children,
}: CompanyImageUploadProps) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("companyImage.invalidFile", "Please upload an image file"));
      return;
    }

    const maxSize = type === "banner" ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(t("companyImage.tooLarge", "Image must be smaller than {{size}}", { size: type === "banner" ? "10MB" : "5MB" }));
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadCompanyImage(companyId, file, type);
      
      // Update company record with new URL
      const field = type === "logo" ? "logo_url" : "banner_url";
      await updateCompany(companyId, { [field]: url });

      // Delete old image if it existed
      if (currentUrl) {
        await deleteCompanyImage(currentUrl).catch(() => {});
      }

      onUploaded(url);
      toast.success(type === "logo" 
        ? t("companyImage.logoUpdated", "Logo updated") 
        : t("companyImage.bannerUpdated", "Banner updated")
      );
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error(error.message || t("companyImage.uploadFailed", "Failed to upload image"));
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const changeLabel = type === "logo" 
    ? t("companyImage.changeLogo", "Change logo") 
    : t("companyImage.changeBanner", "Change banner");

  return (
    <div className={`relative group ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors cursor-pointer [border-radius:inherit]"
        aria-label={changeLabel}
      >
        <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-white text-sm font-medium">
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {isUploading ? t("companyImage.uploading", "Uploading...") : changeLabel}
        </span>
      </button>
      
      {children}
    </div>
  );
}
