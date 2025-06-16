
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image, PenTool, Smile, Calendar, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUserProfile } from "@/services/profileService";

interface PostComposerProps {
  className?: string;
}

export default function PostComposer({ className = "" }: PostComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: getCurrentUserProfile,
    enabled: !!user,
  });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handlePost = () => {
    // TODO: Implement posting logic
    console.log("Posting:", postContent, selectedImage);
    setPostContent("");
    setSelectedImage(null);
    setIsOpen(false);
  };

  const handleScheduledPost = () => {
    // TODO: Implement scheduled posting logic
    console.log("Scheduling post:", postContent, selectedImage);
    setPostContent("");
    setSelectedImage(null);
    setIsOpen(false);
  };

  const handleWriteArticle = () => {
    navigate("/articles/create");
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
                />
                
                {selectedImage && (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    📷 Image selected: {selectedImage.name}
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
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Image className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleScheduledPost}
                      disabled={!postContent.trim()}
                      className="flex items-center gap-1"
                    >
                      <ChevronDown className="h-3 w-3" />
                      Schedule
                    </Button>
                    
                    <Button
                      onClick={handlePost}
                      disabled={!postContent.trim()}
                      size="sm"
                    >
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={handleWriteArticle}
              className="w-full"
            >
              <PenTool className="h-4 w-4 mr-2" />
              Write an Article
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
