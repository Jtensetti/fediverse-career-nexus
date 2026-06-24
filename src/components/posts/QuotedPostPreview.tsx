import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Repeat2 } from "lucide-react";
import DOMPurify from "dompurify";

interface ActorInfo {
  id?: string;
  preferredUsername?: string;
  name?: string;
  icon?: { url?: string };
}

interface QuotedPostContent {
  id?: string;
  content?: string;
  actor?: ActorInfo | string;
  attributedTo?: ActorInfo | string;
  attachment?: Array<{ url?: string; mediaType?: string }>;
  published?: string;
}

interface QuotedPostPreviewProps {
  quotedPost: QuotedPostContent;
  className?: string;
}

// Extract username from an actor URL like "https://nolto.social/functions/v1/actor/username"
function extractUsernameFromUrl(url: string): string | null {
  try {
    // Handle actor URLs like /actor/username or /users/username
    const match = url.match(/\/(?:actor|users|u)\/([^\/\?#]+)$/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// Normalize actor data which could be an object or a string URL
function normalizeActorInfo(actor: ActorInfo | string | undefined): { name: string; username: string; avatarUrl?: string } {
  if (!actor) {
    return { name: 'Unknown', username: 'unknown' };
  }
  
  // If actor is an object with data
  if (typeof actor === 'object') {
    const name = actor.name || actor.preferredUsername || 'Unknown';
    const username = actor.preferredUsername || 'unknown';
    const avatarUrl = actor.icon?.url;
    return { name, username, avatarUrl };
  }
  
  // If actor is a string (URL), try to extract username from it
  if (typeof actor === 'string') {
    const extractedUsername = extractUsernameFromUrl(actor);
    if (extractedUsername) {
      return { name: extractedUsername, username: extractedUsername };
    }
  }
  
  return { name: 'Unknown', username: 'unknown' };
}

export function QuotedPostPreview({ quotedPost, className }: QuotedPostPreviewProps) {
  // Try actor first, then attributedTo (ActivityPub can use either)
  const actorData = quotedPost.actor || quotedPost.attributedTo;
  const { name: authorName, username: authorUsername, avatarUrl } = normalizeActorInfo(actorData);
  const postId = quotedPost.id;
  
  // Sanitize the content
  const sanitizedContent = quotedPost.content 
    ? DOMPurify.sanitize(quotedPost.content, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'] })
    : '';

  // Truncate content for preview
  const truncatedContent = sanitizedContent.length > 200 
    ? sanitizedContent.substring(0, 200) + '...' 
    : sanitizedContent;

  const firstImage = quotedPost.attachment?.find(a => a.mediaType?.startsWith('image/'))?.url;

  const content = (
    <Card className={`border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors ${className || ''}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={avatarUrl} alt={authorName} />
            <AvatarFallback className="text-xs">
              {authorName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-medium truncate">{authorName}</span>
              <span className="text-muted-foreground truncate">@{authorUsername}</span>
            </div>
            
            {truncatedContent && (
              <div 
                className="text-sm text-foreground/90 mt-1 line-clamp-3"
                dangerouslySetInnerHTML={{ __html: truncatedContent }}
              />
            )}
            
            {firstImage && (
              <div className="mt-2 rounded-md overflow-hidden max-h-32">
                <img 
                  src={firstImage} 
                  alt="Post attachment" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (postId) {
    return (
      <Link to={`/post/${postId}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

// Helper component to show repost indicator
export function RepostIndicator({ reposterName }: { reposterName: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 px-1">
      <Repeat2 className="h-3.5 w-3.5" />
      <span>{reposterName} reposted</span>
    </div>
  );
}
