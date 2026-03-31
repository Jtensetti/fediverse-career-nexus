import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import ContentWarningDisplay from "@/components/content/ContentWarningDisplay";
import { LinkPreview } from "@/components/content/LinkPreview";
import { PollDisplay } from "@/components/content/PollDisplay";
import { QuotedPostPreview } from "@/components/posts/QuotedPostPreview";
import ImageLightbox from "@/components/content/ImageLightbox";
import { isPoll } from "@/services/posts/pollService";
import { getProxiedMediaUrl } from "@/services/federation/federationService";
import type { FederatedPost } from "@/services/federation/federationService";
import type { MediaAttachment } from "./postCardUtils";

interface PostCardContentProps {
  post: FederatedPost;
  displayContent: string;
  isTruncated: boolean;
  isQuoteRepost: boolean;
  showFullContent: boolean;
  previewUrl: string | null;
  attachments: MediaAttachment[];
}

export default function PostCardContent({
  post,
  displayContent,
  isTruncated,
  isQuoteRepost,
  showFullContent,
  previewUrl,
  attachments,
}: PostCardContentProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const quotedPost = isQuoteRepost ? (post.content?.object || null) : null;

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
        <span>{t('postCard.fromInstance')} {post.instance}</span>
        {post.moderation_status !== 'normal' && (
          <>
            <span className="mx-1">•</span>
            <Badge variant={badgeVariant === "outline" ? "outline" : "destructive"} className="text-xs">
              {post.moderation_status === 'probation' && t('postCard.instanceOnProbation')}
              {post.moderation_status === 'blocked' && t('postCard.blockedInstance')}
            </Badge>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <CardContent className="pb-3">
        {getModerationBanner()}

        <ContentWarningDisplay warning={post.content_warning || post.content?.summary || ''}>
          {post.content && isPoll(post.content as Record<string, unknown>) ? (
            <div className="space-y-3">
              {displayContent && displayContent !== 'Inget innehåll tillgängligt' && (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: displayContent }}
                />
              )}
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
                      {t('postCard.failedToLoadPoll')}
                    </div>
                  );
                }
              })()}
            </div>
          ) : (
            <>
              {displayContent && displayContent !== 'Inget innehåll tillgängligt' && (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert [&_a]:text-primary [&_a]:break-all whitespace-pre-line"
                  dangerouslySetInnerHTML={{ __html: displayContent }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName === 'A') {
                      e.stopPropagation();
                    }
                  }}
                />
              )}
            </>
          )}

          {isTruncated && (
            <button
              className="text-sm text-primary hover:underline mt-1 font-medium"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/post/${post.id}`);
              }}
            >
              {t('postCard.readMore')}
            </button>
          )}

          {previewUrl && !showFullContent && (
            <div className="mt-3">
              <LinkPreview url={previewUrl} compact={attachments.length > 0} />
            </div>
          )}

          {attachments.length > 0 && (
            <div className="mt-3 grid gap-2 rounded-xl overflow-hidden">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="relative aspect-video overflow-hidden rounded-lg bg-muted cursor-pointer group/image"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(idx);
                    setLightboxOpen(true);
                  }}
                >
                  <img
                    src={post.source === 'remote' ? getProxiedMediaUrl(att.url) : att.url}
                    alt={att.altText || att.name || 'Media attachment'}
                    className="w-full h-full object-cover group-hover/image:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover/image:opacity-100 transition-opacity text-white text-sm bg-black/50 px-2 py-1 rounded">
                      {t('postCard.clickToEnlarge')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isQuoteRepost && quotedPost && (
            <div className="mt-3">
              <QuotedPostPreview quotedPost={quotedPost} />
            </div>
          )}
        </ContentWarningDisplay>
      </CardContent>

      <ImageLightbox
        images={attachments.map(att => ({
          url: post.source === 'remote' ? getProxiedMediaUrl(att.url) : att.url,
          altText: att.altText || att.name
        }))}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </>
  );
}
