import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, FileText, Calendar, Bookmark } from "lucide-react";
import { getSavedItems, unsaveItem, type SavedItem, type SavedItemType } from "@/services/savedItemsService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function SavedItemsList() {
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
        return <Briefcase className="h-4 w-4" />;
      case "article":
        return <FileText className="h-4 w-4" />;
      case "event":
        return <Calendar className="h-4 w-4" />;
      default:
        return <Bookmark className="h-4 w-4" />;
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
      default:
        return "#";
    }
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bookmark className="h-5 w-5" />
          Saved Items
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SavedItemType | "all")}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All ({savedItems.length})</TabsTrigger>
            <TabsTrigger value="job">
              Jobs ({savedItems.filter((i) => i.item_type === "job").length})
            </TabsTrigger>
            <TabsTrigger value="article">
              Articles ({savedItems.filter((i) => i.item_type === "article").length})
            </TabsTrigger>
            <TabsTrigger value="event">
              Events ({savedItems.filter((i) => i.item_type === "event").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No saved items yet</p>
                <p className="text-sm">Save jobs, articles, and events to view them here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {getItemIcon(item.item_type)}
                      </div>
                      <div>
                        <Link
                          to={getItemLink(item.item_type, item.item_id)}
                          className="font-medium hover:underline text-foreground"
                        >
                          {item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1)} #{item.item_id.slice(0, 8)}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Saved {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnsave(item.item_type, item.item_id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
