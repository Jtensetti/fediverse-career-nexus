import { useState, useEffect, useRef, lazy, Suspense, useMemo } from "react";
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
import BlockUserDialog from "./BlockUserDialog";
import EnhancedPostReactions from "./EnhancedPostReactions";
import QuoteRepostDialog from "./QuoteRepostDialog";
import { QuotedPostPreview, RepostIndicator } from "./QuotedPostPreview";
import ContentWarningDisplay from "./ContentWarningDisplay";
import { LinkPreview, extractUrls } from "./LinkPreview";
import { linkifyText, smartTruncate, stripHtml } from "@/lib/linkify";
import { PollDisplay } from "./PollDisplay";
import { isPoll } from "@/services/pollService";
import DOMPurify from "dompurify";
import type { FederatedPost } from "@/services/federationService";
import type { BatchPostData } from "@/services/batchDataService";
import type { CommentPreviewHandle } from "./CommentPreview";
import { getNoltoInstanceDomain } from "@/lib/federation";

// Lazy load CommentPreview for performance
const CommentPreview = lazy(() => import("./CommentPreview"));

interface FederatedPostCardProps {
  post: FederatedPost;
  onEdit?: (post: FederatedPost) => void;
  onDelete?: (postId: string) => void;
  initialData?: BatchPostData;
  /** Hide inline comments (use on PostView where comments are shown separately) */
  hideComments?: boolean;
  /** Show full content without truncation (use on PostView) */
  showFullContent?: boolean;
}

export default function FederatedPostCard({ 
  post, 
  onEdit, 
  onDelete, 
  initialData,
  hideComments = false,
  showFullContent = false,
}: FederatedPostCardProps) {
  const [imageError, setImageError] = useState<boolean>(false);
  const [isBoosted, setIsBoosted] = useState(initialData?.userBoosted ?? false);
  const [boostCount, setBoostCount] = useState(initialData?.boostCount ?? 0);
  const [replyCount, setReplyCount] = useState(initialData?.replyCount ?? 0);
  const [showQuoteRepostDialog, setShowQuoteRepostDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [shouldOpenComposer, setShouldOpenComposer] = useState(false);
  const commentPreviewRef = useRef<CommentPreviewHandle>(null);
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
  const getRawContent = () => {
    let rawContent = '';
    
    // For quote reposts, the content is the user's comment (may be empty - that's fine)
    if (isQuoteRepost) {
      rawContent = post.content.content || '';
      // Don't show "No content available" for reposts - the quoted post IS the content
    } else if (post.type === 'Create' && post.content.object?.content) {
      // Handle Create wrapping a Question or other object
      const objectContent = post.content.object.content;
      // Ensure we're getting a string, not an object
      rawContent = typeof objectContent === 'string' ? objectContent : '';
    } else if (post.content.content) {
      const contentValue = post.content.content;
      rawContent = typeof contentValue === 'string' ? contentValue : '';
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

  // Extract URLs and prepare content for display
  const { displayContent, contentUrls, isTruncated } = useMemo(() => {
    const raw = getRawContent();
    const urls = extractUrls(raw);
    
    // Make URLs clickable
    const linkedContent = linkifyText(raw);
    
    // If showing full content (PostView), don't truncate
    if (showFullContent) {
      return { displayContent: linkedContent, contentUrls: urls, isTruncated: false };
    }
    
    // Smart truncate for feed view - URLs count as 25 chars each
    const plainText = stripHtml(raw);
    const truncated = smartTruncate(plainText, 350, 25);
    const wasTruncated = truncated.endsWith('…');
    
    // If truncated, use plain text version; otherwise use linkified HTML
    if (wasTruncated) {
      // Re-linkify the truncated plain text
      const linkedTruncated = linkifyText(truncated);
      return { displayContent: linkedTruncated, contentUrls: urls, isTruncated: true };
    }
    
    return { displayContent: linkedContent, contentUrls: urls, isTruncated: false };
  }, [post.id, showFullContent]);

  // Get the first URL to show as a preview card
  const previewUrl = contentUrls.length > 0 ? contentUrls[0] : null;
  
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

  // Handle reply - now activates inline composer
  const handleReply = () => {
    if (!user) {
      toast.error('Please sign in to reply to posts');
      return;
    }
    
    // Try to open via ref, or set flag for when component loads
    if (commentPreviewRef.current) {
      commentPreviewRef.current.openComposer();
    } else {
      setShouldOpenComposer(true);
    }
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
          // Only navigate if the Card itself is focused, not child elements like textareas
          const target = e.target as HTMLElement;
          const isInsideInteractive = target.closest('input, textarea, select, button, a, [role="button"], [data-interactive], [contenteditable="true"]');
          
          if ((e.key === 'Enter' || e.key === ' ') && !isInsideInteractive && e.currentTarget === e.target) {
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
                  <Avatar className="h-11 w-11 aspect-square flex-shrink-0 ring-2 ring-offset-2 ring-offset-background ring-transparent group-hover:ring-primary/20 transition-all">
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
                  @{getActorUsername()}{post.source === 'local' 
                    ? `@${post.profile?.home_instance && post.profile.home_instance !== 'local' ? post.profile.home_instance : getNoltoInstanceDomain()}` 
                    : post.instance ? `@${post.instance}` : ''}
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
                    title={stripHtml(displayContent).substring(0, 100)}
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
            {/* Poll display if this is a Question type */}
            {post.content && isPoll(post.content as Record<string, unknown>) ? (
              <div className="space-y-3">
                {/* Poll question text */}
                {displayContent && displayContent !== 'No content available' && (
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert" 
                    dangerouslySetInnerHTML={{ __html: displayContent }} 
                  />
                )}
                {/* Wrap PollDisplay in try-catch via error boundary pattern */}
                {(() => {
                  try {
                    return (
                      <PollDisplay 
                        pollId={post.id} 
                        content={post.content as Record<string, unknown>} 
                      />
                    );
                  } catch (e) {
                    console.error('Poll rendering error:', e);
                    return (
                      <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                        Failed to load poll
                      </div>
                    );
                  }
                })()}
              </div>
            ) : (
              <>
                {/* Post text content */}
                {displayContent && displayContent !== 'No content available' && (
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert [&_a]:text-primary [&_a]:break-all" 
                    dangerouslySetInnerHTML={{ __html: displayContent }} 
                    onClick={(e) => {
                      // Prevent card navigation when clicking links
                      if ((e.target as HTMLElement).tagName === 'A') {
                        e.stopPropagation();
                      }
                    }}
                  />
                )}
              </>
            )}

            {/* "Read more" indicator when truncated */}
            {isTruncated && (
              <button 
                className="text-sm text-primary hover:underline mt-1 font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/post/${post.id}`);
                }}
              >
                Read more
              </button>
            )}

            {/* Link Preview Card for first URL - only in feed (not on full post view) */}
            {previewUrl && !showFullContent && (
              <div className="mt-3">
                <LinkPreview url={previewUrl} compact={attachments.length > 0} />
              </div>
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
              title={stripHtml(displayContent).substring(0, 100)}
              variant="ghost"
              size="sm"
            />
          </div>
        </CardFooter>
        
        {/* Lazy-loaded Comment Preview with ref for inline commenting - hidden on PostView */}
        {!hideComments && (
          <div className="px-4 pb-3" data-interactive="true">
            <Suspense fallback={<div className="h-10 animate-pulse bg-muted/30 rounded" />}>
              <CommentPreview 
                ref={commentPreviewRef} 
                postId={post.id} 
                maxComments={2}
                autoOpenComposer={shouldOpenComposer}
                onComposerOpened={() => setShouldOpenComposer(false)}
              />
            </Suspense>
          </div>
        )}
      </Card>

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
        contentTitle={stripHtml(displayContent).substring(0, 50)}
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
          content: getRawContent(),
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
