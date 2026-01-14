import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Users, Globe, Filter, Settings2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getFeedPreferences, 
  getCustomFeeds, 
  type FeedType, 
  type CustomFeed 
} from "@/services/feedPreferencesService";
import { cn } from "@/lib/utils";

export interface FeedSelectorProps {
  value: FeedType | string;
  onChange: (value: FeedType | string) => void;
  className?: string;
}

const feedTabs = [
  { id: 'following', label: 'Following', icon: Home, description: 'Posts from people you follow' },
  { id: 'local', label: 'Local', icon: Users, description: 'Posts from this instance' },
  { id: 'federated', label: 'Federated', icon: Globe, description: 'All posts including remote' },
] as const;

export default function FeedSelector({ value, onChange, className }: FeedSelectorProps) {
  const { user } = useAuth();
  const [customFeeds, setCustomFeeds] = useState<CustomFeed[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadCustomFeeds();
    }
  }, [user]);

  const loadCustomFeeds = async () => {
    setIsLoading(true);
    const feeds = await getCustomFeeds();
    setCustomFeeds(feeds);
    setIsLoading(false);
  };

  const selectedFeed = feedTabs.find(t => t.id === value);
  const selectedCustomFeed = customFeeds.find(f => f.id === value);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Main feed tabs */}
      <Tabs value={selectedFeed ? value : 'custom'} onValueChange={(v) => v !== 'custom' && onChange(v as FeedType)}>
        <TabsList className="h-9 p-1 bg-muted/50">
          {feedTabs.map((tab) => (
            <Tooltip key={tab.id}>
              <TooltipTrigger asChild>
                <TabsTrigger 
                  value={tab.id}
                  className="gap-1.5 px-3 data-[state=active]:bg-background"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {tab.description}
              </TooltipContent>
            </Tooltip>
          ))}
        </TabsList>
      </Tabs>

      {/* Custom feeds dropdown */}
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={selectedCustomFeed ? "secondary" : "ghost"} 
              size="sm"
              className={cn(
                "gap-1.5",
                selectedCustomFeed && "bg-primary/10 text-primary hover:bg-primary/20"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Filter className="h-4 w-4" />
              )}
              {selectedCustomFeed ? (
                <span className="hidden sm:inline max-w-24 truncate">{selectedCustomFeed.name}</span>
              ) : (
                <span className="hidden sm:inline">Feeds</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {customFeeds.length > 0 ? (
              <>
                {customFeeds.map((feed) => (
                  <DropdownMenuItem
                    key={feed.id}
                    onClick={() => onChange(feed.id)}
                    className={cn(
                      "gap-2 cursor-pointer",
                      value === feed.id && "bg-accent"
                    )}
                  >
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{feed.name}</p>
                      {feed.description && (
                        <p className="text-xs text-muted-foreground truncate">{feed.description}</p>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem asChild className="gap-2 cursor-pointer">
              <a href="/settings/feeds">
                <Plus className="h-4 w-4" />
                Create custom feed
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2 cursor-pointer">
              <a href="/settings/feeds">
                <Settings2 className="h-4 w-4" />
                Manage feeds
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
