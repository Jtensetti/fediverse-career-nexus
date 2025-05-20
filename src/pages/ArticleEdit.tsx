
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArticleFormData, updateArticle, getArticleById, generateSlug } from "@/services/articleService";
import MarkdownEditor from "@/components/MarkdownEditor";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

const ArticleEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [article, setArticle] = useState<ArticleFormData>({
    title: "",
    content: "",
    excerpt: "",
    slug: "",
    published: false,
  });

  const { data: originalArticle, isLoading } = useQuery({
    queryKey: ['article', id],
    queryFn: () => getArticleById(id || ''),
    enabled: !!id,
  });

  useEffect(() => {
    if (originalArticle) {
      setArticle({
        title: originalArticle.title,
        content: originalArticle.content,
        excerpt: originalArticle.excerpt || "",
        slug: originalArticle.slug,
        published: originalArticle.published,
      });
    }
  }, [originalArticle]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    // Only auto-update slug if it's empty or matches the original generated slug
    const shouldUpdateSlug = !article.slug || article.slug === generateSlug(originalArticle?.title || '');
    
    setArticle({
      ...article,
      title,
      slug: shouldUpdateSlug ? generateSlug(title) : article.slug,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setArticle({
      ...article,
      [name]: value,
    });
  };

  const handleContentChange = (content: string) => {
    setArticle({
      ...article,
      content,
    });
  };

  const handlePublishedChange = (checked: boolean) => {
    setArticle({
      ...article,
      published: checked,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) {
      toast.error("Article ID is missing");
      return;
    }
    
    if (!article.title) {
      toast.error("Please enter a title for your article");
      return;
    }
    
    if (!article.content) {
      toast.error("Please enter content for your article");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await updateArticle(id, article);
      if (result) {
        toast.success("Article updated successfully!");
        navigate("/articles/manage");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p>Loading article...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!originalArticle) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Article not found</h2>
            <p className="mb-6">The article you're trying to edit doesn't exist or you don't have permission to edit it.</p>
            <Button onClick={() => navigate("/articles/manage")}>
              Back to My Articles
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Edit Article</h1>
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
                    required
                  />
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
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    The slug is used in the article's URL.
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
                  />
                  <p className="text-xs text-gray-500">
                    A short summary that appears in article listings. If not provided, the beginning of the content will be used.
                  </p>
                </div>
                
                <MarkdownEditor
                  value={article.content}
                  onChange={handleContentChange}
                  placeholder="Write your article content here..."
                />
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="published"
                    checked={article.published}
                    onCheckedChange={handlePublishedChange}
                  />
                  <Label htmlFor="published">{article.published ? "Published" : "Unpublished"}</Label>
                </div>
                
                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <Save size={16} />
                    {isSubmitting ? "Saving..." : "Update Article"}
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

export default ArticleEdit;
