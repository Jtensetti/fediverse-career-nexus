import { hasRecordId } from "@/lib/records";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { tx } from "@/i18n/tx";
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
  created_at: string | null;
  updated_at: string | null;
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
  added_at: string | null;
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

function normalizePack(pack: import('@/integrations/supabase/types').Tables<'starter_packs'>): StarterPack {
  return {
    ...pack,
    category: pack.category || '',
    is_featured: pack.is_featured ?? false,
    member_count: pack.member_count ?? 0,
    follower_count: pack.follower_count ?? 0,
  };
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
    return (data || []).map(normalizePack);
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
    return (data || []).map(normalizePack);
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

      const profileMap = new Map((profiles || []).filter(hasRecordId).map(p => [p.id, p]));
      
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
      ...normalizePack(pack),
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
      toast.error(tx("ui.starterPackService.duMasteVaraInloggad"));
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

    toast.success(`Följer ${memberIds.length} personer från detta paket!`);
    return true;
  } catch (error) {
    console.error('Error following starter pack:', error);
    toast.error(tx("ui.starterPackService.kundeInteFoljaPaket"));
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
    toast.success(tx("ui.starterPackService.slutadeFoljaPaket"));
    return true;
  } catch (error) {
    console.error('Error unfollowing pack:', error);
    toast.error(tx("ui.starterPackService.kundeInteSlutaFolja"));
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
      toast.error(tx("ui.starterPackService.duMasteVaraInloggad2"));
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
    toast.success(tx("ui.starterPackService.startpaketSkapat"));
    return normalizePack(pack);
  } catch (error: any) {
    console.error('Error creating starter pack:', error);
    if (error.message?.includes('duplicate')) {
      toast.error(tx("ui.starterPackService.aPackWithThis"));
    } else {
      toast.error(tx("ui.starterPackService.failedToCreatePack"));
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
      toast.error(tx("ui.starterPackService.userIsAlreadyIn"));
    } else {
      toast.error(tx("ui.starterPackService.failedToAddMember"));
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
    toast.error(tx("ui.starterPackService.kundeInteTaBort"));
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
