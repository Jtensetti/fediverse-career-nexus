
import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Globe, MessageSquare, Heart, Repeat, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getProxiedMediaUrl } from "@/services/federationService";
import { useAuth } from "@/contexts/AuthContext";
import { deletePost } from "@/services/postService";
import { togglePostReaction, getPostReactions } from "@/services/postReactionsService";
import { togglePostBoost, getPostBoostCount, hasUserBoostedPost } from "@/services/postBoostService";
import { getPostReplies } from "@/services/postReplyService";
import { toast } from "sonner";
import PostReplyDialog from "./PostReplyDialog";
import type { FederatedPost } from "@/services/federationService";

interface FederatedPostCardProps {
  post: FederatedPost;
  onEdit?: (post: FederatedPost) => void;
  onDelete?: (postId: string) => void;
}

export default function FederatedPostCard({ post, onEdit, onDelete }: FederatedPostCardProps) {
  const [imageError, setImageError] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isBoosted, setIsBoosted] = useState(false);
  const [boostCount, setBoostCount] = useState(0);
  const [replyCount, setReplyCount] = useState(0);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const { user } = useAuth();
  
  // Load initial data
  useEffect(() => {
    loadPostData();
  }, [post.id]);

  const loadPostData = async () => {
    try {
      // Load reactions
      const reactions = await getPostReactions(post.id);
      const heartReaction = reactions.find(r => r.emoji === '❤️');
      if (heartReaction) {
        setIsLiked(heartReaction.hasReacted);
        setLikeCount(heartReaction.count);
      }

      // Load boost data
      const [boostCountData, userBoosted] = await Promise.all([
        getPostBoostCount(post.id),
        hasUserBoostedPost(post.id)
      ]);
      setBoostCount(boostCountData);
      setIsBoosted(userBoosted);

      // Load reply count
      const replies = await getPostReplies(post.id);
      setReplyCount(replies.length);
    } catch (error) {
      console.error('Error loading post data:', error);
    }
  };
  
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
  
  // Extract name from actor or use profile data for local posts
  const getActorName = () => {
    // For local posts, try to get the profile name first
    if (post.source === 'local' && post.profile) {
      return post.profile.fullname || post.profile.username || 'Unknown user';
    }
    
    // For remote posts, use actor data
    const actor = post.actor;
    return actor?.name || actor?.preferredUsername || post.actor_name || 'Unknown user';
  };
  
  // Get avatar URL with proxy for remote images
  const getAvatarUrl = () => {
    // For local posts, use profile avatar
    if (post.source === 'local' && post.profile?.avatar_url) {
      return post.profile.avatar_url;
    }
    
    // For remote posts, use actor icon
    const iconUrl = post.actor?.icon?.url || post.actor_avatar;
    if (!iconUrl) return null;
    
    return post.source === 'remote' ? getProxiedMediaUrl(iconUrl) : iconUrl;
  };
  
  // Check if current user owns this post
  const isOwnPost = () => {
    return post.source === 'local' && post.user_id === user?.id;
  };
  
  // Get published date in relative format
  const getPublishedDate = () => {
    const date = post.content.published || post.published_at || post.created_at;
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

  // Handle like/react
  const handleLike = async () => {
    if (!user) {
      toast.error('Please sign in to react to posts');
      return;
    }
    
    const success = await togglePostReaction(post.id, '❤️');
    if (success) {
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    }
  };

  // Handle boost/repost
  const handleBoost = async () => {
    if (!user) {
      toast.error('Please sign in to boost posts');
      return;
    }
    
    const success = await togglePostBoost(post.id);
    if (success) {
      setIsBoosted(!isBoosted);
      setBoostCount(prev => isBoosted ? prev - 1 : prev + 1);
    }
  };

  // Handle reply
  const handleReply = () => {
    if (!user) {
      toast.error('Please sign in to reply to posts');
      return;
    }
    
    setShowReplyDialog(true);
  };

  // Handle reply created
  const handleReplyCreated = () => {
    setReplyCount(prev => prev + 1);
  };

  // Handle edit
  const handleEdit = () => {
    if (onEdit) {
      onEdit(post);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!onDelete) return;
    
    try {
      await deletePost(post.id);
      toast.success('Post deleted successfully');
      onDelete(post.id);
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

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
              {post.moderation_status === 'probation' && 'Instance on probation'}
              {post.moderation_status === 'blocked' && 'Blocked instance'}
            </Badge>
          </>
        )}
      </div>
    );
  };

  return (
    <>
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

            {isOwnPost() && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex-1 ${isLiked ? 'text-red-500' : ''}`}
            onClick={handleLike}
          >
            <Heart className={`mr-1 h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            {likeCount > 0 ? likeCount : 'Like'}
          </Button>
          <Button variant="ghost" size="sm" className="flex-1" onClick={handleReply}>
            <MessageSquare className="mr-1 h-4 w-4" />
            {replyCount > 0 ? replyCount : 'Reply'}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex-1 ${isBoosted ? 'text-green-600' : ''}`}
            onClick={handleBoost}
          >
            <Repeat className="mr-1 h-4 w-4" />
            {boostCount > 0 ? boostCount : 'Boost'}
          </Button>
        </CardFooter>
      </Card>

      <PostReplyDialog
        open={showReplyDialog}
        onOpenChange={setShowReplyDialog}
        postId={post.id}
        onReplyCreated={handleReplyCreated}
      />
    </>
  );
}
