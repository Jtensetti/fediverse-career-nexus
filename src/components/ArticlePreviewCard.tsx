import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bookmark, Heart, MessageCircle, Repeat2, Share } from "lucide-react";
import { format } from "date-fns";
import { Article } from "@/services/articleService";
import FollowAuthorButton from "./FollowAuthorButton";
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
    ? format(new Date(article.published_at), 'MMM d, yyyy')
    : format(new Date(article.created_at), 'MMM d, yyyy');

  const initials = authorInfo?.fullname
    ? authorInfo.fullname.split(' ').map(n => n[0]).join('').toUpperCase()
    : authorInfo?.username?.[0]?.toUpperCase() || '?';

  const displayName = authorInfo?.fullname || authorInfo?.username || 'Unknown Author';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      {/* Author header - above card like Substack */}
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

      {/* Main card with image and overlay title */}
      <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
        <Link to={`/articles/${article.slug}`} className="block">
          <div className="relative aspect-[16/10] overflow-hidden">
            {/* Image or fallback */}
            {article.cover_image_url ? (
              <img
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
            
            {/* Gradient overlay for text readability */}
            <div className={cn(
              "absolute inset-0 flex flex-col justify-end p-4",
              article.cover_image_url 
                ? "bg-gradient-to-t from-black/80 via-black/40 to-transparent"
                : "bg-gradient-to-t from-foreground/10 to-transparent"
            )}>
              {/* Author badge overlay (small, on image) */}
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
              
              {/* Title on image */}
              <h3 className={cn(
                "text-lg font-bold leading-tight line-clamp-2 pr-8",
                article.cover_image_url ? "text-white" : "text-foreground"
              )}>
                {article.title}
              </h3>
              
              {/* Bookmark icon */}
              <Bookmark className={cn(
                "absolute top-4 right-4 h-5 w-5 opacity-70 hover:opacity-100 transition-opacity",
                article.cover_image_url ? "text-white" : "text-muted-foreground"
              )} />
            </div>
          </div>
        </Link>
      </Card>

      {/* Reactions row below card */}
      <div className="flex items-center gap-4 px-1 text-muted-foreground">
        <ArticleCardReactions articleId={article.id} />
        <button className="flex items-center gap-1 hover:text-foreground transition-colors">
          <MessageCircle className="h-4 w-4" />
        </button>
        <button className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Repeat2 className="h-4 w-4" />
        </button>
        <button className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Share className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default ArticlePreviewCard;
