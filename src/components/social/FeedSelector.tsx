import { useState } from "react";
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
} from "@/services/misc/feedPreferencesService";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CreateCustomFeedDialog from "./CreateCustomFeedDialog";
import ManageCustomFeedsDialog from "./ManageCustomFeedsDialog";

export interface FeedSelectorProps {
  value: FeedType | string;
  onChange: (value: FeedType | string) => void;
  className?: string;
}

export default function FeedSelector({ value, onChange, className }: FeedSelectorProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const { data: customFeeds = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['customFeeds', user?.id], queryFn: getCustomFeeds, enabled: !!user,
  });
  const feedTabs = [
    { id: 'following', label: t('feed.following'), icon: Home, description: t('feed.followingDesc') },
    { id: 'local', label: t('feed.nolto'), icon: Users, description: t('feed.noltoDesc') },
    { id: 'federated', label: t('feed.fediverse'), icon: Globe, description: t('feed.fediverseDesc') },
  ];
  const handleFeedsChanged = async () => {
    const result = await refetch();
    if (!feedTabs.some(tab => tab.id === value) && !result.data?.some(feed => feed.id === value)) onChange('following');
    await queryClient.invalidateQueries({ queryKey: ['federatedFeed'] });
  };

  const selectedFeed = feedTabs.find(tab => tab.id === value);
  const selectedCustomFeed = customFeeds.find(f => f.id === value);

  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>
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
                    aria-label={tab.label}
                    className="gap-1.5 px-2 text-xs sm:px-3 sm:text-sm transition-colors"
                    style={isActive ? {
                      backgroundColor: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
                    } : undefined}
                  >
                    <tab.icon className="hidden h-4 w-4 sm:block" />
                    <span>{tab.label}</span>
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
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                aria-label={selectedCustomFeed?.name || t("feed.feeds")}
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
                  <span className="max-w-24 truncate">{selectedCustomFeed.name}</span>
                ) : (
                  <span>{t("feed.feeds", "Feeds")}</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {isError && <DropdownMenuItem onClick={() => refetch()}>{t('feed.tryAgain')}</DropdownMenuItem>}
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
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                {t("feed.createCustomFeed", "Skapa anpassat flöde")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => setManageOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
                {t("feed.manageFeeds", "Hantera flöden")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <CreateCustomFeedDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSaved={handleFeedsChanged}
          />

          <ManageCustomFeedsDialog
            open={manageOpen}
            onOpenChange={setManageOpen}
            feeds={customFeeds}
            onChanged={handleFeedsChanged}
          />
        </>
      )}
    </div>
  );
}
