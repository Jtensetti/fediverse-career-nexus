import { supabase } from "@/integrations/supabase/client";

export type SavedItemType = "job" | "article" | "post" | "event" | "comment";

export interface SavedItem {
  id: string;
  user_id: string;
  item_type: SavedItemType;
  item_id: string;
  created_at: string;
}

export async function saveItem(itemType: SavedItemType, itemId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("saved_items")
    .insert({
      user_id: user.id,
      item_type: itemType,
      item_id: itemId,
    });

  return !error;
}

export async function unsaveItem(itemType: SavedItemType, itemId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("saved_items")
    .delete()
    .eq("user_id", user.id)
    .eq("item_type", itemType)
    .eq("item_id", itemId);

  return !error;
}

export async function isItemSaved(itemType: SavedItemType, itemId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("saved_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .single();

  return !error && !!data;
}

export async function toggleSaveItem(
  itemType: SavedItemType,
  itemId: string
): Promise<{ saved: boolean; success: boolean }> {
  const isSaved = await isItemSaved(itemType, itemId);

  if (isSaved) {
    const success = await unsaveItem(itemType, itemId);
    return { saved: false, success };
  } else {
    const success = await saveItem(itemType, itemId);
    return { saved: true, success };
  }
}

export async function getSavedItems(itemType?: SavedItemType): Promise<SavedItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("saved_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (itemType) {
    query = query.eq("item_type", itemType);
  }

  const { data, error } = await query;

  if (error) return [];
  return (data as SavedItem[]) || [];
}

export async function getSavedItemCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("saved_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) return 0;
  return count || 0;
}
