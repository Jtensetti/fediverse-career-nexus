import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Bookmark, 
  Briefcase, 
  FileText, 
  Calendar, 
  MessageSquare,
  Loader2,
  ArrowLeft,
  ExternalLink
} from "lucide-react";
import { getSavedItems, unsaveItem, type SavedItem, type SavedItemType } from "@/services/savedItemsService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function SavedItemsPage() {
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SavedItemType | "all">("all");

  useEffect(() => {
    if (user) {
      loadSavedItems();
    }
  }, [user]);

  const loadSavedItems = async () => {
    setLoading(true);
    const items = await getSavedItems();
    setSavedItems(items);
    setLoading(false);
  };

  const handleUnsave = async (itemType: SavedItemType, itemId: string) => {
    const success = await unsaveItem(itemType, itemId);
    if (success) {
      setSavedItems((prev) =>
        prev.filter((item) => !(item.item_type === itemType && item.item_id === itemId))
      );
      toast.success("Item removed from saved");
    } else {
      toast.error("Failed to remove item");
    }
  };

  const filteredItems =
    activeTab === "all"
      ? savedItems
      : savedItems.filter((item) => item.item_type === activeTab);

  const getItemIcon = (type: SavedItemType) => {
    switch (type) {
      case "job":
        return <Briefcase className="h-5 w-5" />;
      case "article":
        return <FileText className="h-5 w-5" />;
      case "event":
        return <Calendar className="h-5 w-5" />;
      case "post":
        return <MessageSquare className="h-5 w-5" />;
      case "comment":
        return <MessageSquare className="h-5 w-5" />;
      default:
        return <Bookmark className="h-5 w-5" />;
    }
  };

  const getItemLink = (type: SavedItemType, id: string) => {
    switch (type) {
      case "job":
        return `/jobs/${id}`;
      case "article":
        return `/articles/${id}`;
      case "event":
        return `/events/${id}`;
      case "post":
        return `/post/${id}`;
      case "comment":
        // For comments, we need to navigate to the post view
        // The comment will be visible in the post's replies
        // Note: Currently links to post ID which may not be correct
        // A future improvement would be to store the post_id alongside comment_id
        return `/post/${id}`;
      default:
        return "#";
    }
  };

  const getItemLabel = (type: SavedItemType) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getItemColor = (type: SavedItemType) => {
    switch (type) {
      case "job":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "article":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "event":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "post":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "comment":
        return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getCounts = () => ({
    all: savedItems.length,
    job: savedItems.filter((i) => i.item_type === "job").length,
    article: savedItems.filter((i) => i.item_type === "article").length,
    event: savedItems.filter((i) => i.item_type === "event").length,
    post: savedItems.filter((i) => i.item_type === "post").length,
    comment: savedItems.filter((i) => i.item_type === "comment").length,
  });

  const counts = getCounts();

  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bookmark className="h-6 w-6 text-primary" />
              Saved Items
            </h1>
            <p className="text-muted-foreground">
              Your bookmarked jobs, articles, events, posts, and comments
            </p>
          </div>
        </div>

        <Card variant="elevated">
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SavedItemType | "all")}>
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-6">
                <TabsList className="flex w-max md:w-auto h-auto gap-1 bg-muted/50 p-1 rounded-lg">
                  <TabsTrigger 
                    value="all" 
                    className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap"
                  >
                    All ({counts.all})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="post"
                    className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap"
                  >
                    Posts ({counts.post})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="article"
                    className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap"
                  >
                    Articles ({counts.article})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="job"
                    className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap"
                  >
                    Jobs ({counts.job})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="event"
                    className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap"
                  >
                    Events ({counts.event})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="comment"
                    className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm whitespace-nowrap"
                  >
                    Comments ({counts.comment})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={activeTab} className="mt-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredItems.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12"
                  >
                    <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="font-semibold text-lg mb-2">No saved items yet</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      {activeTab === "all" 
                        ? "Save jobs, articles, events, posts, and comments to view them here later"
                        : `You haven't saved any ${activeTab}s yet. Look for the bookmark icon to save items.`
                      }
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                      <Button variant="outline" asChild>
                        <Link to="/feed">Browse Feed</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link to="/jobs">Browse Jobs</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link to="/articles">Browse Articles</Link>
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {filteredItems.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/20 transition-all"
                      >
                        <Link 
                          to={getItemLink(item.item_type, item.item_id)}
                          className="flex items-center gap-4 flex-1 min-w-0"
                        >
                          <div className={`p-2.5 rounded-lg ${getItemColor(item.item_type)}`}>
                            {getItemIcon(item.item_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">
                                {getItemLabel(item.item_type)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Saved {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">
                              View {getItemLabel(item.item_type).toLowerCase()}
                              <ExternalLink className="inline-block h-3 w-3 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                          </div>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleUnsave(item.item_type, item.item_id)}
                        >
                          Remove
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
