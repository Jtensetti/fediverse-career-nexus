
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ArticleReaction {
  id: string;
  article_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionCount {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

// Get all reactions for an article
export const getArticleReactions = async (articleId: string): Promise<ReactionCount[]> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    // Get all reactions for this article
    const { data: reactions, error } = await supabase
      .from('article_reactions')
      .select('*')
      .eq('article_id', articleId);
    
    if (error) {
      console.error('Error fetching article reactions:', error);
      return [];
    }
    
    // Default emojis we support
    const supportedEmojis = ['❤️', '🎉', '✌️', '🤗', '😮'];
    
    // Process the reactions to count each emoji type
    const reactionCounts: ReactionCount[] = supportedEmojis.map(emoji => {
      const filteredReactions = reactions?.filter(r => r.emoji === emoji) || [];
      const hasReacted = filteredReactions.some(r => r.user_id === userId);
      
      return {
        emoji,
        count: filteredReactions.length,
        hasReacted
      };
    });
    
    return reactionCounts;
  } catch (error) {
    console.error('Error getting article reactions:', error);
    return [];
  }
};

// Toggle a reaction (add if not exists, remove if exists)
export const toggleReaction = async (articleId: string, emoji: string): Promise<boolean> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('You must be logged in to react to an article');
      return false;
    }
    
    // Check if the user has already reacted with this emoji
    const { data: existingReaction } = await supabase
      .from('article_reactions')
      .select('*')
      .eq('article_id', articleId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .single();
    
    if (existingReaction) {
      // Remove the reaction
      const { error } = await supabase
        .from('article_reactions')
        .delete()
        .eq('id', existingReaction.id);
      
      if (error) {
        toast.error(`Error removing reaction: ${error.message}`);
        return false;
      }
      
      return true;
    } else {
      // Add the reaction
      const { error } = await supabase
        .from('article_reactions')
        .insert({
          article_id: articleId,
          user_id: user.id,
          emoji
        });
      
      if (error) {
        toast.error(`Error adding reaction: ${error.message}`);
        return false;
      }
      
      return true;
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    toast.error('Failed to process your reaction. Please try again.');
    return false;
  }
};
