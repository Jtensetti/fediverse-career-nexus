import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArticleFormData, createArticle, generateSlug, updateArticle } from "@/services/articleService";
import ArticleEditor from "@/components/ArticleEditor";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/common/SEOHead";
import { useIsMobile } from "@/hooks/use-mobile";
import CoverImageUpload from "@/components/CoverImageUpload";

// Validation schema
const articleSchema = z.object({
  title: z
    .string()
    .min(5, "Titeln måste vara minst 5 tecken")
    .max(200, "Titeln får vara max 200 tecken"),
  content: z
    .string()
    .min(50, "Innehållet måste vara minst 50 tecken"),
  excerpt: z
    .string()
    .max(300, "Sammanfattningen får vara max 300 tecken")
    .optional()
    .or(z.literal("")),
  slug: z
    .string()
    .min(3, "Slug måste vara minst 3 tecken")
    .max(100, "Slug får vara max 100 tecken")
    .regex(/^[a-z0-9-]+$/, "Slug kan bara innehålla små bokstäver, siffror och bindestreck"),
  published: z.boolean().default(false),
});

type ValidationErrors = Partial<Record<keyof ArticleFormData, string>>;

const ArticleCreate = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    const slug = generateSlug(title);
    setArticle({ ...article, title, slug });
    validateField("title", title);
    if (slug) validateField("slug", slug);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setArticle({ ...article, [name]: value });
    validateField(name as keyof ArticleFormData, value);
  };

  const handleContentChange = (content: string) => {
    setArticle({ ...article, content });
    validateField("content", content);
  };

  const handlePublishedChange = (checked: boolean) => {
    setArticle({ ...article, published: checked });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      toast.error("Vänligen åtgärda valideringsfelen innan du skickar");
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
          slug: "Den titeln/slugen används redan. Välj en annan.",
        }));
        toast.error("Den titeln har redan använts. Välj en annan.");
        return;
      }
    } catch (error) {
      console.error('Error checking slug uniqueness:', error);
      toast.error('Kunde inte validera titelns unikhet. Försök igen.');
      return;
    }

    setIsSubmitting(true);

    try {
      const articleResult = await createArticle(article);
      if (articleResult) {
        if (coverImageUrl) {
          await supabase
            .from('articles')
            .update({ cover_image_url: coverImageUrl })
            .eq('id', articleResult.id);
        }
        toast.success("Artikeln skapades!");
        navigate("/articles/manage");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mobile full-screen editor view
  if (isMobile && isEditing) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <SEOHead title="Skapa ny artikel" description="Skriv och publicera en ny artikel på Samverkan." />
        
        <div className="flex items-center justify-between p-3 border-b border-border bg-background/95 backdrop-blur-sm">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Avsluta artikelläge
          </Button>
        </div>

        <div className="px-4 pt-4">
          <Input
            value={article.title}
            onChange={handleTitleChange}
            placeholder="Lägg till en titel"
            className="border-0 text-2xl font-bold placeholder:text-muted-foreground/60 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <ArticleEditor
            value={article.content}
            onChange={handleContentChange}
            placeholder="Börja skriva en artikel..."
            className="flex-1"
          />
        </div>

        <div className="absolute bottom-16 left-0 right-0 px-4 pb-2">
          {errors.content && (
            <p className="text-sm text-destructive text-center mb-2">{errors.content}</p>
          )}
          <div className="flex items-center justify-between bg-muted/80 backdrop-blur-sm rounded-full px-4 py-2">
            <div className="flex items-center gap-2">
              <Switch
                id="published-mobile"
                checked={article.published}
                onCheckedChange={handlePublishedChange}
                className="scale-90"
              />
              <Label htmlFor="published-mobile" className="text-sm">Publicera direkt</Label>
            </div>
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-1" />
              {isSubmitting ? "..." : "Spara"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title="Skapa ny artikel" description="Skriv och publicera en ny artikel på Samverkan." />
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className={isMobile ? "w-full" : "max-w-3xl mx-auto"}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Skapa ny artikel</h1>
            <Button variant="outline" onClick={() => navigate("/articles/manage")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Avbryt
            </Button>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Titel</Label>
                  <Input
                    id="title"
                    name="title"
                    value={article.title}
                    onChange={handleTitleChange}
                    placeholder="Ange artikelns titel"
                    maxLength={200}
                    aria-invalid={!!errors.title}
                    className={errors.title ? "border-destructive" : ""}
                  />
                  {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                  <p className="text-xs text-muted-foreground">{article.title.length}/200 tecken</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <div className="flex gap-2">
                    <Input
                      id="slug"
                      name="slug"
                      value={article.slug}
                      onChange={handleChange}
                      placeholder="artikel-url-slug"
                      maxLength={100}
                      aria-invalid={!!errors.slug}
                      className={errors.slug ? "border-destructive" : ""}
                    />
                  </div>
                  {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
                  <p className="text-xs text-muted-foreground">
                    Slugen används i artikelns URL. Den genereras automatiskt från titeln, men du kan redigera den vid behov.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="excerpt">Sammanfattning (valfritt)</Label>
                  <Input
                    id="excerpt"
                    name="excerpt"
                    value={article.excerpt || ""}
                    onChange={handleChange}
                    placeholder="Kort sammanfattning av artikeln"
                    maxLength={300}
                    aria-invalid={!!errors.excerpt}
                    className={errors.excerpt ? "border-destructive" : ""}
                  />
                  {errors.excerpt && <p className="text-sm text-destructive">{errors.excerpt}</p>}
                  <p className="text-xs text-muted-foreground">
                    {(article.excerpt || "").length}/300 tecken. En kort sammanfattning som visas i artikellistor.
                  </p>
                </div>

                {/* Cover Image */}
                <div className="space-y-2">
                  <Label>Omslagsbild (valfritt)</Label>
                  <CoverImageUpload value={coverImageUrl} onChange={setCoverImageUrl} />
                  <p className="text-xs text-muted-foreground">
                    Denna bild visas högst upp i din artikel och i förhandsvisningar.
                  </p>
                </div>
                
                {isMobile ? (
                  <div className="space-y-2">
                    <Label>Innehåll</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-32 border-dashed"
                      onClick={() => setIsEditing(true)}
                    >
                      {article.content ? (
                        <span className="text-left line-clamp-3 text-muted-foreground">
                          {article.content.substring(0, 150)}...
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Tryck för att skriva din artikel...</span>
                      )}
                    </Button>
                    {errors.content && <p className="text-sm text-destructive">{errors.content}</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ArticleEditor
                      value={article.content}
                      onChange={handleContentChange}
                      placeholder="Skriv ditt artikelinnehåll här..."
                    />
                    {errors.content && <p className="text-sm text-destructive">{errors.content}</p>}
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Switch id="published" checked={article.published} onCheckedChange={handlePublishedChange} />
                  <Label htmlFor="published">Publicera direkt</Label>
                </div>
                
                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
                    <Save size={16} />
                    {isSubmitting ? "Sparar..." : "Spara artikel"}
                  </Button>
                </div>
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
