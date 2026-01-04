import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Image, PenTool, Smile, Calendar as CalendarIcon, ChevronDown, X, Loader2, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUserProfile } from "@/services/profileService";
import { createPost, CreatePostData } from "@/services/postService";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const MAX_CHARACTERS = 500;

interface PostComposerProps {
  className?: string;
}

export default function PostComposer({ className = "" }: PostComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: getCurrentUserProfile,
    enabled: !!user,
  });

  // Focus textarea when dialog opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

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
    mutationFn: (postData: CreatePostData) => createPost(postData),
    onSuccess: () => {
      toast.success('Post created successfully!');
      resetForm();
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['federatedFeed'] });
    },
    onError: (error: Error) => {
      console.error('Failed to create post:', error);
      toast.error(error.message || 'Failed to create post. Please try again.');
    },
  });

  const resetForm = () => {
    setPostContent("");
    setSelectedImage(null);
    setImagePreview(null);
    setScheduledDate(undefined);
    setScheduledTime("");
    setShowDatePicker(false);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }
      setSelectedImage(file);
    }
  };

  const handlePost = () => {
    if (!postContent.trim()) {
      toast.error('Please enter some content for your post');
      return;
    }

    const postData: CreatePostData = {
      content: postContent.trim(),
      imageFile: selectedImage || undefined,
    };

    createPostMutation.mutate(postData);
  };

  const handleScheduledPost = () => {
    if (!postContent.trim()) {
      toast.error('Please enter some content for your post');
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      toast.error('Please select a date and time for scheduling');
      return;
    }

    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const scheduledDateTime = new Date(scheduledDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    if (scheduledDateTime <= new Date()) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    const postData: CreatePostData = {
      content: postContent.trim(),
      imageFile: selectedImage || undefined,
      scheduledFor: scheduledDateTime,
    };

    createPostMutation.mutate(postData);
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

  const isLoading = createPostMutation.isPending;
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
                <span className="text-muted-foreground flex-1">What's on your mind?</span>
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
                    <p className="text-xs text-muted-foreground font-normal">Posting to your feed</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="p-6 pt-4 space-y-4 overflow-y-auto max-h-[60vh]">
                <Textarea
                  ref={textareaRef}
                  placeholder="What's on your mind?"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className={cn(
                    "min-h-[150px] resize-none border-0 focus-visible:ring-0 text-lg p-0 placeholder:text-muted-foreground/60",
                    isOverLimit && "text-destructive"
                  )}
                  disabled={isLoading}
                />
                
                {/* Image Preview */}
                <AnimatePresence>
                  {imagePreview && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative rounded-xl overflow-hidden bg-muted"
                    >
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full max-h-64 object-cover"
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                        onClick={() => setSelectedImage(null)}
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Scheduled Info */}
                <AnimatePresence>
                  {(scheduledDate || scheduledTime) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        <span>
                          Scheduled for {scheduledDate && format(scheduledDate, 'PPP')} {scheduledTime && `at ${scheduledTime}`}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setScheduledDate(undefined);
                          setScheduledTime("");
                          setShowDatePicker(false);
                        }}
                        disabled={isLoading}
                      >
                        Remove
                      </Button>
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
                      className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                      disabled={isLoading}
                    >
                      <Smile className="h-5 w-5" />
                    </Button>
                    
                    <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                          disabled={isLoading}
                        >
                          <CalendarIcon className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4" align="start">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="scheduled-date" className="text-sm font-medium">Select Date</Label>
                            <Calendar
                              mode="single"
                              selected={scheduledDate}
                              onSelect={setScheduledDate}
                              disabled={(date) => date <= new Date()}
                              className="rounded-md border mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="scheduled-time" className="text-sm font-medium">Select Time</Label>
                            <Input
                              id="scheduled-time"
                              type="time"
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              className="mt-2"
                            />
                          </div>
                          <Button 
                            onClick={() => setShowDatePicker(false)}
                            className="w-full"
                          >
                            Done
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
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
                      variant="outline"
                      size="sm"
                      onClick={handleScheduledPost}
                      disabled={!postContent.trim() || isLoading || isOverLimit}
                      className="gap-1"
                    >
                      <ChevronDown className="h-3 w-3" />
                      Schedule
                    </Button>
                    
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
                          Post
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleWriteArticle}
              className="w-full gap-2 hover:bg-primary/5 hover:border-primary/20"
            >
              <PenTool className="h-4 w-4" />
              Write an Article
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCreateEvent}
              className="w-full gap-2 hover:bg-primary/5 hover:border-primary/20"
            >
              <CalendarIcon className="h-4 w-4" />
              Create Event
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
