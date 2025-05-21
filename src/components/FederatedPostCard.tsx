
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Globe, MessageSquare, ThumbsUp, Repeat, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProxiedMediaUrl } from "@/services/federationService";
import type { FederatedPost } from "@/services/federationService";

interface FederatedPostCardProps {
  post: FederatedPost;
}

export default function FederatedPostCard({ post }: FederatedPostCardProps) {
  const [imageError, setImageError] = useState<boolean>(false);
  
  // Extract content from different ActivityPub formats
  const getContent = () => {
    if (post.type === 'Create' && post.content.object?.content) {
      return post.content.object.content;
    }
    if (post.content.content) {
      return post.content.content;
    }
    return 'No content available';
  };
  
  // Extract name from actor
  const getActorName = () => {
    const actor = post.actor;
    return actor?.name || actor?.preferredUsername || 'Unknown user';
  };
  
  // Get avatar URL with proxy for remote images
  const getAvatarUrl = () => {
    const iconUrl = post.actor?.icon?.url;
    if (!iconUrl) return null;
    
    return post.source === 'remote' ? getProxiedMediaUrl(iconUrl) : iconUrl;
  };
  
  // Get published date in relative format
  const getPublishedDate = () => {
    const date = post.content.published || post.published_at;
    if (!date) return '';
    
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (e) {
      return '';
    }
  };
  
  // Extract media attachments if any
  const getMediaAttachments = () => {
    const attachments = 
      post.content.attachment || 
      post.content.object?.attachment ||
      [];
    
    if (!Array.isArray(attachments)) return [];
    
    return attachments.filter(att => 
      att.mediaType && att.mediaType.startsWith('image/') && att.url
    );
  };
  
  const attachments = getMediaAttachments();

  // Get moderation banner styling based on status
  const getModerationBanner = () => {
    if (post.source !== 'remote' || !post.instance) return null;

    let bannerClasses = "text-xs flex items-center gap-1 px-2 py-1 rounded-sm mb-2";
    let badgeVariant = "secondary";

    if (post.moderation_status === 'probation') {
      bannerClasses += " bg-yellow-50 text-yellow-700 border border-yellow-200";
      badgeVariant = "outline";
    } else if (post.moderation_status === 'blocked') {
      bannerClasses += " bg-red-50 text-red-700 border border-red-200";
      badgeVariant = "destructive";
    } else {
      bannerClasses += " bg-slate-50 text-slate-700 border border-slate-200";
    }

    return (
      <div className={bannerClasses}>
        <Globe size={14} />
        <span>From {post.instance}</span>
        {post.moderation_status !== 'normal' && (
          <>
            <span className="mx-1">•</span>
            <Badge variant={badgeVariant === "outline" ? "outline" : "destructive"} className="text-xs">
              {post.moderation_status === 'probation' && (
                <>
                  <AlertTriangle size={12} className="mr-1" />
                  Instance on probation
                </>
              )}
              {post.moderation_status === 'blocked' && (
                <>
                  <AlertTriangle size={12} className="mr-1" />
                  Blocked instance
                </>
              )}
            </Badge>
          </>
        )}
      </div>
    );
  };

  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Avatar>
            {getAvatarUrl() && !imageError ? (
              <AvatarImage 
                src={getAvatarUrl() as string} 
                onError={() => setImageError(true)} 
              />
            ) : null}
            <AvatarFallback>{getActorName().charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="font-semibold">{getActorName()}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Globe size={14} />
              <span>{post.source === 'local' ? 'Local' : 'Remote'}</span>
              {getPublishedDate() && (
                <>
                  <span>•</span>
                  <span>{getPublishedDate()}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        {getModerationBanner()}
        
        <div 
          className="prose max-w-none dark:prose-invert" 
          dangerouslySetInnerHTML={{ __html: getContent() }} 
        />
        
        {attachments.length > 0 && (
          <div className="mt-3 grid gap-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="rounded-md overflow-hidden">
                <img 
                  src={post.source === 'remote' ? getProxiedMediaUrl(att.url) : att.url} 
                  alt={att.name || 'Media attachment'} 
                  className="w-full h-auto object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 flex gap-2">
        <Button variant="ghost" size="sm" className="flex-1">
          <ThumbsUp className="mr-1 h-4 w-4" />
          Like
        </Button>
        <Button variant="ghost" size="sm" className="flex-1">
          <MessageSquare className="mr-1 h-4 w-4" />
          Reply
        </Button>
        <Button variant="ghost" size="sm" className="flex-1">
          <Repeat className="mr-1 h-4 w-4" />
          Boost
        </Button>
      </CardFooter>
    </Card>
  );
}
