import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArticleFormData, createArticle, generateSlug } from "@/services/articleService";
import MarkdownEditor from "@/components/MarkdownEditor";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Validation schema
const articleSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be less than 200 characters"),
  content: z
    .string()
    .min(50, "Content must be at least 50 characters"),
  excerpt: z
    .string()
    .max(300, "Excerpt must be less than 300 characters")
    .optional()
    .or(z.literal("")),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(100, "Slug must be less than 100 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  published: z.boolean().default(false),
});

type ValidationErrors = Partial<Record<keyof ArticleFormData, string>>;

const ArticleCreate = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
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
    setArticle({
      ...article,
      title,
      slug,
    });
    validateField("title", title);
    if (slug) validateField("slug", slug);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setArticle({
      ...article,
      [name]: value,
    });
    validateField(name as keyof ArticleFormData, value);
  };

  const handleContentChange = (content: string) => {
    setArticle({
      ...article,
      content,
    });
    validateField("content", content);
  };

  const handlePublishedChange = (checked: boolean) => {
    setArticle({
      ...article,
      published: checked,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate entire form
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
      toast.error("Please fix the validation errors before submitting");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const articleResult = await createArticle(article);
      if (articleResult) {
        toast.success("Article created successfully!");
        navigate("/articles/manage");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Create New Article</h1>
            <Button
              variant="outline"
              onClick={() => navigate("/articles/manage")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={article.title}
                    onChange={handleTitleChange}
                    placeholder="Enter article title"
                    maxLength={200}
                    aria-invalid={!!errors.title}
                    className={errors.title ? "border-destructive" : ""}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {article.title.length}/200 characters
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <div className="flex gap-2">
                    <Input
                      id="slug"
                      name="slug"
                      value={article.slug}
                      onChange={handleChange}
                      placeholder="article-url-slug"
                      maxLength={100}
                      aria-invalid={!!errors.slug}
                      className={errors.slug ? "border-destructive" : ""}
                    />
                  </div>
                  {errors.slug && (
                    <p className="text-sm text-destructive">{errors.slug}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    The slug is used in the article's URL. It's automatically generated from the title,
                    but you can edit it if needed.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt (Optional)</Label>
                  <Input
                    id="excerpt"
                    name="excerpt"
                    value={article.excerpt || ""}
                    onChange={handleChange}
                    placeholder="Brief summary of the article"
                    maxLength={300}
                    aria-invalid={!!errors.excerpt}
                    className={errors.excerpt ? "border-destructive" : ""}
                  />
                  {errors.excerpt && (
                    <p className="text-sm text-destructive">{errors.excerpt}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {(article.excerpt || "").length}/300 characters. A short summary that appears in article listings.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <MarkdownEditor
                    value={article.content}
                    onChange={handleContentChange}
                    placeholder="Write your article content here..."
                  />
                  {errors.content && (
                    <p className="text-sm text-destructive">{errors.content}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Minimum 50 characters required
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="published"
                    checked={article.published}
                    onCheckedChange={handlePublishedChange}
                  />
                  <Label htmlFor="published">Publish immediately</Label>
                </div>
                
                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <Save size={16} />
                    {isSubmitting ? "Saving..." : "Save Article"}
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
