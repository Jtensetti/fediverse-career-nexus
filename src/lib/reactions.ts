import { Heart, PartyPopper, ThumbsUp, Smile, Lightbulb, LucideIcon } from "lucide-react";

// Canonical reaction keys used throughout the app
export const REACTIONS = ['love', 'celebrate', 'support', 'empathy', 'insightful'] as const;
export type ReactionKey = typeof REACTIONS[number];

export interface ReactionConfigItem {
  icon: LucideIcon;
  label: string;
  activeColor: string;
  hoverBg: string;
}

// Shared reaction configuration for consistent UI across posts, comments, and articles
export const REACTION_CONFIG: Record<ReactionKey, ReactionConfigItem> = {
  love: {
    icon: Heart,
    label: "Love",
    activeColor: "text-red-500",
    hoverBg: "hover:bg-red-50 dark:hover:bg-red-950/30",
  },
  celebrate: {
    icon: PartyPopper,
    label: "Celebrate",
    activeColor: "text-amber-500",
    hoverBg: "hover:bg-amber-50 dark:hover:bg-amber-950/30",
  },
  support: {
    icon: ThumbsUp,
    label: "Support",
    activeColor: "text-blue-500",
    hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-950/30",
  },
  empathy: {
    icon: Smile,
    label: "Empathy",
    activeColor: "text-green-500",
    hoverBg: "hover:bg-green-50 dark:hover:bg-green-950/30",
  },
  insightful: {
    icon: Lightbulb,
    label: "Insightful",
    activeColor: "text-purple-500",
    hoverBg: "hover:bg-purple-50 dark:hover:bg-purple-950/30",
  },
};

// Emoji display for reactions
export const REACTION_EMOJIS: Record<ReactionKey, string> = {
  love: '❤️',
  celebrate: '🎉',
  support: '👍',
  empathy: '🤗',
  insightful: '💡',
};

// Legacy emoji to reaction key mapping (for backfill/migration)
export const EMOJI_TO_REACTION: Record<string, ReactionKey> = {
  '❤️': 'love',
  '🎉': 'celebrate',
  '👍': 'support',
  '✌️': 'support',
  '🤗': 'empathy',
  '😮': 'insightful',
  '💡': 'insightful',
};

// Get reaction key from emoji (with fallback)
export function getReactionKeyFromEmoji(emoji: string): ReactionKey {
  return EMOJI_TO_REACTION[emoji] || 'love';
}

// Get icon config for stacked display
export function getReactionIcon(reaction: ReactionKey): ReactionConfigItem {
  return REACTION_CONFIG[reaction] || REACTION_CONFIG.love;
}
