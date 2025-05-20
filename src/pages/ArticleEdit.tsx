
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  ArticleFormData, 
  updateArticle, 
  getArticleById, 
  generateSlug, 
  getArticleAuthors, 
  addCoAuthor, 
  removeCoAuthor,
  searchUsers 
} from "@/services/articleService";
import MarkdownEditor from "@/components/MarkdownEditor";
import { toast } from "sonner";
import { ArrowLeft, Save, UserPlus, X, Users, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const ArticleEdit = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [article, setArticle] = useState<ArticleFormData>({
    title: "",
    content: "",
    excerpt: "",
    slug: "",
    published: false,
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
    author => author.is_primary && author.user_id === (window as any).supabase?.auth?.user()?.id
  );

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
        queryClient.invalidateQueries({ queryKey: ['article', id] });
        queryClient.invalidateQueries({ queryKey: ['user-articles'] });
        navigate("/articles/manage");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchUsers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchTerm(query);
    
    if (query.length >= 3) {
      const results = await searchUsers(query);
      // Filter out users who are already authors
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
          
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <Users size={18} />
                  Authors
                </h2>
                <Dialog open={showAddCoAuthorDialog} onOpenChange={setShowAddCoAuthorDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex items-center gap-1"
                      disabled={!isPrimaryAuthor && authors.length > 0}
                    >
                      <UserPlus size={16} />
                      Add Co-Author
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Co-Author</DialogTitle>
                      <DialogDescription>
                        Search for users to add as co-authors to this article.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                      <Input 
                        placeholder="Search users by name or username..." 
                        value={searchTerm}
                        onChange={handleSearchUsers}
                        className="pl-10"
                      />
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto">
                      {searchResults.length > 0 ? (
                        <div className="space-y-2">
                          {searchResults.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={user.avatar_url} />
                                  <AvatarFallback className="bg-primary/10">
                                    {user.fullname ? user.fullname.substring(0, 2).toUpperCase() : 
                                     user.username ? user.username.substring(0, 2).toUpperCase() : '??'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.fullname || user.username || "Unnamed User"}</p>
                                  {user.username && <p className="text-sm text-gray-500">@{user.username}</p>}
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  handleAddCoAuthor(user.id);
                                  setShowAddCoAuthorDialog(false);
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : searchTerm.length >= 3 ? (
                        <p className="text-center py-4 text-gray-500">No users found</p>
                      ) : searchTerm.length > 0 ? (
                        <p className="text-center py-4 text-gray-500">Type at least 3 characters to search</p>
                      ) : (
                        <p className="text-center py-4 text-gray-500">Search for users to add as co-authors</p>
                      )}
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddCoAuthorDialog(false)}>
                        Cancel
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {authorsLoading ? (
                <p className="text-center py-2 text-gray-500">Loading authors...</p>
              ) : authors.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {authors.map((author) => (
                    <div key={author.id} className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={author.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {author.profile?.fullname ? author.profile.fullname.substring(0, 2).toUpperCase() : 
                           author.profile?.username ? author.profile.username.substring(0, 2).toUpperCase() : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {author.profile?.fullname || author.profile?.username || "Unnamed User"}
                      </span>
                      {author.is_primary && (
                        <Badge variant="outline" className="text-xs ml-1">Primary</Badge>
                      )}
                      {!author.is_primary && isPrimaryAuthor && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 ml-1 text-gray-500 hover:text-red-500"
                                onClick={() => handleRemoveCoAuthor(author.user_id)}
                              >
                                <X size={12} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Remove co-author</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-2 text-gray-500">No authors found</p>
              )}
            </CardContent>
          </Card>
          
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
                  <Textarea
                    id="excerpt"
                    name="excerpt"
                    value={article.excerpt || ""}
                    onChange={handleChange}
                    placeholder="Brief summary of the article"
                    rows={3}
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
                  <Label htmlFor="published">{article.published ? "Published" : "Draft"}</Label>
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
