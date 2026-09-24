import { dateLocale } from "@/lib/locale";
import { MediaImage } from "@/components/content/MediaImage";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShareButton } from "@/components/common/ShareButton";
import { format } from "date-fns";

import { Article } from "@/services/articles/articleService";
import FollowAuthorButton from "../social/FollowAuthorButton";
import ArticleCardReactions from "./ArticleCardReactions";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ArticlePreviewCardProps {
  article: Article;
  authorInfo?: {
    id: string;
    username: string | null;
    fullname: string | null;
    avatar_url: string | null;
  };
  hasFullAccess: boolean;
  onFollowChange?: () => void;
}

const ArticlePreviewCard = ({ 
  article, 
  authorInfo, 
  hasFullAccess,
  onFollowChange 
}: ArticlePreviewCardProps) => {
  const publishDate = article.published_at 
    ? format(new Date(article.published_at), 'd MMM yyyy', { locale: dateLocale() })
    : format(new Date(article.created_at), 'd MMM yyyy', { locale: dateLocale() });

  const initials = authorInfo?.fullname
    ? authorInfo.fullname.split(' ').map(n => n[0]).join('').toUpperCase()
    : authorInfo?.username?.[0]?.toUpperCase() || '?';

  const displayName = authorInfo?.fullname || authorInfo?.username || 'Okänd författare';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      {authorInfo && (
        <div className="flex items-center justify-between px-1">
          <Link 
            to={`/profile/${authorInfo.username || authorInfo.id}`}
            className="flex items-center gap-2 group"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={authorInfo.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                {displayName}
              </p>
              <p className="text-xs text-muted-foreground">{publishDate}</p>
            </div>
          </Link>
          
          {!hasFullAccess && (
            <FollowAuthorButton
              authorId={authorInfo.id}
              authorName={displayName}
              size="sm"
              onFollowChange={onFollowChange}
            />
          )}
        </div>
      )}

      <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
        <Link to={`/articles/${article.slug}`} className="block">
          <div className="relative aspect-[16/10] overflow-hidden">
            {article.cover_image_url ? (
              <MediaImage
                src={article.cover_image_url}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <div className="text-muted-foreground/30">
                  <svg 
                    className="w-16 h-16" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                    />
                  </svg>
                </div>
              </div>
            )}
            
            <div className={cn(
              "absolute inset-0 flex flex-col justify-end p-4",
              article.cover_image_url 
                ? "bg-gradient-to-t from-black/80 via-black/40 to-transparent"
                : "bg-gradient-to-t from-foreground/10 to-transparent"
            )}>
              {authorInfo && article.cover_image_url && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Avatar className="h-5 w-5 border border-white/20">
                    <AvatarImage src={authorInfo.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-[10px]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className={cn(
                    "text-xs font-medium",
                    article.cover_image_url ? "text-white/90" : "text-foreground/70"
                  )}>
                    {displayName.toUpperCase()}
                  </span>
                </div>
              )}
              
              <h3 className={cn(
                "text-lg font-bold leading-tight line-clamp-2 pr-8",
                article.cover_image_url ? "text-white" : "text-foreground"
              )}>
                {article.title}
              </h3>
              
            </div>
          </div>
        </Link>
      </Card>

      <div className="flex items-center gap-4 px-1 text-muted-foreground">
        <Link to={`/articles/${article.slug}#reactions`} aria-label={`Visa reaktioner på ${article.title}`} className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArticleCardReactions articleId={article.id} />
        </Link>
        <ShareButton
          url={`${window.location.origin}/articles/${article.slug}`}
          title={article.title}
          description={article.excerpt || undefined}
          variant="ghost"
        />
      </div>
    </motion.div>
  );
};

export default ArticlePreviewCard;
