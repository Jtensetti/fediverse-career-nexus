import { useState, useRef } from "react";
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
  const [isUploading, setIsUploading] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [isRecropping, setIsRecropping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (10MB max for source image before cropping)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10MB");
      return;
    }

    // Store the filename for later
    setSelectedFileName(file.name);
    setIsRecropping(false);

    // Create object URL for cropping
    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setShowCropDialog(true);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Re-crop existing image
  const handleRecrop = () => {
    if (!value) return;
    setIsRecropping(true);
    setSelectedImageSrc(value);
    setSelectedFileName("cover.jpg"); // Default name for re-cropped images
    setShowCropDialog(true);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload images");
        return;
      }

      // Always save as jpg for cropped images
      const fileName = `${user.id}/cover-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('articles')
        .upload(fileName, croppedBlob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error("Failed to upload image");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('articles')
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast.success(isRecropping ? "Cover image updated" : "Cover image uploaded");
    } catch (error) {
      console.error('Error uploading cover image:', error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      setIsRecropping(false);
      // Clean up object URL only if it was a blob URL (not an existing image URL)
      if (selectedImageSrc && selectedImageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImageSrc);
      }
      setSelectedImageSrc(null);
    }
  };

  const handleCloseCropDialog = () => {
    setShowCropDialog(false);
    // Clean up object URL only if it was a blob URL
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
              title="Re-crop image"
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
              title="Replace image"
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
              <span className="text-sm">Uploading...</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Add cover image</span>
            </>
          )}
        </Button>
      )}

      {/* Crop Dialog */}
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
