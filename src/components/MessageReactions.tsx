import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getReactions, toggleReaction, ReactionCount } from '@/services/reactionsService';
import { REACTIONS, REACTION_EMOJIS, ReactionKey } from '@/lib/reactions';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface MessageReactionsProps {
  messageId: string;
  isOwnMessage: boolean;
  className?: string;
}

export default function MessageReactions({ messageId, isOwnMessage, className }: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const queryClient = useQueryClient();

  const { data: reactions = [] } = useQuery<ReactionCount[]>({
    queryKey: ['messageReactions', messageId],
    queryFn: () => getReactions('message', messageId),
    staleTime: 30000,
  });

const toggleMutation = useMutation({
    mutationFn: (reaction: ReactionKey) => toggleReaction('message', messageId, reaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageReactions', messageId] });
    },
    onError: (error) => {
      console.error('Failed to toggle message reaction:', error);
    },
  });

  const activeReactions = reactions.filter(r => r.count > 0);
  const hasReactions = activeReactions.length > 0;

  const handleReact = (reaction: ReactionKey) => {
    toggleMutation.mutate(reaction);
    setShowPicker(false);
  };

  return (
    <div className={cn(
      "flex items-center gap-1 mt-1",
      isOwnMessage ? "justify-end" : "justify-start",
      className
    )}>
      {/* Display active reactions */}
      <AnimatePresence>
        {activeReactions.map((reaction) => (
          <motion.button
            key={reaction.reaction}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleReact(reaction.reaction)}
            className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors",
              reaction.hasReacted
                ? "bg-primary/20 text-primary"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            <span>{REACTION_EMOJIS[reaction.reaction]}</span>
            {reaction.count > 1 && <span>{reaction.count}</span>}
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Reaction picker trigger - more visible */}
      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "p-1.5 rounded-full transition-all",
              "opacity-0 group-hover:opacity-100",
              "border border-transparent hover:border-border",
              "hover:bg-muted text-muted-foreground hover:text-foreground",
              hasReactions && "opacity-100 text-primary border-primary/30"
            )}
            aria-label="Add reaction"
            title="React to this message"
          >
            <Smile className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-2" 
          side={isOwnMessage ? "left" : "right"}
          align="center"
        >
          <div className="flex gap-1">
            {REACTIONS.map((reaction) => (
              <button
                key={reaction}
                onClick={() => handleReact(reaction)}
                className={cn(
                  "p-1.5 rounded hover:bg-muted transition-colors text-lg",
                  reactions.find(r => r.reaction === reaction)?.hasReacted && "bg-primary/20"
                )}
              >
                {REACTION_EMOJIS[reaction]}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
