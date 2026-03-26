import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2, Crop, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageCropDialog } from "./ImageCropDialog";

interface CoverImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  className?: string;
}

const CoverImageUpload = ({ value, onChange, className }: CoverImageUploadProps) => {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [isRecropping, setIsRecropping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("coverImage.selectImageFile"));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("coverImage.imageTooLarge"));
      return;
    }

    setSelectedFileName(file.name);
    setIsRecropping(false);
    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setShowCropDialog(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRecrop = () => {
    if (!value) return;
    setIsRecropping(true);
    setSelectedImageSrc(value);
    setSelectedFileName("cover.jpg");
    setShowCropDialog(true);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t("coverImage.loginRequired"));
        return;
      }

      const fileName = `${user.id}/cover-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('articles')
        .upload(fileName, croppedBlob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(t("coverImage.uploadFailed"));
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('articles')
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast.success(isRecropping ? t("coverImage.updated") : t("coverImage.uploaded"));
    } catch (error) {
      console.error('Error uploading cover image:', error);
      toast.error(t("coverImage.uploadFailed"));
    } finally {
      setIsUploading(false);
      setIsRecropping(false);
      if (selectedImageSrc && selectedImageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImageSrc);
      }
      setSelectedImageSrc(null);
    }
  };

  const handleCloseCropDialog = () => {
    setShowCropDialog(false);
    if (selectedImageSrc && selectedImageSrc.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImageSrc);
    }
    setSelectedImageSrc(null);
    setIsRecropping(false);
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />

      {value ? (
        <div className="relative aspect-[2/1] w-full rounded-lg overflow-hidden border">
          <img
            src={value}
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-8 w-8"
              onClick={handleRecrop}
              disabled={isUploading}
              title={t("coverImage.recrop")}
            >
              <Crop className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-8 w-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title={t("coverImage.replace")}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-32 border-dashed flex flex-col gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">{t("coverImage.uploading")}</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t("coverImage.addCoverImage")}</span>
            </>
          )}
        </Button>
      )}

      {selectedImageSrc && (
        <ImageCropDialog
          open={showCropDialog}
          onClose={handleCloseCropDialog}
          imageSrc={selectedImageSrc}
          onCropComplete={handleCropComplete}
          aspectRatio={2 / 1}
        />
      )}
    </div>
  );
};

export default CoverImageUpload;
