
import { useState, useEffect } from "react";
import { getPublishedArticles, Article } from "@/services/articleService";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import NewsletterSubscribe from "@/components/NewsletterSubscribe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, BookText } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";

const Articles = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: getPublishedArticles,
  });
  
  const filteredArticles = articles.filter((article) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      article.title.toLowerCase().includes(searchLower) ||
      article.content.toLowerCase().includes(searchLower) ||
      (article.excerpt && article.excerpt.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookText className="h-8 w-8" />
                Articles
              </h1>
              <p className="text-muted-foreground mt-1">Read our latest articles and stay informed</p>
            </div>
            
            <Link to="/articles/manage">
              <Button className="mt-4 md:mt-0">
                Manage My Articles
              </Button>
            </Link>
          </div>
          
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="mb-8">
            <NewsletterSubscribe />
          </div>
          
          <Separator className="my-6" />
          
          {isLoading ? (
            <div className="text-center py-12">
              <p>Loading articles...</p>
            </div>
          ) : filteredArticles.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">No articles found</h2>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? "No articles match your search query."
                  : "There are no published articles yet."}
              </p>
              <Link to="/articles/create">
                <Button>Write Your First Article</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Articles;
