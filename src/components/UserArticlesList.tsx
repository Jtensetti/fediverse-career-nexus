import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getUserPublishedArticles, Article } from "@/services/articleService";
import { canAccessFullArticle } from "@/services/authorFollowService";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Lock, Calendar } from "lucide-react";
import { format } from "date-fns";
import FollowAuthorButton from "./FollowAuthorButton";
import { Skeleton } from "@/components/ui/skeleton";

interface UserArticlesListProps {
  userId: string;
  isOwnProfile?: boolean;
}

const UserArticlesList = ({ userId, isOwnProfile = false }: UserArticlesListProps) => {
  const { user } = useAuth();

  const { data: articles, isLoading } = useQuery({
    queryKey: ['userArticles', userId],
    queryFn: () => getUserPublishedArticles(userId),
  });

  const { data: hasAccess } = useQuery({
    queryKey: ['articleAccess', userId],
    queryFn: () => canAccessFullArticle(userId),
    enabled: !!user && !isOwnProfile,
  });

  // Own profile or has access can see everything
  const canReadFull = isOwnProfile || hasAccess;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-20 w-20 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No articles published yet</p>
        {isOwnProfile && (
          <Button variant="outline" asChild className="mt-4">
            <Link to="/articles/create">Write Your First Article</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((article: Article) => (
        <Card key={article.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {article.cover_image_url && (
                <div className="flex-shrink-0 w-20 h-20 rounded overflow-hidden">
                  <img 
                    src={article.cover_image_url} 
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Link 
                  to={`/articles/${article.slug}`}
                  className="font-semibold hover:text-primary transition-colors line-clamp-2"
                >
                  {article.title}
                </Link>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {article.published_at 
                      ? format(new Date(article.published_at), 'MMM d, yyyy')
                      : format(new Date(article.created_at), 'MMM d, yyyy')}
                  </span>
                </div>

                {canReadFull ? (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {article.excerpt || article.content.substring(0, 100)}...
                  </p>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Follow to read</span>
                  </div>
                )}

                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {article.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {!canReadFull && !isOwnProfile && (
        <div className="text-center pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-3">
            Follow to access all articles and get notified of new ones
          </p>
          <FollowAuthorButton authorId={userId} />
        </div>
      )}
    </div>
  );
};

export default UserArticlesList;
