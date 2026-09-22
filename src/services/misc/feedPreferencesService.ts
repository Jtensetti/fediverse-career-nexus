import { supabase } from '@/lib/supabase';
import type { Database, Json } from '@/integrations/supabase/types';
import type { FeedRules } from '@/lib/feedRules';
export type { FeedRules } from '@/lib/feedRules';

export type FeedType = 'following' | 'local' | 'federated';
export interface FeedPreferences {
  id: string;
  user_id: string;
  default_feed: string;
  show_reposts: boolean;
  show_replies: boolean;
  infinite_scroll: boolean;
  language_filter: string[] | null;
  muted_words: string[];
  created_at: string | null;
  updated_at: string | null;
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
  created_at: string | null;
  updated_at: string | null;
}
type FeedRow = Database['public']['Tables']['custom_feeds']['Row'];
type FeedInput = { name: string; description?: string; rules: FeedRules };
function toFeed(row: FeedRow): CustomFeed {
  return { ...row, icon: row.icon ?? 'filter', position: row.position ?? 0, is_public: row.is_public ?? false, rules: row.rules as FeedRules };
}
async function currentUserId() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) throw error ?? new Error('Sign in to manage feeds');
  return data.session.user.id;
}
export async function getFeedPreferences(): Promise<FeedPreferences | null> {
  const userId = await currentUserId();
  const { data, error } = await supabase.from('user_feed_preferences').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ? {
    ...data, default_feed: data.default_feed ?? 'following', show_reposts: data.show_reposts ?? true,
    show_replies: data.show_replies ?? false, infinite_scroll: data.infinite_scroll ?? false, muted_words: data.muted_words ?? [],
  } : null;
}
export async function updateFeedPreferences(preferences: Partial<Omit<FeedPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase.from('user_feed_preferences').upsert({
    ...preferences, user_id: userId, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}
export async function getCustomFeeds(): Promise<CustomFeed[]> {
  const userId = await currentUserId();
  const { data, error } = await supabase.from('custom_feeds').select('*').eq('user_id', userId)
    .order('position').order('created_at').order('id');
  if (error) throw error;
  return (data ?? []).map(toFeed);
}
export async function createCustomFeed(feed: FeedInput): Promise<CustomFeed> {
  const userId = await currentUserId();
  const { data: existing, error: positionError } = await supabase.from('custom_feeds').select('position')
    .eq('user_id', userId).order('position', { ascending: false }).limit(1);
  if (positionError) throw positionError;
  const { data, error } = await supabase.from('custom_feeds').insert({
    ...feed, rules: feed.rules as Json, user_id: userId, is_public: false, position: (existing?.[0]?.position ?? -1) + 1,
  }).select().single();
  if (error) throw error;
  return toFeed(data);
}
export async function updateCustomFeed(id: string, feed: FeedInput): Promise<CustomFeed> {
  const userId = await currentUserId();
  const { data, error } = await supabase.from('custom_feeds').update({
    ...feed, rules: feed.rules as Json, updated_at: new Date().toISOString(),
  }).eq('id', id).eq('user_id', userId).select().single();
  if (error) throw error;
  return toFeed(data);
}
export async function deleteCustomFeed(id: string): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase.from('custom_feeds').delete().eq('id', id).eq('user_id', userId).select('id').single();
  if (error) throw error;
}
