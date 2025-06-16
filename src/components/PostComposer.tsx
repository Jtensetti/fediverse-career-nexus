
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Image, PenTool } from "lucide-react";

interface PostComposerProps {
  className?: string;
}

export default function PostComposer({ className = "" }: PostComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const navigate = useNavigate();

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

  const handleWriteArticle = () => {
    navigate("/articles/create");
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardContent className="pt-6">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <div className="w-full p-3 text-left border rounded-md bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors">
                <span className="text-muted-foreground">What's on your mind?</span>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create a Post</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="What's on your mind?"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                
                {selectedImage && (
                  <div className="text-sm text-muted-foreground">
                    Image selected: {selectedImage.name}
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <Image className="h-4 w-4 mr-2" />
                      Add Image
                    </Button>
                  </div>
                  
                  <Button
                    onClick={handlePost}
                    disabled={!postContent.trim()}
                  >
                    Post
                  </Button>
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
