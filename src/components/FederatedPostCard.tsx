import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Globe, MessageSquare, Repeat, MoreHorizontal, Edit, Trash2, Flag, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ShareButton } from "@/components/common/ShareButton";
import { ReportDialog } from "@/components/common/ReportDialog";
import { ProfileHoverCard } from "@/components/common/ProfileHoverCard";
import { getProxiedMediaUrl } from "@/services/federationService";
import { useAuth } from "@/contexts/AuthContext";
import { deletePost } from "@/services/postService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import PostReplyDialog from "./PostReplyDialog";
import BlockUserDialog from "./BlockUserDialog";
import EnhancedPostReactions from "./EnhancedPostReactions";
import QuoteRepostDialog from "./QuoteRepostDialog";
import { QuotedPostPreview, RepostIndicator } from "./QuotedPostPreview";
import ContentWarningDisplay from "./ContentWarningDisplay";
import DOMPurify from "dompurify";
import type { FederatedPost } from "@/services/federationService";
import type { BatchPostData } from "@/services/batchDataService";

interface FederatedPostCardProps {
  post: FederatedPost;
  onEdit?: (post: FederatedPost) => void;
  onDelete?: (postId: string) => void;
  initialData?: BatchPostData;
}

export default function FederatedPostCard({ post, onEdit, onDelete, initialData }: FederatedPostCardProps) {
  const [imageError, setImageError] = useState<boolean>(false);
  const [isBoosted, setIsBoosted] = useState(initialData?.userBoosted ?? false);
  const [boostCount, setBoostCount] = useState(initialData?.boostCount ?? 0);
  const [replyCount, setReplyCount] = useState(initialData?.replyCount ?? 0);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [showQuoteRepostDialog, setShowQuoteRepostDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Update state when initialData changes (from parent batch fetch)
  useEffect(() => {
    if (initialData) {
      setIsBoosted(initialData.userBoosted);
      setBoostCount(initialData.boostCount);
      setReplyCount(initialData.replyCount);
    }
  }, [initialData]);

  // Handle card click to navigate to post view
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button, a, [role="button"], [data-interactive]');
    if (isInteractive) return;
    
    navigate(`/post/${post.id}`);
  };
  
  // Check if this is a quote repost
  const isQuoteRepost = post.type === 'Announce' || post.content?.isQuoteRepost;
  
  // Get the quoted post data if this is a repost
  const getQuotedPost = () => {
    if (!isQuoteRepost) return null;
    return post.content?.object || null;
  };

  // Extract content from different ActivityPub formats
  const getContent = () => {
    let rawContent = '';
    
    // For quote reposts, the content is the user's comment (may be empty - that's fine)
    if (isQuoteRepost) {
      rawContent = post.content.content || '';
      // Don't show "No content available" for reposts - the quoted post IS the content
    } else if (post.type === 'Create' && post.content.object?.content) {
      rawContent = post.content.object.content;
    } else if (post.content.content) {
      rawContent = post.content.content;
    } else {
      rawContent = 'No content available';
    }
    
    // Sanitize HTML content to prevent XSS attacks from federated content
    return DOMPurify.sanitize(rawContent, {
      ALLOWED_TAGS: ['p', 'br', 'a', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'span'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      ALLOW_DATA_ATTR: false,
    });
  };
  
  // Extract name from actor or use profile data for local posts
  const getActorName = () => {
    // For local posts, prioritize fullname from profile, then username, then fallback
    if (post.source === 'local' && post.profile) {
      return post.profile.fullname || post.profile.username || post.actor_name || 'Unknown user';
    }
    
    // For remote posts, use actor data
    const actor = post.actor;
    return actor?.name || actor?.preferredUsername || post.actor_name || 'Unknown user';
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
    if (!user?.id) return false;

    // For local posts, check if the post user_id matches current user
    if (post.source === 'local' && post.user_id) {
      return post.user_id === user.id;
    }

    return false;
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
  
  // Extract media attachments if any - now with alt text support
  const getMediaAttachments = () => {
    const attachments = 
      post.content.attachment || 
      post.content.object?.attachment ||
      [];
    
    if (!Array.isArray(attachments)) return [];
    
    return attachments.filter(att => 
      att.mediaType && att.mediaType.startsWith('image/') && att.url
    ).map(att => ({
      ...att,
      altText: att.name || '' // Use name field as alt text
    }));
  };
  
  const attachments = getMediaAttachments();

  // Handle boost/repost - now opens quote repost dialog
  const handleBoost = () => {
    if (!user) {
      toast.error('Please sign in to repost');
      return;
    }
    setShowQuoteRepostDialog(true);
  };

  // Handle successful repost
  const handleRepostSuccess = () => {
    setIsBoosted(true);
    setBoostCount(prev => prev + 1);
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
    
    try {
      await deletePost(post.id);
      if (onDelete) {
        onDelete(post.id);
      }
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
      <Card 
        className={cn(
          "mb-4 overflow-hidden group hover:shadow-md transition-all duration-200 hover:border-primary/20 cursor-pointer",
          isQuoteRepost && "border-l-4 border-l-green-500/50"
        )}
        onClick={handleCardClick}
        role="article"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/post/${post.id}`);
          }
        }}
      >
        <CardHeader className="pb-2">
          {/* Repost indicator */}
          {isQuoteRepost && <RepostIndicator reposterName={getActorName()} />}
          <div className="flex items-center gap-3">
            <ProfileHoverCard 
              username={post.source === 'local' ? post.profile?.username : undefined}
              userId={post.source === 'local' ? post.user_id : undefined}
              disabled={post.source !== 'local'}
            >
              <Link 
                to={post.source === 'local' ? `/profile/${post.profile?.username || post.user_id}` : '#'}
                className={post.source === 'local' ? 'cursor-pointer' : 'cursor-default'}
                onClick={(e) => post.source !== 'local' && e.preventDefault()}
              >
                <div className="relative">
                  <Avatar className="h-11 w-11 ring-2 ring-offset-2 ring-offset-background ring-transparent group-hover:ring-primary/20 transition-all">
                    {getAvatarUrl() && !imageError ? (
                      <AvatarImage 
                        src={getAvatarUrl() as string} 
                        onError={() => setImageError(true)} 
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getActorName().charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {post.source === 'remote' && (
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-purple-500 flex items-center justify-center ring-2 ring-background">
                      <Globe className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
              </Link>
            </ProfileHoverCard>
            
            <div className="flex-1 min-w-0">
              <ProfileHoverCard 
                username={post.source === 'local' ? post.profile?.username : undefined}
                userId={post.source === 'local' ? post.user_id : undefined}
                disabled={post.source !== 'local'}
              >
                <Link 
                  to={post.source === 'local' ? `/profile/${post.profile?.username || post.user_id}` : '#'}
                  className={post.source === 'local' ? 'hover:underline cursor-pointer' : 'cursor-default'}
                  onClick={(e) => post.source !== 'local' && e.preventDefault()}
                >
                  <div className="font-semibold truncate">{getActorName()}</div>
                </Link>
              </ProfileHoverCard>
              {getActorUsername() && (
                <div className="text-xs text-muted-foreground truncate">
                  @{getActorUsername()}{post.source === 'local' ? '@nolto.app' : post.instance ? `@${post.instance}` : ''}
                </div>
              )}
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {getPublishedDate() && <span>{getPublishedDate()}</span>}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Post options">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwnPost() && (
                  <>
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {!isOwnPost() && user && (
                  <>
                    <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                      <Flag className="mr-2 h-4 w-4" />
                      Report Post
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => setShowBlockDialog(true)}
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Block User
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <ShareButton
                    url={`${window.location.origin}/post/${post.id}`}
                    title={getContent().replace(/<[^>]*>/g, '').substring(0, 100)}
                    variant="ghost"
                    size="sm"
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="pb-3">
          {getModerationBanner()}
          
          {/* Content with optional Content Warning */}
          <ContentWarningDisplay warning={post.content_warning || post.content?.summary || ''}>
            {/* Only show content div if there's actual text content */}
            {getContent() && (
              <div 
                className="prose prose-sm max-w-none dark:prose-invert" 
                dangerouslySetInnerHTML={{ __html: getContent() }} 
              />
            )}
          
            {attachments.length > 0 && (
              <div className="mt-3 grid gap-2 rounded-xl overflow-hidden">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                    <img 
                      src={post.source === 'remote' ? getProxiedMediaUrl(att.url) : att.url} 
                      alt={att.altText || att.name || 'Media attachment'} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* Quoted Post Preview for reposts */}
            {isQuoteRepost && getQuotedPost() && (
              <div className="mt-3">
                <QuotedPostPreview quotedPost={getQuotedPost()} />
              </div>
            )}
          </ContentWarningDisplay>
        </CardContent>

        <CardFooter className="pt-0 flex items-center gap-1 border-t border-border/50 mx-2 sm:mx-4 py-2" data-interactive="true">
          {/* Enhanced Reactions - compact mode with reaction picker */}
          <EnhancedPostReactions postId={post.id} compact initialReactions={initialData?.reactions} />
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5 rounded-full hover:text-primary hover:bg-primary/10 transition-all duration-200 px-3" 
            onClick={handleReply}
            aria-label="Reply to post"
          >
            <MessageSquare className="h-4 w-4" />
            {replyCount > 0 && <span className="text-xs">{replyCount}</span>}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "gap-1.5 rounded-full transition-all duration-200 px-3",
              isBoosted ? "text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950" : "hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950"
            )}
            onClick={handleBoost}
            aria-label={isBoosted ? "Remove boost" : "Boost post"}
            aria-pressed={isBoosted}
          >
            <Repeat className={cn("h-4 w-4 transition-transform", isBoosted && "text-green-500")} />
            {boostCount > 0 && <span className="text-xs">{boostCount}</span>}
          </Button>
          <div className="ml-auto">
            <ShareButton
              url={`${window.location.origin}/post/${post.id}`}
              title={getContent().replace(/<[^>]*>/g, '').substring(0, 100)}
              variant="ghost"
              size="sm"
            />
          </div>
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportDialog
        contentType="post"
        contentId={post.id}
        contentTitle={getContent().replace(/<[^>]*>/g, '').substring(0, 50)}
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
      />

      {post.user_id && (
        <BlockUserDialog
          open={showBlockDialog}
          onOpenChange={setShowBlockDialog}
          userId={post.user_id}
          userName={getActorName()}
          onBlocked={() => onDelete?.(post.id)}
        />
      )}

      <QuoteRepostDialog
        open={showQuoteRepostDialog}
        onOpenChange={setShowQuoteRepostDialog}
        originalPost={{
          id: post.id,
          content: getContent(),
          authorName: getActorName(),
          authorUsername: getActorUsername(),
          authorAvatar: getAvatarUrl() || undefined,
          publishedAt: post.content.published || post.published_at || post.created_at,
          isRemote: post.source === 'remote'
        }}
        onSuccess={handleRepostSuccess}
      />
    </>
  );
}
