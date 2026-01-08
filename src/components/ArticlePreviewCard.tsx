import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Lock, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { Article } from "@/services/articleService";
import FollowAuthorButton from "./FollowAuthorButton";
import { motion } from "framer-motion";

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

  const excerpt = article.excerpt || article.content.substring(0, 150);
  const initials = authorInfo?.fullname
    ? authorInfo.fullname.split(' ').map(n => n[0]).join('').toUpperCase()
    : authorInfo?.username?.[0]?.toUpperCase() || '?';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col">
        {article.cover_image_url && (
          <div className="relative h-40 overflow-hidden">
            <img
              src={article.cover_image_url}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {!hasFullAccess && (
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            )}
          </div>
        )}
        
        <CardHeader className="pb-2">
          {/* Author info */}
          {authorInfo && (
            <Link 
              to={`/profile/${authorInfo.username || authorInfo.id}`}
              className="flex items-center gap-2 mb-2 group/author"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={authorInfo.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium group-hover/author:text-primary transition-colors truncate">
                  {authorInfo.fullname || authorInfo.username}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{publishDate}</span>
                </div>
              </div>
            </Link>
          )}

          {/* Title */}
          <Link to={`/articles/${article.slug}`}>
            <h3 className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {article.title}
            </h3>
          </Link>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          {/* Excerpt with fade effect for locked content */}
          <div className="relative flex-1">
            <p className="text-muted-foreground text-sm line-clamp-3">
              {excerpt}...
            </p>
            {!hasFullAccess && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent" />
            )}
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3 mb-3">
              {article.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Action area */}
          {hasFullAccess ? (
            <Link to={`/articles/${article.slug}`}>
              <Button variant="ghost" size="sm" className="w-full mt-2">
                Read Article
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2 mt-2 pt-3 border-t">
              <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">
                Follow to read
              </span>
              {authorInfo && (
                <FollowAuthorButton
                  authorId={authorInfo.id}
                  authorName={authorInfo.fullname || authorInfo.username || undefined}
                  size="sm"
                  onFollowChange={onFollowChange}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ArticlePreviewCard;
