import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FeedType = 'following' | 'local' | 'federated';

export interface FeedPreferences {
  id: string;
  user_id: string;
  default_feed: FeedType;
  show_reposts: boolean;
  show_replies: boolean;
  language_filter: string[] | null;
  muted_words: string[];
  created_at: string;
  updated_at: string;
}

export interface CustomFeed {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  rules: FeedRules;
  is_public: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface FeedRules {
  include_tags?: string[];
  exclude_tags?: string[];
  include_keywords?: string[];
  exclude_keywords?: string[];
  include_users?: string[];
  min_engagement?: number;
  language?: string[];
}

const DEFAULT_PREFERENCES: Omit<FeedPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  default_feed: 'following',
  show_reposts: true,
  show_replies: false,
  language_filter: null,
  muted_words: []
};

// Get user's feed preferences
export async function getFeedPreferences(): Promise<FeedPreferences | null> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return null;

    const { data, error } = await supabase
      .from('user_feed_preferences')
      .select('*')
      .eq('user_id', session.session.user.id)
      .maybeSingle();

    if (error) throw error;
    
    // Return data with defaults if not set
    if (data) {
      return {
        ...data,
        default_feed: (data.default_feed as FeedType) || 'following',
        muted_words: data.muted_words || []
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching feed preferences:', error);
    return null;
  }
}

// Update or create feed preferences
export async function updateFeedPreferences(
  preferences: Partial<Omit<FeedPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      toast.error('You must be logged in');
      return false;
    }

    const { error } = await supabase
      .from('user_feed_preferences')
      .upsert({
        user_id: session.session.user.id,
        ...preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating feed preferences:', error);
    toast.error('Failed to save preferences');
    return false;
  }
}

// Get user's custom feeds
export async function getCustomFeeds(): Promise<CustomFeed[]> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return [];

    const { data, error } = await supabase
      .from('custom_feeds')
      .select('*')
      .eq('user_id', session.session.user.id)
      .order('position', { ascending: true });

    if (error) throw error;
    return (data || []).map(feed => ({
      ...feed,
      rules: (typeof feed.rules === 'object' ? feed.rules : {}) as FeedRules
    }));
  } catch (error) {
    console.error('Error fetching custom feeds:', error);
    return [];
  }
}

// Create a custom feed
export async function createCustomFeed(feed: {
  name: string;
  description?: string;
  icon?: string;
  rules: FeedRules;
  is_public?: boolean;
}): Promise<CustomFeed | null> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      toast.error('You must be logged in');
      return null;
    }

    // Get current max position
    const { data: existing } = await supabase
      .from('custom_feeds')
      .select('position')
      .eq('user_id', session.session.user.id)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = existing?.[0]?.position ? existing[0].position + 1 : 0;

    const { data, error } = await supabase
      .from('custom_feeds')
      .insert({
        user_id: session.session.user.id,
        name: feed.name,
        description: feed.description,
        icon: feed.icon || 'filter',
        rules: feed.rules as unknown as Record<string, unknown>,
        is_public: feed.is_public || false,
        position: nextPosition
      })
      .select()
      .single();

    if (error) throw error;
    toast.success('Custom feed created!');
    return {
      ...data,
      rules: (typeof data.rules === 'object' ? data.rules : {}) as FeedRules
    };
  } catch (error) {
    console.error('Error creating custom feed:', error);
    toast.error('Failed to create feed');
    return null;
  }
}

// Update a custom feed
export async function updateCustomFeed(
  feedId: string,
  updates: Partial<Omit<CustomFeed, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
  try {
    const { rules, ...rest } = updates;
    const { error } = await supabase
      .from('custom_feeds')
      .update({
        ...rest,
        ...(rules && { rules: rules as unknown as Record<string, unknown> }),
        updated_at: new Date().toISOString()
      })
      .eq('id', feedId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating custom feed:', error);
    toast.error('Failed to update feed');
    return false;
  }
}

// Delete a custom feed
export async function deleteCustomFeed(feedId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('custom_feeds')
      .delete()
      .eq('id', feedId);

    if (error) throw error;
    toast.success('Feed deleted');
    return true;
  } catch (error) {
    console.error('Error deleting custom feed:', error);
    toast.error('Failed to delete feed');
    return false;
  }
}

// Add a word to muted words
export async function addMutedWord(word: string): Promise<boolean> {
  try {
    const prefs = await getFeedPreferences();
    const currentWords = prefs?.muted_words || [];
    
    if (currentWords.includes(word.toLowerCase())) {
      toast.error('Word is already muted');
      return false;
    }

    return updateFeedPreferences({
      muted_words: [...currentWords, word.toLowerCase()]
    });
  } catch (error) {
    console.error('Error adding muted word:', error);
    return false;
  }
}

// Remove a word from muted words
export async function removeMutedWord(word: string): Promise<boolean> {
  try {
    const prefs = await getFeedPreferences();
    const currentWords = prefs?.muted_words || [];

    return updateFeedPreferences({
      muted_words: currentWords.filter(w => w !== word.toLowerCase())
    });
  } catch (error) {
    console.error('Error removing muted word:', error);
    return false;
  }
}

// Check if content should be hidden based on muted words
export function shouldHideContent(content: string, mutedWords: string[]): boolean {
  if (!mutedWords.length) return false;
  const lowerContent = content.toLowerCase();
  return mutedWords.some(word => lowerContent.includes(word));
}
