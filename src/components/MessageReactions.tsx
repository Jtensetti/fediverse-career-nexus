import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getReactions, toggleMessageReaction, ReactionCount } from '@/services/reactionsService';
import { REACTIONS, REACTION_CONFIG, ReactionKey } from '@/lib/reactions';
import { supabase } from '@/integrations/supabase/client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

interface MessageReactionsProps {
  messageId: string;
  isOwnMessage: boolean;
  recipientId?: string;
  senderId?: string;
  className?: string;
}

export default function MessageReactions({ 
  messageId, 
  isOwnMessage, 
  recipientId,
  senderId,
  className 
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const queryClient = useQueryClient();

  const { data: reactions = [] } = useQuery<ReactionCount[]>({
    queryKey: ['messageReactions', messageId],
    queryFn: () => getReactions('message', messageId),
    staleTime: 30000,
  });

  // Subscribe to real-time reaction updates for this message
  useEffect(() => {
    const channel = supabase
      .channel(`message-reactions-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `target_id=eq.${messageId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messageReactions', messageId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, queryClient]);

  const toggleMutation = useMutation({
    mutationFn: async (reaction: ReactionKey) => {
      return await toggleMessageReaction(messageId, reaction, {
        recipientId,
        senderId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageReactions', messageId] });
    },
    onError: (error) => {
      console.error('Failed to toggle message reaction:', error);
    },
  });

  const activeReactions = reactions.filter(r => r.count > 0);
  const hasReactions = activeReactions.length > 0;
  const userReaction = reactions.find(r => r.hasReacted);
  const totalCount = activeReactions.reduce((sum, r) => sum + r.count, 0);

  const handleReact = (reaction: ReactionKey) => {
    toggleMutation.mutate(reaction);
    setShowPicker(false);
  };

  // Background colors for stacked icons
  const bgColors: Record<ReactionKey, string> = {
    love: 'bg-red-100 dark:bg-red-950',
    celebrate: 'bg-amber-100 dark:bg-amber-950',
    support: 'bg-blue-100 dark:bg-blue-950',
    empathy: 'bg-green-100 dark:bg-green-950',
    insightful: 'bg-purple-100 dark:bg-purple-950',
  };

  // Render stacked reaction icons (max 3)
  const renderStackedReactions = () => {
    const topReactions = activeReactions
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    if (topReactions.length === 0) return null;

    return (
      <div className="flex items-center">
        <div className="flex -space-x-1">
          {topReactions.map((reaction, index) => {
            const config = REACTION_CONFIG[reaction.reaction];
            const Icon = config.icon;
            return (
              <div
                key={reaction.reaction}
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center ring-1 ring-background",
                  bgColors[reaction.reaction]
                )}
                style={{ zIndex: topReactions.length - index }}
              >
                <Icon className={cn("h-3 w-3", config.activeColor)} />
              </div>
            );
          })}
        </div>
        {totalCount > 0 && (
          <span className="ml-1 text-xs text-muted-foreground">{totalCount}</span>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      "flex items-center gap-1.5 mt-1",
      isOwnMessage ? "justify-end" : "justify-start",
      className
    )}>
      {/* Display stacked reactions */}
      <AnimatePresence>
        {hasReactions && (
          <Popover open={showPicker && !isOwnMessage} onOpenChange={(open) => !isOwnMessage && setShowPicker(open)}>
            <PopoverTrigger asChild>
              <motion.button
                type="button"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isOwnMessage) setShowPicker(true);
                }}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full transition-colors",
                  userReaction
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-muted/50 hover:bg-muted border border-transparent",
                  !isOwnMessage && "cursor-pointer"
                )}
              >
                {renderStackedReactions()}
              </motion.button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-2" 
              side="top"
              align="center"
            >
              <div className="flex gap-1">
                {REACTIONS.map((reaction) => {
                  const config = REACTION_CONFIG[reaction];
                  const Icon = config.icon;
                  const isActive = reactions.find(r => r.reaction === reaction)?.hasReacted;

                  return (
                    <TooltipProvider key={reaction}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleReact(reaction);
                            }}
                            className={cn(
                              "h-8 w-8 p-0 rounded-full transition-all",
                              config.hoverBg,
                              isActive && config.activeColor
                            )}
                          >
                            <Icon className={cn("h-4 w-4", isActive && "fill-current")} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>{config.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </AnimatePresence>

      {/* Show reaction picker trigger for OTHER people's messages */}
      {!isOwnMessage && !hasReactions && (
        <Popover open={showPicker} onOpenChange={setShowPicker}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "p-1.5 rounded-full transition-all",
                "hover:bg-muted text-muted-foreground hover:text-foreground",
                "opacity-60 hover:opacity-100"
              )}
              aria-label="Add reaction"
              title="React to this message"
            >
              <Heart className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-auto p-2" 
            side="top"
            align="center"
          >
            <div className="flex gap-1">
              {REACTIONS.map((reaction) => {
                const config = REACTION_CONFIG[reaction];
                const Icon = config.icon;

                return (
                  <TooltipProvider key={reaction}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleReact(reaction);
                          }}
                          className={cn(
                            "h-8 w-8 p-0 rounded-full transition-all",
                            config.hoverBg
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{config.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
