import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StarterPack {
  id: string;
  creator_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  cover_image_url: string | null;
  is_featured: boolean;
  member_count: number;
  follower_count: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    username: string | null;
    fullname: string | null;
    avatar_url: string | null;
  };
}

export interface StarterPackMember {
  id: string;
  pack_id: string;
  user_id: string;
  added_at: string;
  user?: {
    id: string;
    username: string | null;
    fullname: string | null;
    avatar_url: string | null;
    headline: string | null;
    is_verified: boolean | null;
  };
}

export interface StarterPackWithMembers extends StarterPack {
  members: StarterPackMember[];
  isFollowed?: boolean;
}

// Get all featured starter packs
export async function getFeaturedStarterPacks(): Promise<StarterPack[]> {
  try {
    const { data, error } = await supabase
      .from('starter_packs')
      .select('*')
      .eq('is_featured', true)
      .order('follower_count', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching featured starter packs:', error);
    return [];
  }
}

// Get all starter packs with optional filters
export async function getStarterPacks(options: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<StarterPack[]> {
  try {
    const { category, search, limit = 20, offset = 0 } = options;
    
    let query = supabase
      .from('starter_packs')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('follower_count', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching starter packs:', error);
    return [];
  }
}

// Get a single starter pack by slug with members
export async function getStarterPackBySlug(slug: string): Promise<StarterPackWithMembers | null> {
  try {
    const { data: pack, error: packError } = await supabase
      .from('starter_packs')
      .select('*')
      .eq('slug', slug)
      .single();

    if (packError) throw packError;
    if (!pack) return null;

    // Get members with their profiles
    const { data: members, error: membersError } = await supabase
      .from('starter_pack_members')
      .select(`
        id,
        pack_id,
        user_id,
        added_at
      `)
      .eq('pack_id', pack.id)
      .order('added_at', { ascending: true });

    if (membersError) throw membersError;

    // Get profile info for each member
    const memberUserIds = (members || []).map(m => m.user_id);
    let membersWithProfiles: StarterPackMember[] = [];

    if (memberUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('id, username, fullname, avatar_url, headline, is_verified')
        .in('id', memberUserIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      
      membersWithProfiles = (members || []).map(m => ({
        ...m,
        user: profileMap.get(m.user_id) || undefined
      }));
    }

    // Check if current user follows this pack
    let isFollowed = false;
    const { data: session } = await supabase.auth.getSession();
    if (session.session?.user) {
      const { data: followData } = await supabase
        .from('user_followed_packs')
        .select('id')
        .eq('user_id', session.session.user.id)
        .eq('pack_id', pack.id)
        .maybeSingle();
      
      isFollowed = !!followData;
    }

    return {
      ...pack,
      members: membersWithProfiles,
      isFollowed
    };
  } catch (error) {
    console.error('Error fetching starter pack:', error);
    return null;
  }
}

// Follow a starter pack (follows all members)
export async function followStarterPack(packId: string): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      toast.error('You must be logged in to follow a pack');
      return false;
    }

    const userId = session.session.user.id;

    // Record that user followed this pack
    const { error: followError } = await supabase
      .from('user_followed_packs')
      .insert({ user_id: userId, pack_id: packId });

    if (followError && !followError.message.includes('duplicate')) {
      throw followError;
    }

    // Get all members of the pack
    const { data: members, error: membersError } = await supabase
      .from('starter_pack_members')
      .select('user_id')
      .eq('pack_id', packId);

    if (membersError) throw membersError;

    // Follow each member (using author_follows table)
    const memberIds = (members || [])
      .map(m => m.user_id)
      .filter(id => id !== userId); // Don't follow yourself

    if (memberIds.length > 0) {
      const followRecords = memberIds.map(authorId => ({
        follower_id: userId,
        author_id: authorId
      }));

      // Insert follows, ignoring duplicates
      await supabase
        .from('author_follows')
        .upsert(followRecords, { onConflict: 'follower_id,author_id', ignoreDuplicates: true });
    }

    toast.success(`Following ${memberIds.length} people from this pack!`);
    return true;
  } catch (error) {
    console.error('Error following starter pack:', error);
    toast.error('Failed to follow pack');
    return false;
  }
}

// Unfollow a starter pack
export async function unfollowStarterPack(packId: string): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      return false;
    }

    const { error } = await supabase
      .from('user_followed_packs')
      .delete()
      .eq('user_id', session.session.user.id)
      .eq('pack_id', packId);

    if (error) throw error;
    toast.success('Unfollowed pack');
    return true;
  } catch (error) {
    console.error('Error unfollowing pack:', error);
    toast.error('Failed to unfollow pack');
    return false;
  }
}

// Get packs the current user has followed
export async function getUserFollowedPacks(): Promise<string[]> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return [];

    const { data, error } = await supabase
      .from('user_followed_packs')
      .select('pack_id')
      .eq('user_id', session.session.user.id);

    if (error) throw error;
    return (data || []).map(d => d.pack_id);
  } catch (error) {
    console.error('Error fetching followed packs:', error);
    return [];
  }
}

// Create a new starter pack
export async function createStarterPack(data: {
  name: string;
  slug: string;
  description?: string;
  category?: string;
  cover_image_url?: string;
}): Promise<StarterPack | null> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      toast.error('You must be logged in to create a pack');
      return null;
    }

    const { data: pack, error } = await supabase
      .from('starter_packs')
      .insert({
        ...data,
        creator_id: session.session.user.id
      })
      .select()
      .single();

    if (error) throw error;
    toast.success('Starter pack created!');
    return pack;
  } catch (error: any) {
    console.error('Error creating starter pack:', error);
    if (error.message?.includes('duplicate')) {
      toast.error('A pack with this URL already exists');
    } else {
      toast.error('Failed to create pack');
    }
    return null;
  }
}

// Add a member to a starter pack
export async function addPackMember(packId: string, userId: string): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    const { error } = await supabase
      .from('starter_pack_members')
      .insert({
        pack_id: packId,
        user_id: userId,
        added_by: session.session?.user?.id
      });

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error('Error adding pack member:', error);
    if (error.message?.includes('duplicate')) {
      toast.error('User is already in this pack');
    } else {
      toast.error('Failed to add member');
    }
    return false;
  }
}

// Remove a member from a starter pack
export async function removePackMember(packId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('starter_pack_members')
      .delete()
      .eq('pack_id', packId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing pack member:', error);
    toast.error('Failed to remove member');
    return false;
  }
}

// Get pack categories
export function getPackCategories() {
  return [
    { value: 'community', label: 'Community' },
    { value: 'industry', label: 'Industry' },
    { value: 'topic', label: 'Topic' },
    { value: 'region', label: 'Region' }
  ];
}
