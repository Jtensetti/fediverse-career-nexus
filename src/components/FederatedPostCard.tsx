import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Globe, MessageSquare, Heart, Repeat, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { user } = useAuth();
  
  console.log('🔍 FederatedPostCard - Rendering post:', { 
    postId: post.id,
    actorName: post.actor_name,
    profile: post.profile,
    source: post.source
  });
  
  // Load initial data
  useEffect(() => {
    loadPostData();
  }, [post.id, user?.id]);

  const loadPostData = async () => {
    try {
      console.log('📊 Loading post data for:', post.id);
      
      // Load reactions
      const reactions = await getPostReactions(post.id);
      console.log('❤️ Reactions loaded:', reactions);
      const heartReaction = reactions.find(r => r.emoji === '❤️');
      if (heartReaction) {
        setIsLiked(heartReaction.hasReacted);
        setLikeCount(heartReaction.count);
        console.log('❤️ Heart reaction state:', { isLiked: heartReaction.hasReacted, count: heartReaction.count });
      }

      // Load boost data
      const [boostCountData, userBoosted] = await Promise.all([
        getPostBoostCount(post.id),
        hasUserBoostedPost(post.id)
      ]);
      setBoostCount(boostCountData);
      setIsBoosted(userBoosted);
      console.log('🔄 Boost state:', { isBoosted: userBoosted, count: boostCountData });

      // Load reply count
      const replies = await getPostReplies(post.id);
      setReplyCount(replies.length);
      console.log('💬 Reply count:', replies.length);
    } catch (error) {
      console.error('❌ Error loading post data:', error);
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
    // For local posts, prioritize fullname from profile, then username, then fallback
    if (post.source === 'local' && post.profile) {
      const name = post.profile.fullname || post.profile.username || post.actor_name || 'Unknown user';
      console.log('👤 Local actor name:', name, 'from profile:', post.profile);
      return name;
    }
    
    // For remote posts, use actor data
    const actor = post.actor;
    const name = actor?.name || actor?.preferredUsername || post.actor_name || 'Unknown user';
    console.log('🌐 Remote actor name:', name, 'from actor:', actor);
    return name;
  };

  // Extract username from profile or actor data
  const getActorUsername = () => {
    if (post.source === 'local') {
      return post.profile?.username || post.actor?.preferredUsername || '';
    }
    return post.actor?.preferredUsername || '';
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
    const isOwner = post.source === 'local' && post.user_id === user?.id;
    console.log('🔐 Is own post?', isOwner, { postUserId: post.user_id, currentUserId: user?.id });
    return isOwner;
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
    console.log('❤️ Like button clicked, user:', user?.id);
    
    if (!user) {
      toast.error('Please sign in to react to posts');
      return;
    }
    
    console.log('❤️ Toggling reaction for post:', post.id);
    const success = await togglePostReaction(post.id, '❤️');
    if (success) {
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
      console.log('❤️ Reaction toggled successfully');
    } else {
      console.log('❌ Failed to toggle reaction');
    }
  };

  // Handle boost/repost
  const handleBoost = async () => {
    console.log('🔄 Boost button clicked, user:', user?.id);
    
    if (!user) {
      toast.error('Please sign in to boost posts');
      return;
    }
    
    console.log('🔄 Toggling boost for post:', post.id);
    const success = await togglePostBoost(post.id);
    if (success) {
      setIsBoosted(!isBoosted);
      setBoostCount(prev => isBoosted ? prev - 1 : prev + 1);
      console.log('🔄 Boost toggled successfully');
    } else {
      console.log('❌ Failed to toggle boost');
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
    console.log('✏️ Edit button clicked for post:', post.id);
    if (onEdit) {
      onEdit(post);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    console.log('🗑️ Delete confirmed for post:', post.id);
    
    try {
      await deletePost(post.id);
      console.log('✅ Post deleted successfully');
      if (onDelete) {
        onDelete(post.id);
      }
    } catch (error) {
      console.error('❌ Failed to delete post:', error);
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
              {getActorUsername() && (
                <div className="text-xs text-muted-foreground">@{getActorUsername()}</div>
              )}
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
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600">
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
