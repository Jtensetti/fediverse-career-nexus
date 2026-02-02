import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  getCustomFeeds, 
  type FeedType, 
  type CustomFeed 
} from "@/services/feedPreferencesService";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeedSelectorProps {
  value: FeedType | string;
  onChange: (value: FeedType | string) => void;
  className?: string;
}

export default function FeedSelector({ value, onChange, className }: FeedSelectorProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [customFeeds, setCustomFeeds] = useState<CustomFeed[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is federated (signed in via Fediverse)
  const { data: profile } = useQuery({
    queryKey: ['userAuthType', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('auth_type')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: Infinity,
  });

  const isFederatedUser = profile?.auth_type === 'federated';

  // Build feed tabs - only show federated tab to federated users
  const feedTabs = [
    { id: 'following', label: t("feed.following", "Following"), icon: Home, description: t("feed.followingDesc", "Posts from people you follow") },
    { id: 'local', label: t("feed.nolto", "Nolto"), icon: Users, description: t("feed.noltoDesc", "All posts on Nolto") },
    ...(isFederatedUser ? [{ id: 'federated' as const, label: t("feed.fediverse", "Fediverse"), icon: Globe, description: t("feed.fediverseDesc", "Local + remote follows") }] : []),
  ];

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

  const selectedFeed = feedTabs.find(tab => tab.id === value);
  const selectedCustomFeed = customFeeds.find(f => f.id === value);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Main feed tabs */}
      <Tabs value={selectedFeed ? value : 'custom'} onValueChange={(v) => v !== 'custom' && onChange(v as FeedType)}>
        <TabsList className="h-9 p-1 bg-muted/50">
          {feedTabs.map((tab) => {
            const isActive = value === tab.id;
            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <TabsTrigger 
                    value={tab.id}
                    className="gap-1.5 px-3 transition-colors"
                    style={isActive ? {
                      backgroundColor: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
                    } : undefined}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {tab.description}
                </TooltipContent>
              </Tooltip>
            );
          })}
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
                <span className="hidden sm:inline">{t("feed.feeds", "Feeds")}</span>
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
                {t("feed.createCustomFeed", "Create custom feed")}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2 cursor-pointer">
              <a href="/settings/feeds">
                <Settings2 className="h-4 w-4" />
                {t("feed.manageFeeds", "Manage feeds")}
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}