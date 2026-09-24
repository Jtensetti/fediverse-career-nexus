import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import InlineErrorBanner from "@/components/forms/InlineErrorBanner";
import { useTranslation } from "react-i18next";
import { useContentCheck } from '@/hooks/useContentCheck';

import { useRef, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArticleFormData,
  updateArticle,
  getArticleById,
  getArticleAuthors,
  addCoAuthor,
  removeCoAuthor,
  searchUsers
} from "@/services/articles/articleService";
import ArticleEditor from "@/components/articles/ArticleEditor";
import CoverImageUpload from "@/components/content/CoverImageUpload";
import { toast } from "sonner";
import { ArrowLeft, Save, UserPlus, X, Users, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SEOHead } from "@/components/common/SEOHead";
import { stripHtml } from "@/lib/linkify";

const ArticleEdit = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const contentCheck = useContentCheck();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitPending = useRef(false);
  const [submitError, setSubmitError] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [article, setArticle] = useState<ArticleFormData>({
    title: "",
    content: "",
    excerpt: "",
    slug: "",
    published: false,
  });
  const [baseline, setBaseline] = useState<string | null>(null);
  const initializedArticle = useRef<string | null>(null);
  const confirmDiscard = useUnsavedChanges({
    dirty: baseline !== null && JSON.stringify({ ...article, cover_image_url: coverImageUrl }) !== baseline,
    message: t("ux.leaveDescription"),
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showAddCoAuthorDialog, setShowAddCoAuthorDialog] = useState(false);

  const { data: originalArticle, isLoading: articleLoading } = useQuery({
    queryKey: ['article', id],
    queryFn: () => getArticleById(id || ''),
    enabled: !!id,
  });

  const { data: authors = [], isLoading: authorsLoading } = useQuery({
    queryKey: ['article-authors', id],
    queryFn: () => getArticleAuthors(id || ''),
    enabled: !!id,
  });

  const isPrimaryAuthor = authors.some(
    author => author.is_primary && author.user_id === user?.id
  );

  useEffect(() => {
    if (originalArticle && initializedArticle.current !== originalArticle.id) {
      setArticle({
        title: originalArticle.title,
        content: originalArticle.content,
        excerpt: originalArticle.excerpt || "",
        slug: originalArticle.slug,
        published: originalArticle.published,
      });
      setCoverImageUrl(originalArticle.cover_image_url || null);
      setBaseline(JSON.stringify({ title: originalArticle.title, content: originalArticle.content, excerpt: originalArticle.excerpt || "", slug: originalArticle.slug, published: originalArticle.published, cover_image_url: originalArticle.cover_image_url || null }));
      initializedArticle.current = originalArticle.id;
    }
  }, [originalArticle]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setArticle({ ...article, title });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setArticle({ ...article, [name]: value });
  };

  const handleContentChange = (content: string) => {
    setArticle({ ...article, content });
  };

  const handlePublishedChange = (checked: boolean) => {
    setArticle({ ...article, published: checked });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitPending.current) return;
    submitPending.current = true;
    setIsSubmitting(true);
    setSubmitError(false);
    try {
      if (!id) {
        toast.error(t("articleForm.missingId"));
        return;
      }
      if (!article.title) {
        toast.error(t("articleForm.missingTitle"));
        return;
      }
      if (!stripHtml(article.content)) {
        toast.error(t("articleForm.missingContent"));
        return;
      }

      if (article.published && !await contentCheck.check([article.title, article.content, article.excerpt || ''].join('\n'))) return;
      const result = await updateArticle(id, { ...article, cover_image_url: coverImageUrl });
      if (result) {
        queryClient.invalidateQueries({ queryKey: ['article'] });
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        queryClient.invalidateQueries({ queryKey: ['userArticles'] });
        queryClient.invalidateQueries({ queryKey: ['user-articles'] });
        confirmDiscard.afterSave(() => navigate("/articles/manage"));
      } else {
        setSubmitError(true);
      }
    } catch {
      setSubmitError(true);
    } finally {
      submitPending.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSearchUsers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchTerm(query);

    if (query.length >= 3) {
      const results = await searchUsers(query);
      const filteredResults = results.filter(
        user => !authors.some(author => author.user_id === user.id)
      );
      setSearchResults(filteredResults);
    } else {
      setSearchResults([]);
    }
  };

  const handleAddCoAuthor = async (userId: string) => {
    if (!id) return;
    const success = await addCoAuthor(id, userId);
    if (success) {
      setSearchTerm("");
      setSearchResults([]);
      queryClient.invalidateQueries({ queryKey: ['article-authors', id] });
    }
  };

  const handleRemoveCoAuthor = async (userId: string) => {
    if (!id) return;
    const success = await removeCoAuthor(id, userId);
    if (success) {
      queryClient.invalidateQueries({ queryKey: ['article-authors', id] });
    }
  };

  if (articleLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SEOHead title={t("articleForm.editTitle")} description={t("articleForm.editDescription")} />
        <Navbar />
        {contentCheck.dialog}
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p>{t("articleForm.loadingArticle")}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!originalArticle) {
    return (
      <div className="min-h-screen flex flex-col">
        <SEOHead title={t("articleForm.editTitle")} description={t("articleForm.editDescription")} />
        <Navbar />
        {contentCheck.dialog}
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">{t("articleForm.notFound")}</h2>
            <p className="mb-6">{t("articleForm.notFoundHelp")}</p>
            <Button onClick={() => navigate("/articles/manage")}>
              {t("articleForm.back")}</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title={t("articleForm.editTitle")} description={t("articleForm.editDescription")} />
      <Navbar />
      {contentCheck.dialog}

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">{t("articleForm.editTitle")}</h1>
            <Button variant="outline" onClick={() => navigate("/articles/manage")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("articleForm.cancel")}</Button>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <Users size={18} />
                  {t("articleForm.authors")}</h2>
                <Dialog open={showAddCoAuthorDialog} onOpenChange={setShowAddCoAuthorDialog}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                      disabled={!isPrimaryAuthor && authors.length > 0}
                    >
                      <UserPlus size={16} />
                      {t("articleForm.addAuthor")}</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("articleForm.addAuthor")}</DialogTitle>
                      <DialogDescription>
                        {t("articleForm.authorHelp")}</DialogDescription>
                    </DialogHeader>

                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                      <Input
                        aria-label={t("articleForm.authorSearchLabel")}
                        placeholder={t("articleForm.authorSearch")}
                        value={searchTerm}
                        onChange={handleSearchUsers}
                        className="pl-10"
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                      {searchResults.length > 0 ? (
                        <div className="space-y-2">
                          {searchResults.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={user.avatar_url} />
                                  <AvatarFallback className="bg-primary/10">
                                    {user.fullname ? user.fullname.substring(0, 2).toUpperCase() :
                                     user.username ? user.username.substring(0, 2).toUpperCase() : '??'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.fullname || user.username || t("articleForm.unnamed")}</p>
                                  {user.username && <p className="text-sm text-muted-foreground">@{user.username}</p>}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  handleAddCoAuthor(user.id);
                                  setShowAddCoAuthorDialog(false);
                                }}
                              >
                                {t("articleForm.add")}</Button>
                            </div>
                          ))}
                        </div>
                      ) : searchTerm.length >= 3 ? (
                        <p className="text-center py-4 text-muted-foreground">{t("articleForm.noUsers")}</p>
                      ) : searchTerm.length > 0 ? (
                        <p className="text-center py-4 text-muted-foreground">{t("articleForm.minimumSearch")}</p>
                      ) : (
                        <p className="text-center py-4 text-muted-foreground">{t("articleForm.authorSearchHelp")}</p>
                      )}
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddCoAuthorDialog(false)}>
                        {t("articleForm.cancel")}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {authorsLoading ? (
                <p className="text-center py-2 text-muted-foreground">{t("articleForm.loadingAuthors")}</p>
              ) : authors.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {authors.map((author) => (
                    <div key={author.id} className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={author.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {author.profile?.fullname ? author.profile.fullname.substring(0, 2).toUpperCase() :
                           author.profile?.username ? author.profile.username.substring(0, 2).toUpperCase() : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {author.profile?.fullname || author.profile?.username || t("articleForm.unnamed")}
                      </span>
                      {author.is_primary && (
                        <Badge variant="outline" className="text-xs ml-1">{t("articleForm.primary")}</Badge>
                      )}
                      {!author.is_primary && isPrimaryAuthor && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 ml-1 text-muted-foreground hover:text-destructive"
                                aria-label={t("articleForm.removeAuthorNamed", { name: author.profile?.fullname || author.profile?.username || t("articleForm.coAuthor") })}
                                onClick={() => handleRemoveCoAuthor(author.user_id)}
                              >
                                <X size={12} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("articleForm.removeAuthor")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-2 text-muted-foreground">{t("articleForm.noAuthors")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6" aria-busy={isSubmitting}>
                <fieldset disabled={isSubmitting} className="contents">
                {submitError && <InlineErrorBanner message={t("ux.saveUnconfirmed")} />}
                <div className="space-y-2">
                  <Label htmlFor="title">{t("articleForm.titleLabel")}</Label>
                  <Input
                    id="title"
                    name="title"
                    value={article.title}
                    onChange={handleTitleChange}
                    placeholder={t("articleForm.titlePlaceholder")}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="article-content">{t("articleForm.content")}</Label>
                  <ArticleEditor readOnly={isSubmitting}
                    value={article.content}
                    onChange={handleContentChange}
                    placeholder={t("articleForm.contentPlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excerpt">{t("articleForm.excerpt")}</Label>
                  <Textarea
                    id="excerpt"
                    name="excerpt"
                    value={article.excerpt || ""}
                    onChange={handleChange}
                    placeholder={t("articleForm.excerptPlaceholder")}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("articleForm.excerptHelp")}</p>
                </div>

                {/* Cover Image */}
                <div className="space-y-2">
                  <Label>{t("articleForm.cover")}</Label>
                  <CoverImageUpload value={coverImageUrl} onChange={setCoverImageUrl} />
                  <p className="text-xs text-muted-foreground">
                    {t("articleForm.coverHelp")}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">{t("articleForm.address")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="slug"
                      name="slug"
                      value={article.slug}
                      onChange={handleChange}
                      placeholder={t("articleForm.addressPlaceholder")}
                      required
                      pattern="[a-z0-9-]{3,100}"
                      maxLength={100}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("articleForm.addressWarning")}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="published"
                    checked={article.published}
                    onCheckedChange={checked => handlePublishedChange(checked === true)}
                  />
                  <Label htmlFor="published">{t("articleForm.publishToggle")}</Label>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={isSubmitting || contentCheck.checking} className="flex items-center gap-2">
                    <Save size={16} />
                    {isSubmitting ? t("articleForm.saving") : article.published ? (originalArticle.published ? t("articleForm.saveChanges") : t("articleForm.publish")) : (originalArticle.published ? t("articleForm.unpublish") : t("articleForm.saveDraft"))}
                  </Button>
                </div>
                </fieldset>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ArticleEdit;
