import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Reaction {
  emoji: string;
  label: string;
  count: number;
  hasReacted: boolean;
}

interface EnhancedReactionsProps {
  reactions: Reaction[];
  onReact: (emoji: string) => void;
  compact?: boolean;
}

const defaultReactions: Omit<Reaction, "count" | "hasReacted">[] = [
  { emoji: "❤️", label: "Love" },
  { emoji: "👏", label: "Celebrate" },
  { emoji: "🤔", label: "Insightful" },
  { emoji: "💡", label: "Idea" },
  { emoji: "🔥", label: "Fire" },
];

export function EnhancedReactions({
  reactions,
  onReact,
  compact = false,
}: EnhancedReactionsProps) {
  const [showAll, setShowAll] = useState(false);

  // Merge default reactions with provided reactions
  const mergedReactions = defaultReactions.map((defaultReaction) => {
    const existing = reactions.find((r) => r.emoji === defaultReaction.emoji);
    return {
      ...defaultReaction,
      count: existing?.count || 0,
      hasReacted: existing?.hasReacted || false,
    };
  });

  // Filter to only show reactions with counts or all if expanded
  const visibleReactions = showAll
    ? mergedReactions
    : mergedReactions.filter((r) => r.count > 0 || r.hasReacted);

  // If no reactions yet, show the reaction picker
  const showPicker = visibleReactions.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-1">
      <AnimatePresence mode="popLayout">
        {(showPicker || showAll ? mergedReactions : visibleReactions).map(
          (reaction) => (
            <motion.div
              key={reaction.emoji}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <Button
                variant="ghost"
                size={compact ? "sm" : "default"}
                className={cn(
                  "h-8 px-2 gap-1 transition-all",
                  reaction.hasReacted &&
                    "bg-primary/10 border border-primary/20",
                  !compact && "hover:scale-110"
                )}
                onClick={() => onReact(reaction.emoji)}
                title={reaction.label}
              >
                <motion.span
                  className="text-lg"
                  whileTap={{ scale: 1.4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  {reaction.emoji}
                </motion.span>
                {reaction.count > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {reaction.count}
                  </span>
                )}
              </Button>
            </motion.div>
          )
        )}
      </AnimatePresence>

      {!showPicker && visibleReactions.length < mergedReactions.length && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "−" : "+"}
        </Button>
      )}
    </div>
  );
}

export default EnhancedReactions;
