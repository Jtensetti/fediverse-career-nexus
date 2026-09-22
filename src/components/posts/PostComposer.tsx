import { useContentCheck } from '@/hooks/useContentCheck';
import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Image, PenTool, Calendar as CalendarIcon, X, Loader2, Send, ImagePlus, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUserProfile } from "@/services/profile/profileService";
import { createPost, CreatePostData } from "@/services/posts/postService";
import { formatFileSize } from "@/lib/imageCompression";
import { usePostImageDraft } from "@/hooks/usePostImageDraft";
import { ImageUploadStatus } from "@/components/posts/ImageUploadStatus";
import { LinkPreview, extractUrls } from "@/components/content/LinkPreview";
import ContentWarningInput from "@/components/content/ContentWarningInput";
import { PollCreator, PollCreatorData } from "@/components/content/PollCreator";
import { createPollObject } from "@/services/posts/pollService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_CHARACTERS = 500;

interface PostComposerProps {
  className?: string;
}

export default function PostComposer({ className = "" }: PostComposerProps) {
  const { t } = useTranslation();
  const contentCheck = useContentCheck();
  const [isOpen, setIsOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const imageDraft = usePostImageDraft();
  const imagePreview = imageDraft.preview;
  const [postId, setPostId] = useState(() => crypto.randomUUID());
  const [preparingPost, setPreparingPost] = useState(false);
  const [imageAltText, setImageAltText] = useState<string>("");
  const compressionInfo = imageDraft.compressedSize && imageDraft.file ? { original: imageDraft.file.size, compressed: imageDraft.compressedSize } : null;
  const [dismissedUrls, setDismissedUrls] = useState<Set<string>>(new Set());
  const [contentWarning, setContentWarning] = useState<string>("");
  const [pollData, setPollData] = useState<PollCreatorData | null>(null);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Extract URLs from post content for link preview
  const detectedUrls = useMemo(() => {
    const urls = extractUrls(postContent);
    return urls.filter(url => !dismissedUrls.has(url));
  }, [postContent, dismissedUrls]);

  const handleDismissLinkPreview = (url: string) => {
    setDismissedUrls(prev => new Set([...prev, url]));
  };

  const { data: profile } = useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: getCurrentUserProfile,
    enabled: !!user,
  });

  // Focus textarea when dialog opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      const id = window.setTimeout(() => textareaRef.current?.focus(), 100);
      return () => window.clearTimeout(id);
    }
  }, [isOpen]);

  const createPostMutation = useMutation({
    mutationFn: (postData: CreatePostData) => createPost(postData),
    onSuccess: (success) => {
      if (!success) return;
      resetForm();
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['federatedFeed'] });
    },
    onError: (error: Error) => {
      console.error('Failed to create post:', error);
      toast.error(error.message || 'Kunde inte skapa inlägg. Försök igen.');
    },
  });

  const resetForm = () => {
    setPostContent("");
    imageDraft.clear();
    setPostId(crypto.randomUUID());
    setImageAltText("");
    setDismissedUrls(new Set());
    setContentWarning("");
    setPollData(null);
    setShowPollCreator(false);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) imageDraft.select(file);
  };

  const handlePost = async () => {
    if (!postContent.trim() && !showPollCreator) {
      toast.error(t("posts.enterContent", "Please enter some content for your post"));
      return;
    }

    // Validate poll options if poll is active
    if (showPollCreator && pollData) {
      const validOptions = pollData.options.filter(opt => opt.trim().length > 0);
      if (validOptions.length < 2) {
        toast.error(t("posts.addPollOptions", "Please enter at least 2 poll options"));
        return;
      }
    }

    setPreparingPost(true);
    try {
      // Build post data with optional poll
      const finalPostData: CreatePostData = {
        content: postContent.trim(),
        image: await imageDraft.ready(),
        postId,
        imageAltText: imageAltText.trim() || undefined,
        contentWarning: contentWarning.trim() || undefined,
      };

      // If poll is active, add poll object to the post
      if (showPollCreator && pollData) {
        const validOptions = pollData.options.filter(opt => opt.trim().length > 0);
        const pollObject = createPollObject(
          postContent.trim(),
          validOptions,
          pollData.durationMinutes,
          pollData.multipleChoice
        );
        finalPostData.pollData = pollObject;
      }

      if (!await contentCheck.check([postContent, contentWarning, imageAltText, ...(pollData?.options || [])].join('\n'))) return;
      createPostMutation.mutate(finalPostData);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Kunde inte förbereda bilden.'); }
    finally { setPreparingPost(false); }
  };

  const handleWriteArticle = () => {
    navigate("/articles/create");
  };

  const handleCreateEvent = () => {
    navigate("/events/create");
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isLoading = createPostMutation.isPending || contentCheck.checking || preparingPost;
  const characterCount = postContent.length;
  const isOverLimit = characterCount > MAX_CHARACTERS;
  const characterPercentage = Math.min((characterCount / MAX_CHARACTERS) * 100, 100);

  return (
    <div className={cn("space-y-4", className)}>
      <Card variant="elevated">
        <CardContent className="pt-6">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <motion.div 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex items-center gap-3 w-full p-4 text-left border rounded-xl bg-muted/30 cursor-pointer hover:bg-muted/50 transition-all duration-200"
              >
                <Avatar className="h-11 w-11 ring-2 ring-offset-2 ring-offset-background ring-primary/20">
                  <AvatarImage src={profile?.avatarUrl} alt={profile?.displayName} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {profile?.displayName ? getInitials(profile.displayName) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground flex-1">{t("posts.whatsOnMind", "What's on your mind?")}</span>
              </motion.div>
            </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatarUrl} alt={profile?.displayName} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {profile?.displayName ? getInitials(profile.displayName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-semibold">{profile?.displayName || 'User'}</span>
                    <p className="text-xs text-muted-foreground font-normal">{t("posts.postingToFeed", "Posting to your feed")}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="p-6 pt-4 space-y-4 overflow-y-auto max-h-[60vh]">
                <Textarea
                  ref={textareaRef}
                  placeholder={t("posts.whatsOnMind", "What's on your mind?")}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className={cn(
                    "min-h-[150px] resize-none border-0 focus-visible:ring-0 text-lg p-0 placeholder:text-muted-foreground/60",
                    isOverLimit && "text-destructive"
                  )}
                  disabled={isLoading}
                />
                
                {/* Image Preview with Alt Text */}
                <AnimatePresence>
                  {imagePreview && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="space-y-2"
                    >
                      <div className="relative rounded-xl overflow-hidden bg-muted">
                        <img 
                          src={imagePreview} 
                          alt={imageAltText || "Preview"} 
                          className="w-full max-h-64 object-cover"
                        />
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                          onClick={() => {
                            imageDraft.clear();
                            setImageAltText("");
                          }}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        {compressionInfo && compressionInfo.compressed < compressionInfo.original && (
                          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs text-muted-foreground">
                            {formatFileSize(compressionInfo.compressed)}
                          </div>
                        )}
                      </div>
                      
                      {/* Alt text input for accessibility */}
                      <div className="px-1">
                        <Label htmlFor="alt-text" className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                          <ImagePlus className="h-3 w-3" />
                          {t("posts.describeImage", "Describe this image for people who can't see it")}
                        </Label>
                        <Input
                          id="alt-text"
                          placeholder={t("posts.addAltText", "Add alt text...")}
                          value={imageAltText}
                          onChange={(e) => setImageAltText(e.target.value)}
                          className="text-sm h-8"
                          maxLength={300}
                          disabled={isLoading}
                        />
                        <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
                          {imageAltText.length}/300
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <ImageUploadStatus draft={imageDraft} retry={imageDraft.retry} />

                {/* Link Preview */}
                <AnimatePresence>
                  {detectedUrls.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-2"
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

                {/* Poll Creator */}
                <AnimatePresence>
                  {showPollCreator && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <PollCreator
                        onPollChange={setPollData}
                        onRemove={() => {
                          setShowPollCreator(false);
                          setPollData(null);
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>


              </div>
              
              {/* Footer */}
              <div className="p-4 border-t bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload"
                      disabled={isLoading}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                      disabled={isLoading}
                    >
                      <Image className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPollCreator(!showPollCreator)}
                      className={cn(
                        "h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10",
                        showPollCreator && "text-primary bg-primary/10"
                      )}
                      disabled={isLoading}
                    >
                      <BarChart3 className="h-5 w-5" />
                    </Button>

                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Character Counter */}
                    <div className="flex items-center gap-2">
                      <div className="relative h-6 w-6">
                        <svg className="h-6 w-6 -rotate-90" viewBox="0 0 24 24">
                          <circle
                            className="text-muted"
                            strokeWidth="2"
                            stroke="currentColor"
                            fill="transparent"
                            r="10"
                            cx="12"
                            cy="12"
                          />
                          <circle
                            className={cn(
                              "transition-all duration-300",
                              isOverLimit ? "text-destructive" : characterPercentage > 80 ? "text-warning" : "text-primary"
                            )}
                            strokeWidth="2"
                            strokeDasharray={`${characterPercentage * 0.628} 100`}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="10"
                            cx="12"
                            cy="12"
                          />
                        </svg>
                      </div>
                      {characterCount > MAX_CHARACTERS * 0.8 && (
                        <span className={cn(
                          "text-xs font-medium",
                          isOverLimit ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {MAX_CHARACTERS - characterCount}
                        </span>
                      )}
                    </div>
                    

                    
                    <Button
                      onClick={handlePost}
                      disabled={!postContent.trim() || isLoading || isOverLimit}
                      size="sm"
                      className="gap-2 min-w-[80px]"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          {t("posts.post", "Post")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
      {contentCheck.dialog}
          </Dialog>
          
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleWriteArticle}
              className="w-full gap-2 hover:bg-primary/5 hover:border-primary/20"
            >
              <PenTool className="h-4 w-4" />
              {t("posts.writeArticle", "Write an Article")}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCreateEvent}
              className="w-full gap-2 hover:bg-primary/5 hover:border-primary/20"
            >
              <CalendarIcon className="h-4 w-4" />
              {t("posts.createEvent", "Create Event")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
