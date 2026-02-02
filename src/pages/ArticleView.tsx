import { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getArticleBySlug } from "@/services/articleService";
import { canAccessFullArticle } from "@/services/authorFollowService";
import DOMPurify from "dompurify";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import NewsletterSubscribe from "@/components/NewsletterSubscribe";
import { ArrowLeft, Calendar } from "lucide-react";
import ArticleReactions from "@/components/ArticleReactions";
import ContentGate from "@/components/ContentGate";
import { SEOHead, ShareButton, ReportDialog } from "@/components/common";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const ArticleView = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: article, isLoading, isError } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => getArticleBySlug(slug || ''),
    enabled: !!slug,
  });

  // Fetch author profile
  const { data: authorProfile } = useQuery({
    queryKey: ['articleAuthorProfile', article?.user_id],
    queryFn: async () => {
      if (!article?.user_id) return null;
      const { data } = await supabase
        .from('public_profiles')
        .select('id, username, fullname, avatar_url')
        .eq('id', article.user_id)
        .single();
      return data;
    },
    enabled: !!article?.user_id,
  });

  // Check if user has access to full article
  const { data: hasAccess, isLoading: accessLoading } = useQuery({
    queryKey: ['articleAccess', article?.user_id, user?.id],
    queryFn: async () => {
      if (!article?.user_id) return false;
      // Own article
      if (user?.id === article.user_id) return true;
      return canAccessFullArticle(article.user_id);
    },
    enabled: !!article?.user_id,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleAccessGranted = () => {
    queryClient.invalidateQueries({ queryKey: ['articleAccess', article?.user_id] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-8 w-48 mb-6" />
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-6 w-64 mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Article not found</h2>
            <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate("/articles")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Articles
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const publishDate = article.published_at 
    ? format(new Date(article.published_at), 'MMMM d, yyyy')
    : format(new Date(article.created_at), 'MMMM d, yyyy');

  const authorName = authorProfile?.fullname || authorProfile?.username || 'Author';
  const authorInitials = authorName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  // Show preview content for gated articles
  const previewContent = article.excerpt || article.content.substring(0, 500);
  const showFullContent = hasAccess || accessLoading;

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={article.title}
        description={article.excerpt || article.content.substring(0, 160)}
        type="article"
        publishedTime={article.published_at || article.created_at}
        modifiedTime={article.updated_at}
      />
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Link to="/articles" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Articles
          </Link>
          
          <article className="prose max-w-none dark:prose-invert">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{article.title}</h1>
            
            <div className="flex items-center justify-between gap-3 text-muted-foreground mb-6 not-prose">
              <Link 
                to={`/profile/${authorProfile?.username || article.user_id}`}
                className="flex items-center gap-3 group"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={authorProfile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10">{authorInitials}</AvatarFallback>
                  </Avatar>
                  <span className="group-hover:text-primary transition-colors">{authorName}</span>
                </div>
                
                <span>•</span>
                
                <div className="flex items-center gap-1">
                  <Calendar size={16} />
                  <span>{publishDate}</span>
                </div>
              </Link>
              
              <div className="flex items-center gap-2">
                <ShareButton title={article.title} description={article.excerpt || undefined} />
                <ReportDialog contentType="article" contentId={article.id} contentTitle={article.title} />
              </div>
            </div>
            
            {showFullContent ? (
              <div 
                className="article-content"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(article.content, {
                    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'img', 'hr'],
                    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class'],
                  })
                }} 
              />
            ) : (
              <>
                {/* Preview content */}
                <div className="relative">
                  <div 
                    className="article-content"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(previewContent + '...', {
                        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'img', 'hr'],
                        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class'],
                      })
                    }} 
                  />
                  
                  {/* Fade overlay */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                </div>
                
                {/* Content gate */}
                <div className="mt-8">
                  <ContentGate 
                    authorId={article.user_id} 
                    onAccessGranted={handleAccessGranted}
                  />
                </div>
              </>
            )}
          </article>
          
          {/* Only show reactions if user has access */}
          {showFullContent && (
            <div className="my-8 p-4 border rounded-md bg-background/50">
              <h3 className="text-lg font-medium mb-2">Reactions</h3>
              <ArticleReactions articleId={article.id} />
            </div>
          )}
          
          <div className="mt-12 pt-8 border-t">
            <NewsletterSubscribe />
          </div>
          
          <div className="mt-8 flex justify-between">
            <Link to="/articles">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Articles
              </Button>
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ArticleView;
