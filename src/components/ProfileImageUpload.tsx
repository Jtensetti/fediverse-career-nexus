
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { uploadProfileAvatar } from "@/services/profileEditService";
import { Camera } from "lucide-react";

interface ProfileImageUploadProps {
  currentImageUrl?: string;
  displayName?: string;
  onImageUploaded: (url: string) => void;
}

const ProfileImageUpload = ({
  currentImageUrl,
  displayName = "User",
  onImageUploaded
}: ProfileImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);

  // Get initials for the avatar fallback
  const getInitials = () => {
    if (!displayName) return "U";
    return displayName
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("Please upload an image smaller than 5MB");
      return;
    }

    try {
      setIsUploading(true);
      const imageUrl = await uploadProfileAvatar(file);
      
      if (imageUrl) {
        onImageUploaded(imageUrl);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <Label htmlFor="profile-image" className="cursor-pointer relative group">
        <div className="relative">
          <Avatar className="h-24 w-24 border-2 border-gray-200">
            <AvatarImage src={currentImageUrl} alt={displayName} />
            <AvatarFallback className="text-xl">{getInitials()}</AvatarFallback>
          </Avatar>
          
          <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
            <Camera className="text-white" size={24} />
          </div>
        </div>
      </Label>
      
      <input
        id="profile-image"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={() => document.getElementById("profile-image")?.click()}
        disabled={isUploading}
      >
        {isUploading ? "Uploading..." : "Change Photo"}
      </Button>
    </div>
  );
};

export default ProfileImageUpload;
