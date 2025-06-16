
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Image, PenTool, Smile, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUserProfile } from "@/services/profileService";
import { createPost, CreatePostData } from "@/services/postService";
import { toast } from "sonner";
import { format } from "date-fns";

interface PostComposerProps {
  className?: string;
}

export default function PostComposer({ className = "" }: PostComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: getCurrentUserProfile,
    enabled: !!user,
  });

  const createPostMutation = useMutation({
    mutationFn: (postData: CreatePostData) => createPost(postData),
    onSuccess: () => {
      toast.success('Post created successfully!');
      resetForm();
      setIsOpen(false);
      // Invalidate federated feed to show the new post
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
    setScheduledDate(undefined);
    setScheduledTime("");
    setShowDatePicker(false);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
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

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardContent className="pt-6">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <div className="flex items-center gap-3 w-full p-4 text-left border rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatarUrl} alt={profile?.displayName} />
                  <AvatarFallback>
                    {profile?.displayName ? getInitials(profile.displayName) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground flex-1">What's on your mind?</span>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatarUrl} alt={profile?.displayName} />
                    <AvatarFallback className="text-xs">
                      {profile?.displayName ? getInitials(profile.displayName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span>{profile?.displayName || 'User'}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="What's on your mind?"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="min-h-[200px] resize-none border-0 focus-visible:ring-0 text-lg p-4"
                  disabled={isLoading}
                />
                
                {selectedImage && (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md flex items-center justify-between">
                    <span>📷 Image selected: {selectedImage.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedImage(null)}
                      disabled={isLoading}
                    >
                      Remove
                    </Button>
                  </div>
                )}

                {(scheduledDate || scheduledTime) && (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md flex items-center justify-between">
                    <span>
                      📅 Scheduled for: {scheduledDate && format(scheduledDate, 'PPP')} {scheduledTime && `at ${scheduledTime}`}
                    </span>
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
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
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
                      size="sm"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      className="text-muted-foreground hover:text-foreground"
                      disabled={isLoading}
                    >
                      <Image className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      disabled={isLoading}
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                    
                    <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          disabled={isLoading}
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4" align="start">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="scheduled-date">Select Date</Label>
                            <Calendar
                              mode="single"
                              selected={scheduledDate}
                              onSelect={setScheduledDate}
                              disabled={(date) => date <= new Date()}
                              className="rounded-md border"
                            />
                          </div>
                          <div>
                            <Label htmlFor="scheduled-time">Select Time</Label>
                            <Input
                              id="scheduled-time"
                              type="time"
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              className="mt-1"
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
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleScheduledPost}
                      disabled={!postContent.trim() || isLoading}
                      className="flex items-center gap-1"
                    >
                      <ChevronDown className="h-3 w-3" />
                      Schedule
                    </Button>
                    
                    <Button
                      onClick={handlePost}
                      disabled={!postContent.trim() || isLoading}
                      size="sm"
                    >
                      {isLoading ? 'Posting...' : 'Post'}
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
              className="w-full"
            >
              <PenTool className="h-4 w-4 mr-2" />
              Write an Article
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCreateEvent}
              className="w-full"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
