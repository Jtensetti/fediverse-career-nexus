
import { Article } from "@/services/articleService";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { FileText } from "lucide-react";

interface ArticleCardProps {
  article: Article;
  authorName?: string;
}

const ArticleCard = ({ article, authorName = "Author" }: ArticleCardProps) => {
  const publishDate = article.published_at 
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true })
    : formatDistanceToNow(new Date(article.created_at), { addSuffix: true });

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-gray-100">{authorName.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <span>{authorName}</span>
          <span>•</span>
          <span>{publishDate}</span>
        </div>
        <Link to={`/articles/${article.slug}`}>
          <CardTitle className="text-xl hover:text-primary transition-colors">
            {article.title}
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="pb-3 flex-grow">
        <p className="text-gray-600 line-clamp-3">
          {article.excerpt || article.content.substring(0, 150) + "..."}
        </p>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <FileText size={16} />
          <span>Article</span>
        </div>
        <Link to={`/articles/${article.slug}`} className="text-primary hover:underline">
          Read more
        </Link>
      </CardFooter>
    </Card>
  );
};

export default ArticleCard;
