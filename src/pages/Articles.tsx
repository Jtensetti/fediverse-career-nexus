import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getPublishedArticles, Article, ArticleWithAccess } from "@/services/articleService";
import { canAccessFullArticle } from "@/services/authorFollowService";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import ArticlePreviewCard from "@/components/ArticlePreviewCard";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, BookText, Users, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const Articles = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  // Fetch all published articles
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: getPublishedArticles,
  });

  // Fetch author profiles for all articles
  const authorIds = [...new Set(articles.map(a => a.user_id))];
  
  const { data: authorProfiles = {} } = useQuery({
    queryKey: ['articleAuthors', authorIds],
    queryFn: async () => {
      if (authorIds.length === 0) return {};
      const { data } = await supabase
        .from('public_profiles')
        .select('id, username, fullname, avatar_url')
        .in('id', authorIds);
      return Object.fromEntries((data || []).map(p => [p.id, p]));
    },
    enabled: authorIds.length > 0,
  });

  // Fetch access status for each unique author
  const { data: accessMap = {} } = useQuery({
    queryKey: ['articleAccessMap', authorIds, user?.id],
    queryFn: async () => {
      if (!user || authorIds.length === 0) return {};
      const results: Record<string, boolean> = {};
      await Promise.all(
        authorIds.map(async (authorId) => {
          results[authorId] = await canAccessFullArticle(authorId);
        })
      );
      return results;
    },
    enabled: !!user && authorIds.length > 0,
  });

  // Process articles with access info
  const articlesWithAccess: ArticleWithAccess[] = articles.map(article => ({
    ...article,
    hasFullAccess: user?.id === article.user_id || accessMap[article.user_id] || false,
    authorInfo: authorProfiles[article.user_id],
  }));

  // Filter by search query
  const filteredArticles = articlesWithAccess.filter((article) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      article.title.toLowerCase().includes(searchLower) ||
      article.content.toLowerCase().includes(searchLower) ||
      (article.excerpt && article.excerpt.toLowerCase().includes(searchLower));
    
    if (!matchesSearch) return false;
    
    // Filter by tab
    if (activeTab === "accessible") {
      return article.hasFullAccess;
    }
    
    return true;
  });

  const handleFollowChange = () => {
    // Refetch access map when follow status changes
    queryClient.invalidateQueries({ queryKey: ['articleAccessMap'] });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookText className="h-8 w-8" />
                {t("articles.title")}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t("articles.subtitle")}
              </p>
            </div>
            
            <Link to="/articles/manage">
              <Button className="mt-4 md:mt-0">
                {t("articles.manage")}
              </Button>
            </Link>
          </div>
          
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              type="text"
              placeholder={t("articles.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {user && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <BookText className="h-4 w-4" />
                  {t("articles.all")}
                </TabsTrigger>
                <TabsTrigger value="accessible" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  {t("articles.fromNetwork")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          
          <Separator className="my-6" />
          
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredArticles.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredArticles.map((article) => (
                <ArticlePreviewCard
                  key={article.id}
                  article={article}
                  authorInfo={article.authorInfo}
                  hasFullAccess={article.hasFullAccess}
                  onFollowChange={handleFollowChange}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">{t("articles.noArticles")}</h2>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? t("articles.noMatchSearch")
                  : activeTab === "accessible"
                  ? t("articles.noNetworkArticles")
                  : t("articles.noPublished")}
              </p>
              {activeTab === "accessible" && (
                <Button variant="outline" onClick={() => setActiveTab("all")}>
                  <Users className="h-4 w-4 mr-2" />
                  {t("articles.browseAll")}
                </Button>
              )}
              {activeTab === "all" && !searchQuery && (
                <Link to="/articles/create">
                  <Button>{t("articles.writeFirst")}</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Articles;
