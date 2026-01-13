import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Repeat } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import DOMPurify from "dompurify";

interface QuoteRepostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalPost: {
    id: string;
    content: string;
    authorName: string;
    authorUsername?: string;
    authorAvatar?: string;
    publishedAt?: string;
    isRemote?: boolean;
  };
  onSuccess?: () => void;
}

interface UserProfile {
  username: string | null;
  fullname: string | null;
  avatar_url: string | null;
}

export default function QuoteRepostDialog({ 
  open, 
  onOpenChange, 
  originalPost,
  onSuccess 
}: QuoteRepostDialogProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { user } = useAuth();

  // Load user profile
  useEffect(() => {
    if (user && open) {
      supabase
        .from('public_profiles')
        .select('username, fullname, avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [user, open]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to repost");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get or create actor
      let { data: actor } = await supabase
        .from('actors')
        .select('id, preferred_username')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!actor) {
        const { data: newActor, error: createError } = await supabase
          .from('actors')
          .insert({
            user_id: user.id,
            preferred_username: profile?.username || user.email?.split('@')[0] || 'user',
            type: 'Person',
            status: 'active'
          })
          .select('id, preferred_username')
          .single();

        if (createError || !newActor) {
          throw new Error("Failed to create actor");
        }
        actor = newActor;
      }

      // Create the quote repost as an ap_object with type "Announce" and quoted content
      const quoteRepostActivity = {
        type: 'Announce',
        actor: {
          id: actor.id,
          preferredUsername: actor.preferred_username,
          name: profile?.fullname || profile?.username || actor.preferred_username
        },
        content: content.trim() || null, // User's comment on the repost
        object: {
          id: originalPost.id,
          type: 'Note',
          content: originalPost.content,
          attributedTo: {
            name: originalPost.authorName,
            preferredUsername: originalPost.authorUsername,
            icon: originalPost.authorAvatar ? { url: originalPost.authorAvatar } : null
          },
          published: originalPost.publishedAt
        },
        published: new Date().toISOString(),
        isQuoteRepost: true // Flag to distinguish from simple boosts
      };

      const { error } = await supabase
        .from('ap_objects')
        .insert({
          type: 'Announce',
          content: quoteRepostActivity,
          attributed_to: actor.id,
          published_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success("Post reposted to your profile!");
      setContent("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating quote repost:", error);
      toast.error("Failed to repost. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sanitize original content for display
  const sanitizedContent = DOMPurify.sanitize(originalPost.content, {
    ALLOWED_TAGS: ['p', 'br', 'a', 'strong', 'em', 'b', 'i'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-green-500" />
            Repost to your profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User's comment input */}
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-primary/10 text-primary">
                {(profile?.fullname || profile?.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="Add your thoughts (optional)..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[80px] resize-none border-0 focus-visible:ring-0 p-0 text-base"
                maxLength={500}
              />
            </div>
          </div>

          {/* Original post preview */}
          <Card className="border-2 border-dashed">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Avatar className="h-8 w-8">
                  {originalPost.authorAvatar && (
                    <AvatarImage src={originalPost.authorAvatar} />
                  )}
                  <AvatarFallback className="text-xs bg-muted">
                    {originalPost.authorName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm truncate">
                      {originalPost.authorName}
                    </span>
                    {originalPost.authorUsername && (
                      <span className="text-xs text-muted-foreground">
                        @{originalPost.authorUsername}
                      </span>
                    )}
                    {originalPost.isRemote && (
                      <Globe className="h-3 w-3 text-purple-500" />
                    )}
                    {originalPost.publishedAt && (
                      <span className="text-xs text-muted-foreground">
                        · {formatDistanceToNow(new Date(originalPost.publishedAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <div 
                    className="text-sm text-muted-foreground line-clamp-3 mt-1 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Character count */}
          {content.length > 0 && (
            <div className="text-xs text-muted-foreground text-right">
              {content.length}/500
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? "Reposting..." : "Repost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
