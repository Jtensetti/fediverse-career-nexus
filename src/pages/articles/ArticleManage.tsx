import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUserArticles, deleteArticle } from "@/services/articles/articleService";
import { Search, Plus, Edit, Trash, BookText, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEOHead } from "@/components/common/SEOHead";

const ArticleManage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const { data: articles = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['user-articles'],
    queryFn: getUserArticles,
  });
  
  const filteredArticles = articles.filter((article) => {
    // Filter by search query
    const matchesSearchQuery = 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.slug.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by publication status if "drafts" or "published" tab is active
    if (activeTab === 'drafts') {
      return matchesSearchQuery && !article.published;
    } else if (activeTab === 'published') {
      return matchesSearchQuery && article.published && article.moderation_status === 'published';
    }
    
    // Show all articles that match search query
    return matchesSearchQuery;
  });
  
  const handleDeleteClick = (id: string) => {
    setArticleToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!articleToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const success = await deleteArticle(articleToDelete);
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['user-articles'] });
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        setDeleteDialogOpen(false);
        setArticleToDelete(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title={t("articleForm.manageTitle")} description={t("articleForm.manageDescription")} />
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BookText className="h-6 w-6" />
                {t("articleForm.myArticles")}</h1>
              <p className="text-muted-foreground">{t("articleForm.manageSubtitle")}</p>
            </div>
            
            <div className="flex gap-4 mt-4 sm:mt-0">
              <Link to="/articles">
                <Button variant="outline">{t("articleForm.browse")}</Button>
              </Link>
              <Link to="/articles/create">
                <Button className="flex items-center gap-2">
                  <Plus size={16} />
                  {t("articleForm.newArticle")}</Button>
              </Link>
            </div>
          </div>
          
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <Input
                type="search"
                aria-label={t("articleForm.searchLabel")}
                placeholder={t("articleForm.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">{t("articleForm.all")}</TabsTrigger>
                <TabsTrigger value="drafts">{t("articleForm.draft")}</TabsTrigger>
                <TabsTrigger value="published">{t("articleForm.publishedTab")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">
              <p>{t("articleForm.loadingArticles")}</p>
            </div>
          ) : isError ? (
            <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center">
              <p className="font-medium">{t("common.error")}</p>
              <Button variant="outline" className="mt-4" onClick={() => void refetch()}>{t("common.retry")}</Button>
            </div>
          ) : filteredArticles.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block bg-card rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">{t("articleForm.titleLabel")}</TableHead>
                      <TableHead>{t("articleForm.status")}</TableHead>
                      <TableHead>{t("articleForm.created")}</TableHead>
                      <TableHead className="text-right">{t("articleForm.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArticles.map((article) => (
                      <TableRow key={article.id}>
                        <TableCell className="font-medium">
                          {article.published ? (
                            <Link 
                              to={`/articles/${article.slug}`}
                              className="hover:text-primary transition-colors hover:underline"
                            >
                              {article.title}
                            </Link>
                          ) : (
                            <Link to={`/articles/edit/${article.id}`} className="hover:text-primary hover:underline">{article.title}</Link>
                          )}
                        </TableCell>
                        <TableCell>
                          {article.moderation_status !== 'published' ? <Link to="/my-reviews"><Badge variant="outline">{article.moderation_status === 'pending' ? t("articleForm.pending") : t("articleForm.rejected")}</Badge></Link> : article.published ? (
                            <Badge variant="default" className="bg-green-700">{t("articleForm.published")}</Badge>
                          ) : (
                            <Badge variant="outline">{t("articleForm.draft")}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(article.created_at))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={t("articleForm.editNamed", { title: article.title })}
                        title={t("articleForm.editTitle")}
                        onClick={() => navigate(`/articles/edit/${article.id}`)}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={t("articleForm.deleteNamed", { title: article.title })}
                        title={t("articleForm.delete")}
                        onClick={() => handleDeleteClick(article.id)}
                            >
                              <Trash size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredArticles.map((article) => (
                  <div key={article.id} className="bg-card rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        {article.published ? (
                          <Link 
                            to={`/articles/${article.slug}`}
                            className="font-medium hover:text-primary transition-colors hover:underline block truncate"
                          >
                            {article.title}
                          </Link>
                        ) : (
                          <Link to={`/articles/edit/${article.id}`} className="font-medium block truncate hover:text-primary hover:underline">{article.title}</Link>
                        )}
                      </div>
                      {article.moderation_status !== 'published' ? <Link to="/my-reviews"><Badge variant="outline">{article.moderation_status === 'pending' ? t("articleForm.pending") : t("articleForm.rejected")}</Badge></Link> : article.published ? (
                        <Badge variant="default" className="bg-green-700 flex-shrink-0">{t("articleForm.published")}</Badge>
                      ) : (
                        <Badge variant="outline" className="flex-shrink-0">{t("articleForm.draft")}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(article.created_at))}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        aria-label={t("articleForm.editNamed", { title: article.title })}
                        title={t("articleForm.editTitle")}
                        onClick={() => navigate(`/articles/edit/${article.id}`)}
                      >
                        <Edit size={14} className="mr-1" />
                        {t("articleForm.edit")}</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={t("articleForm.deleteNamed", { title: article.title })}
                        title={t("articleForm.delete")}
                        onClick={() => handleDeleteClick(article.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 border rounded-md">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">{t("articleForm.emptyTitle")}</h2>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? t("articleForm.emptySearch")
                  : activeTab === "drafts"
                  ? t("articleForm.emptyDrafts")
                  : activeTab === "published"
                  ? t("articleForm.emptyPublished")
                  : t("articleForm.emptyArticles")}
              </p>
              <Link to="/articles/create">
                <Button className="flex items-center gap-2">
                  <Plus size={16} />
                  {t("articleForm.writeArticle")}</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
      
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!isDeleting) setDeleteDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("articleForm.delete")}</DialogTitle>
            <DialogDescription>
              {t("articleForm.deleteConfirm", { title: articles.find((article) => article.id === articleToDelete)?.title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={isDeleting} onClick={() => setDeleteDialogOpen(false)}>
              {t("articleForm.cancel")}</Button>
            <Button variant="destructive" disabled={isDeleting} onClick={handleConfirmDelete}>
              {isDeleting ? t("articleForm.deleting") : t("articleForm.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
};

export default ArticleManage;
