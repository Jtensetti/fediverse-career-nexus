
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getArticleAuthors } from "@/services/articleService";
import { Skeleton } from "@/components/ui/skeleton";

interface ArticleAuthorsProps {
  articleId: string;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
}

const ArticleAuthors = ({ 
  articleId, 
  size = "md", 
  showLabels = true 
}: ArticleAuthorsProps) => {
  const { data: authors = [], isLoading } = useQuery({
    queryKey: ['article-authors', articleId],
    queryFn: () => getArticleAuthors(articleId),
    enabled: !!articleId,
  });

  const avatarSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10"
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className={`${avatarSizes[size]} rounded-full`} />
        <div className="space-y-1">
          <Skeleton className="h-3 w-20" />
          {showLabels && <Skeleton className="h-2 w-14" />}
        </div>
      </div>
    );
  }

  if (authors.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-4">
      {authors.map((author) => (
        <div key={author.id} className="flex items-center gap-2">
          <Avatar className={avatarSizes[size]}>
            <AvatarImage src={author.profile?.avatar_url || undefined} />
            <AvatarFallback>
              {author.profile?.fullname 
                ? author.profile.fullname.substring(0, 2).toUpperCase() 
                : author.profile?.username 
                  ? author.profile.username.substring(0, 2).toUpperCase() 
                  : '??'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1">
              <span className={`font-medium ${textSizes[size]}`}>
                {author.profile?.fullname || author.profile?.username || "Unnamed User"}
              </span>
              {author.is_primary && showLabels && (
                <Badge variant="outline" className="text-xs">Primary</Badge>
              )}
            </div>
            {showLabels && author.profile?.username && (
              <p className={`${textSizes[size]} text-muted-foreground`}>@{author.profile.username}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ArticleAuthors;
