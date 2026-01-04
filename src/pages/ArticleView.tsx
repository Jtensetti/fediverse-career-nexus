
import { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getArticleBySlug } from "@/services/articleService";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import NewsletterSubscribe from "@/components/NewsletterSubscribe";
import { ArrowLeft, Calendar } from "lucide-react";
import ArticleReactions from "@/components/ArticleReactions";
import { SEOHead, ShareButton, ReportDialog } from "@/components/common";

const ArticleView = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const { data: article, isLoading, isError } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => getArticleBySlug(slug || ''),
    enabled: !!slug,
  });

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto text-center py-12">
            <p>Loading article...</p>
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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10">AU</AvatarFallback>
                  </Avatar>
                  <span>Author</span>
                </div>
                
                <span>•</span>
                
                <div className="flex items-center gap-1">
                  <Calendar size={16} />
                  <span>{publishDate}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <ShareButton title={article.title} description={article.excerpt || undefined} />
                <ReportDialog contentType="article" contentId={article.id} contentTitle={article.title} />
              </div>
            </div>
            
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {article.content}
            </ReactMarkdown>
          </article>
          
          {/* Add the emoji reactions component */}
          <div className="my-8 p-4 border rounded-md bg-background/50">
            <h3 className="text-lg font-medium mb-2">Reactions</h3>
            <ArticleReactions articleId={article.id} />
          </div>
          
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
