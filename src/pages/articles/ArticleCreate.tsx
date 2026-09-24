import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import InlineErrorBanner from "@/components/forms/InlineErrorBanner";
import { useTranslation } from "react-i18next";
import { useContentCheck } from '@/hooks/useContentCheck';
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArticleFormData, createArticle, generateSlug } from "@/services/articles/articleService";
import ArticleEditor from "@/components/articles/ArticleEditor";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { SEOHead } from "@/components/common/SEOHead";
import { useIsMobile } from "@/hooks/use-mobile";
import CoverImageUpload from "@/components/content/CoverImageUpload";
import { stripHtml } from "@/lib/linkify";
import { useQueryClient } from "@tanstack/react-query";

type ValidationErrors = Partial<Record<keyof ArticleFormData, string>>;

const ArticleCreate = () => {
  const { t } = useTranslation();
  // Validation schema
  const articleSchema = z.object({
    title: z
      .string()
      .min(5, t("articleForm.titleMin"))
      .max(200, t("articleForm.titleMax")),
    content: z
      .string()
      .refine((content) => stripHtml(content).length >= 50, t("articleForm.contentMin")),
    excerpt: z
      .string()
      .max(300, t("articleForm.excerptMax"))
      .optional()
      .or(z.literal("")),
    slug: z
      .string()
      .min(3, t("articleForm.addressMin"))
      .max(100, t("articleForm.addressMax"))
      .regex(/^[a-z0-9-]+$/, t("articleForm.addressCharacters")),
    published: z.boolean().default(false),
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [customSlug, setCustomSlug] = useState(false);
  const contentCheck = useContentCheck();
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitPending = useRef(false);
  const [submitError, setSubmitError] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isEditing, setIsEditing] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [article, setArticle] = useState<ArticleFormData>({
    title: "",
    content: "",
    excerpt: "",
    slug: "",
    published: false,
  });

  const confirmDiscard = useUnsavedChanges({
    dirty: !!(article.title || stripHtml(article.content) || /<img\b/i.test(article.content) || article.excerpt || article.slug || article.published || coverImageUrl),
    message: t("ux.leaveDescription"),
  });

  const validateField = (name: keyof ArticleFormData, value: string | boolean) => {
    try {
      const partialSchema = articleSchema.pick({ [name]: true } as any);
      partialSchema.parse({ [name]: value });
      setErrors((prev) => ({ ...prev, [name]: undefined }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, [name]: error.errors[0]?.message }));
      }
      return false;
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = customSlug ? article.slug : generateSlug(title).slice(0, 100);
    setArticle({ ...article, title, slug });
    if (errors.title) validateField("title", title);
    if (errors.slug && slug) validateField("slug", slug);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "slug") setCustomSlug(true);
    setArticle({ ...article, [name]: value });
    if (errors[name as keyof ArticleFormData]) validateField(name as keyof ArticleFormData, value);
  };

  const handleContentChange = (content: string) => {
    setArticle({ ...article, content });
    if (errors.content) validateField("content", content);
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
      const result = articleSchema.safeParse(article);

      if (!result.success) {
        const fieldErrors: ValidationErrors = {};
        result.error.errors.forEach((err) => {
          const field = err.path[0] as keyof ArticleFormData;
          if (!fieldErrors[field]) {
            fieldErrors[field] = err.message;
          }
        });
        setErrors(fieldErrors);
        if (isEditing && (fieldErrors.title || fieldErrors.slug || fieldErrors.excerpt)) setIsEditing(false);
        toast.error(t("articleForm.checkFields"));
        return;
      }

      try {
        const { data: existing, error: existingError } = await supabase
          .from('articles')
          .select('id')
          .eq('slug', article.slug)
          .limit(1);

        if (existingError) throw existingError;

        if (existing && existing.length > 0) {
          setErrors((prev) => ({
            ...prev,
            slug: t("articleForm.addressTaken"),
          }));
          setIsEditing(false);
          toast.error(t("articleForm.addressTakenToast"));
          return;
        }
      } catch (error) {
        console.error('Error checking slug uniqueness:', error);
        setErrors(prev => ({ ...prev, slug: t("articleForm.addressCheckFailed") }));
        setIsEditing(false);
        toast.error(t("articleForm.addressCheckFailed"));
        return;
      }

      if (article.published && !await contentCheck.check([article.title, article.content, article.excerpt || ''].join('\n'))) return;
      const articleResult = await createArticle({ ...article, cover_image_url: coverImageUrl });
      if (articleResult) {
        queryClient.invalidateQueries({ queryKey: ['user-articles'] });
        queryClient.invalidateQueries({ queryKey: ['articles'] });
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

  // Mobile full-screen editor view
  if (isMobile && isEditing) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {contentCheck.dialog}
        {submitError && <InlineErrorBanner message={t("ux.saveUnconfirmed")} />}
        <SEOHead title={t("articleForm.createTitle")} description={t("articleForm.createDescription")} />

        <div className="flex items-center justify-between p-3 border-b border-border bg-background/95 backdrop-blur-sm">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("articleForm.settings")}</Button>
        </div>

        <div className="px-4 pt-4">
          <Label htmlFor="article-title-mobile">{t("articleForm.titleLabel")}</Label>
          <Input
            id="article-title-mobile"
            disabled={isSubmitting}
            aria-label={t("articleForm.titleAccessible")}
            maxLength={200}
            value={article.title}
            onChange={handleTitleChange}
            placeholder={t("articleForm.titleShortPlaceholder")}
            className="border-0 text-2xl font-bold placeholder:text-muted-foreground/60 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <ArticleEditor readOnly={isSubmitting}
            value={article.content}
            onChange={handleContentChange}
            placeholder={t("articleForm.contentStart")}
            className="flex-1"
          />
        </div>

        <div className="absolute bottom-16 left-0 right-0 px-4 pb-2">
          {errors.content && (
            <p className="text-sm text-destructive text-center mb-2">{errors.content}</p>
          )}
          <div className="flex items-center justify-between bg-muted/80 backdrop-blur-sm rounded-full px-4 py-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="published-mobile"
                checked={article.published}
                onCheckedChange={checked => handlePublishedChange(checked === true)}
                disabled={isSubmitting}
              />
              <Label htmlFor="published-mobile" className="text-sm">{t("articleForm.publishNow")}</Label>
            </div>
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || contentCheck.checking}>
              <Save className="h-4 w-4 mr-1" />
              {isSubmitting ? t("articleForm.saving") : article.published ? t("articleForm.publish") : t("articleForm.saveDraft")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title={t("articleForm.createTitle")} description={t("articleForm.createDescription")} />
      <Navbar />
      {contentCheck.dialog}

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className={isMobile ? "w-full" : "max-w-3xl mx-auto"}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">{t("articleForm.createTitle")}</h1>
            <Button variant="outline" onClick={() => navigate("/articles/manage")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("articleForm.cancel")}</Button>
          </div>

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
                    maxLength={200}
                    aria-invalid={!!errors.title}
                    className={errors.title ? "border-destructive" : ""}
                  />
                  {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                  <p className="text-xs text-muted-foreground">{t("articleForm.titleCount", { count: article.title.length })}</p>
                </div>

                {isMobile ? (
                  <div className="space-y-2">
                    <Label htmlFor="article-content-button">{t("articleForm.content")}</Label>
                    <Button
                      id="article-content-button"
                      type="button"
                      variant="outline"
                      className="w-full h-32 border-dashed"
                      onClick={() => setIsEditing(true)}
                    >
                      {article.content ? (
                        <span className="text-left line-clamp-3 text-muted-foreground">
                          {stripHtml(article.content).substring(0, 150)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{t("articleForm.contentMobile")}</span>
                      )}
                    </Button>
                    {errors.content && <p className="text-sm text-destructive">{errors.content}</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="article-content">{t("articleForm.content")}</Label>
                    <ArticleEditor readOnly={isSubmitting}
                      value={article.content}
                      onChange={handleContentChange}
                      placeholder={t("articleForm.contentPlaceholder")}
                    />
                    {errors.content && <p className="text-sm text-destructive">{errors.content}</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="excerpt">{t("articleForm.excerpt")}</Label>
                  <Input
                    id="excerpt"
                    name="excerpt"
                    value={article.excerpt || ""}
                    onChange={handleChange}
                    placeholder={t("articleForm.excerptPlaceholder")}
                    maxLength={300}
                    aria-invalid={!!errors.excerpt}
                    className={errors.excerpt ? "border-destructive" : ""}
                  />
                  {errors.excerpt && <p className="text-sm text-destructive">{errors.excerpt}</p>}
                  <p className="text-xs text-muted-foreground">
                    {t("articleForm.excerptCount", { count: (article.excerpt || "").length })}
                  </p>
                </div>

                {/* Cover Image */}
                <div className="space-y-2">
                  <Label>{t("articleForm.cover")}</Label>
                  <CoverImageUpload value={coverImageUrl} onChange={setCoverImageUrl} />
                  <p className="text-xs text-muted-foreground">
                    {t("articleForm.coverHelp")}</p>
                </div>

                <details open={!!errors.slug || undefined} className="rounded-md border p-4">
                  <summary className="cursor-pointer font-medium text-sm">{t("articleForm.customizeAddress")}</summary>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="slug">{t("articleForm.address")}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="slug"
                        name="slug"
                        value={article.slug}
                        onChange={handleChange}
                        placeholder={t("articleForm.addressPlaceholder")}
                        maxLength={100}
                        aria-invalid={!!errors.slug}
                        className={errors.slug ? "border-destructive" : ""}
                      />
                    </div>
                    {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
                    <p className="text-xs text-muted-foreground">
                      {t("articleForm.addressHelp")}</p>
                  </div>

                </details>

                <div className="flex items-center space-x-2">
                  <Checkbox id="published" checked={article.published} onCheckedChange={checked => handlePublishedChange(checked === true)} />
                  <Label htmlFor="published">{t("articleForm.publishToggle")}</Label>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={isSubmitting || contentCheck.checking} className="flex items-center gap-2">
                    <Save size={16} />
                    {isSubmitting ? t("articleForm.saving") : article.published ? t("articleForm.publish") : t("articleForm.saveDraft")}
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

export default ArticleCreate;
