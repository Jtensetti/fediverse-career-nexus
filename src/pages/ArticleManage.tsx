
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUserArticles, deleteArticle } from "@/services/articleService";
import { Search, Plus, Edit, Trash, BookText, FileText, Filter } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ArticleManage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const { data: articles = [], isLoading } = useQuery({
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
      return matchesSearchQuery && article.published;
    }
    
    // Show all articles that match search query
    return matchesSearchQuery;
  });
  
  const handleDeleteClick = (id: string) => {
    setArticleToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!articleToDelete) return;
    
    const success = await deleteArticle(articleToDelete);
    if (success) {
      queryClient.invalidateQueries({ queryKey: ['user-articles'] });
      setDeleteDialogOpen(false);
      setArticleToDelete(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BookText className="h-6 w-6" />
                My Articles
              </h1>
              <p className="text-gray-600">Manage your articles and drafts</p>
            </div>
            
            <div className="flex gap-4 mt-4 sm:mt-0">
              <Link to="/articles">
                <Button variant="outline">View All Articles</Button>
              </Link>
              <Link to="/articles/create">
                <Button className="flex items-center gap-2">
                  <Plus size={16} />
                  New Article
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="drafts">Drafts</TabsTrigger>
                <TabsTrigger value="published">Published</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">
              <p>Loading articles...</p>
            </div>
          ) : filteredArticles.length > 0 ? (
            <div className="bg-white rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                          <span>{article.title}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {article.published ? (
                          <Badge variant="default" className="bg-green-500">Published</Badge>
                        ) : (
                          <Badge variant="outline">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(article.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/articles/edit/${article.id}`)}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
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
          ) : (
            <div className="text-center py-12 border rounded-md">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No articles found</h2>
              <p className="text-gray-600 mb-6">
                {searchQuery
                  ? "No articles match your search query."
                  : activeTab === "drafts"
                  ? "You haven't created any draft articles yet."
                  : activeTab === "published"
                  ? "You haven't published any articles yet."
                  : "You haven't created any articles yet."}
              </p>
              <Link to="/articles/create">
                <Button className="flex items-center gap-2">
                  <Plus size={16} />
                  Create New Article
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
      
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this article? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
};

export default ArticleManage;
