import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Image, X, Loader2, Send, ImagePlus, AlertTriangle, Building2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { compressImage, formatFileSize } from "@/lib/imageCompression";
import { LinkPreview, extractUrls } from "@/components/LinkPreview";
import ContentWarningInput from "@/components/ContentWarningInput";
import { createCompanyPost, CreateCompanyPostData } from "@/services/companyPostService";
import { cn } from "@/lib/utils";
import type { Company } from "@/services/companyService";

const MAX_CHARACTERS = 500;

interface CompanyPostComposerProps {
  company: Company;
  className?: string;
}

export default function CompanyPostComposer({ company, className = "" }: CompanyPostComposerProps) {
  const { t } = useTranslation();
  const [postContent, setPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageAltText, setImageAltText] = useState<string>("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{ original: number; compressed: number } | null>(null);
  const [dismissedUrls, setDismissedUrls] = useState<Set<string>>(new Set());
  const [contentWarning, setContentWarning] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Extract URLs from post content for link preview
  const detectedUrls = useMemo(() => {
    const urls = extractUrls(postContent);
    return urls.filter(url => !dismissedUrls.has(url));
  }, [postContent, dismissedUrls]);

  const handleDismissLinkPreview = (url: string) => {
    setDismissedUrls(prev => new Set([...prev, url]));
  };

  // Generate image preview
  useEffect(() => {
    if (selectedImage) {
      const url = URL.createObjectURL(selectedImage);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImagePreview(null);
    }
  }, [selectedImage]);

  const createPostMutation = useMutation({
    mutationFn: (postData: CreateCompanyPostData) => createCompanyPost(postData),
    onSuccess: (postId) => {
      if (postId) {
        resetForm();
        queryClient.invalidateQueries({ queryKey: ['companyPosts', company.id] });
      }
    },
  });

  const resetForm = () => {
    setPostContent("");
    setSelectedImage(null);
    setImagePreview(null);
    setImageAltText("");
    setCompressionInfo(null);
    setDismissedUrls(new Set());
    setContentWarning("");
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        return;
      }
      
      setIsCompressing(true);
      try {
        const originalSize = file.size;
        const compressedFile = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.8,
          maxSizeKB: 500
        });
        
        setSelectedImage(compressedFile);
        setCompressionInfo({
          original: originalSize,
          compressed: compressedFile.size
        });
      } catch (error) {
        console.error('Compression failed, using original:', error);
        setSelectedImage(file);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handlePost = () => {
    if (!postContent.trim()) {
      return;
    }

    createPostMutation.mutate({
      companyId: company.id,
      content: postContent.trim(),
      imageFile: selectedImage || undefined,
      imageAltText: imageAltText.trim() || undefined,
      contentWarning: contentWarning.trim() || undefined,
    });
  };

  const isLoading = createPostMutation.isPending;
  const characterCount = postContent.length;
  const isOverLimit = characterCount > MAX_CHARACTERS;
  const characterPercentage = Math.min((characterCount / MAX_CHARACTERS) * 100, 100);

  return (
    <Card className={cn("", className)}>
      <CardContent className="pt-6">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={company.logo_url || undefined} alt={company.name} />
            <AvatarFallback className="bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <div className="text-sm font-medium text-muted-foreground">
              {t("companies.postingAs", "Posting as")} <span className="text-foreground">{company.name}</span>
            </div>

            <Textarea
              ref={textareaRef}
              placeholder={t("posts.whatsOnMind", "What's on your mind?")}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className={cn(
                "min-h-[100px] resize-none",
                isOverLimit && "border-destructive focus-visible:ring-destructive"
              )}
              disabled={isLoading}
            />

            {/* Character count */}
            <div className="flex items-center justify-between text-xs">
              <div className={cn(
                "transition-colors",
                isOverLimit ? "text-destructive" : characterCount > MAX_CHARACTERS * 0.9 ? "text-accent-foreground" : "text-muted-foreground"
              )}>
                {characterCount}/{MAX_CHARACTERS}
              </div>
              <div 
                className="h-1 w-20 bg-muted rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={characterCount}
                aria-valuemax={MAX_CHARACTERS}
              >
                <div 
                  className={cn(
                    "h-full transition-all",
                    isOverLimit ? "bg-destructive" : characterCount > MAX_CHARACTERS * 0.9 ? "bg-accent" : "bg-primary"
                  )}
                  style={{ width: `${characterPercentage}%` }}
                />
              </div>
            </div>

            {/* Image Preview */}
            <AnimatePresence>
              {imagePreview && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-2"
                >
                  <div className="relative rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={imagePreview} 
                      alt={imageAltText || "Preview"} 
                      className="w-full max-h-48 object-cover"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80"
                      onClick={() => {
                        setSelectedImage(null);
                        setImageAltText("");
                        setCompressionInfo(null);
                      }}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {compressionInfo && compressionInfo.compressed < compressionInfo.original && (
                      <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-background/80 text-xs text-muted-foreground">
                        {formatFileSize(compressionInfo.compressed)}
                      </div>
                    )}
                  </div>
                  
                  <div className="px-1">
                    <Label htmlFor="company-alt-text" className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                      <ImagePlus className="h-3 w-3" />
                      {t("posts.describeImage", "Describe this image")}
                    </Label>
                    <Input
                      id="company-alt-text"
                      placeholder={t("posts.addAltText", "Add alt text...")}
                      value={imageAltText}
                      onChange={(e) => setImageAltText(e.target.value)}
                      className="text-sm h-8"
                      maxLength={300}
                      disabled={isLoading}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Compressing indicator */}
            {isCompressing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("posts.optimizingImage", "Optimizing image...")}
              </div>
            )}

            {/* Link Preview */}
            <AnimatePresence>
              {detectedUrls.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {detectedUrls.slice(0, 1).map((url) => (
                    <LinkPreview
                      key={url}
                      url={url}
                      onRemove={() => handleDismissLinkPreview(url)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content Warning Input */}
            <ContentWarningInput
              value={contentWarning}
              onChange={setContentWarning}
            />

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                  disabled={isLoading}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isCompressing}
                >
                  <Image className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>

              <Button
                onClick={handlePost}
                disabled={isLoading || !postContent.trim() || isOverLimit}
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {t("posts.post", "Post")}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
