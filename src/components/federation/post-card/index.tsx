import { useState, useEffect, useRef, lazy, Suspense, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { deletePost } from "@/services/posts/postService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { linkifyWithMarkdown, smartTruncate, stripHtml } from "@/lib/linkify";
import PostCardHeader from "./PostCardHeader";
import PostCardContent from "./PostCardContent";
import PostCardActions from "./PostCardActions";
import PostCardDialogs from "./PostCardDialogs";
import type { FederatedPost } from "@/services/federation/federationService";
import type { BatchPostData } from "@/services/misc/batchDataService";
import type { CommentPreviewHandle } from "@/components/posts/CommentPreview";

const CommentPreview = lazy(() => import("@/components/posts/CommentPreview"));

interface FederatedPostCardProps {
  post: FederatedPost;
  onEdit?: (post: FederatedPost) => void;
  onDelete?: (postId: string) => void;
  initialData?: BatchPostData;
  hideComments?: boolean;
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
  const { t } = useTranslation();

  useEffect(() => {
    if (initialData) {
      setIsBoosted(initialData.userBoosted);
      setBoostCount(initialData.boostCount);
      setReplyCount(initialData.replyCount);
    }
  }, [initialData]);

  const isQuoteRepost = post.type === 'Announce' || post.content?.isQuoteRepost;

  const rawContent = useMemo(() => getRawContent(post), [post.id]);

  const { displayContent, contentUrls, isTruncated } = useMemo(() => {
    const urls = extractUrls(rawContent);
    const linkedContent = linkifyWithMarkdown(rawContent);

    if (showFullContent) {
      return { displayContent: linkedContent, contentUrls: urls, isTruncated: false };
    }

    const plainText = stripHtml(rawContent);
    const truncated = smartTruncate(plainText, 350, 25);
    const wasTruncated = truncated.endsWith('…');

    if (wasTruncated) {
      const linkedTruncated = linkifyWithMarkdown(truncated);
      return { displayContent: linkedTruncated, contentUrls: urls, isTruncated: true };
    }

    return { displayContent: linkedContent, contentUrls: urls, isTruncated: false };
  }, [rawContent, showFullContent]);

  const previewUrl = contentUrls.length > 0 ? contentUrls[0] : null;
  const attachments = useMemo(() => getMediaAttachments(post), [post.id]);

  const isOwnPost = !!user?.id && post.source === 'local' && post.user_id === user.id;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, [role="button"], [data-interactive]')) return;
    navigate(`/post/${post.id}`);
  };

  const handleBoost = () => {
    if (!user) { toast.error(t('postCard.signInToRepost')); return; }
    setShowQuoteRepostDialog(true);
  };

  const handleReply = () => {
    if (!user) { toast.error(t('postCard.signInToReply')); return; }
    if (commentPreviewRef.current) {
      commentPreviewRef.current.openComposer();
    } else {
      setShouldOpenComposer(true);
    }
  };

  const handleDelete = async () => {
    try {
      await deletePost(post.id);
      onDelete?.(post.id);
    } catch {
      toast.error(t('postCard.failedToDelete'));
    }
  };

  const actorName = getActorName(post);
  const actorUsername = getActorUsername(post);
  const avatarUrl = getAvatarUrl(post);
  const publishedAt = post.content.published || post.published_at || post.created_at;

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
          const target = e.target as HTMLElement;
          const isInsideInteractive = target.closest('input, textarea, select, button, a, [role="button"], [data-interactive], [contenteditable="true"]');
          if ((e.key === 'Enter' || e.key === ' ') && !isInsideInteractive && e.currentTarget === e.target) {
            e.preventDefault();
            navigate(`/post/${post.id}`);
          }
        }}
      >
        <PostCardHeader
          post={post}
          isQuoteRepost={!!isQuoteRepost}
          isOwnPost={isOwnPost}
          publishedDate={(() => {
            if (!publishedAt) return '';
            try {
              const { formatDistanceToNow } = require('date-fns');
              const { sv } = require('date-fns/locale');
              return formatDistanceToNow(new Date(publishedAt), { addSuffix: true, locale: sv });
            } catch { return ''; }
          })()}
          displayContent={displayContent}
          onEdit={() => onEdit?.(post)}
          onDeleteRequest={() => setShowDeleteDialog(true)}
          onReportRequest={() => setShowReportDialog(true)}
          onBlockRequest={() => setShowBlockDialog(true)}
          hasUser={!!user}
        />

        <PostCardContent
          post={post}
          displayContent={displayContent}
          isTruncated={isTruncated}
          isQuoteRepost={!!isQuoteRepost}
          showFullContent={showFullContent}
          previewUrl={previewUrl}
          attachments={attachments}
        />

        <PostCardActions
          postId={post.id}
          displayContent={displayContent}
          isBoosted={isBoosted}
          boostCount={boostCount}
          replyCount={replyCount}
          onBoost={handleBoost}
          onReply={handleReply}
          initialReactions={initialData?.reactions}
        />

        {!hideComments && (
          <div className="px-4 pb-3" data-interactive="true">
            <Suspense fallback={<div className="h-10 animate-pulse bg-muted/30 rounded" />}>
              <CommentPreview
                ref={commentPreviewRef}
                postId={post.id}
                maxComments={2}
                autoOpenComposer={shouldOpenComposer}
                onComposerOpened={() => setShouldOpenComposer(false)}
                companyContext={post.company}
              />
            </Suspense>
          </div>
        )}
      </Card>

      <PostCardDialogs
        postId={post.id}
        displayContent={displayContent}
        userId={post.user_id}
        actorName={actorName}
        actorUsername={actorUsername}
        avatarUrl={avatarUrl || undefined}
        publishedAt={publishedAt}
        isRemote={post.source === 'remote'}
        rawContent={rawContent}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        showReportDialog={showReportDialog}
        setShowReportDialog={setShowReportDialog}
        showBlockDialog={showBlockDialog}
        setShowBlockDialog={setShowBlockDialog}
        showQuoteRepostDialog={showQuoteRepostDialog}
        setShowQuoteRepostDialog={setShowQuoteRepostDialog}
        onDelete={handleDelete}
        onDeletePost={onDelete}
        onRepostSuccess={() => {
          setIsBoosted(true);
          setBoostCount(prev => prev + 1);
        }}
      />
    </>
  );
}
