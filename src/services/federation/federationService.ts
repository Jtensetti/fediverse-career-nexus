import { supabase } from "@/lib/supabase";

export interface FederatedPost {
  id: string;
  content: any;
  created_at: string;
  actor_name?: string;
  actor_avatar?: string;
  type?: string;
  source?: "local" | "remote";
  profile?: {
    username?: string;
    fullname?: string;
    avatar_url?: string;
    home_instance?: string;
    is_freelancer?: boolean;
  };
  actor?: {
    name?: string;
    preferredUsername?: string;
    icon?: {
      url?: string;
    };
  };
  user_id?: string;
  published_at?: string;
  instance?: string;
  moderation_status?: "normal" | "probation" | "blocked";
  content_warning?: string;
  remote_url?: string;
  is_boost?: boolean;
  company?: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
}

export type FeedType = "following" | "local" | "federated";

export const getFederatedFeed = async (
  limit: number = 20,
  offset: number = 0,
  feedType: FeedType = "following",
  userId?: string
): Promise<FederatedPost[]> => {
  try {

    if (feedType === "following" && !userId) return [];
    let publicQuery = supabase.from("federated_feed")
      .select("id,content,published_at,source,type,attributed_to,company_id");
    if (feedType === "local") publicQuery = publicQuery.eq("source", "local").neq("type", "Announce");
    const query = feedType === "following"
      ? supabase.rpc("get_following_feed", { p_limit: limit, p_offset: offset })
      : publicQuery.order("published_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + limit - 1);

    const { data: apObjects, error: apError } = await query;

    if (apError) {
      throw apError;
    }

    if (!apObjects || apObjects.length === 0) {

      return [];
    }

    // Get actor data from public_actors view (public projection)
    const actorIds = [...new Set(apObjects.map((obj: any) => obj.attributed_to).filter(Boolean))];
    let actorsMap: Record<string, { user_id: string | null; preferred_username: string }> = {};

    if (actorIds.length > 0) {
      const { data: actors, error: actorError } = await supabase
        .from("public_actors")
        .select("id, user_id, preferred_username")
        .in("id", actorIds);

      if (actorError) {
        console.error("Error fetching actors:", actorError);
      } else if (actors) {
        actorsMap = Object.fromEntries(
          actors.map((a) => [a.id, { user_id: a.user_id, preferred_username: a.preferred_username }])
        );
      }
    }

    // Enrich objects with actor data for filtering
    const enrichedObjects = apObjects.map((obj: any) => ({
      ...obj,
      actors: actorsMap[obj.attributed_to] || null,
    }));

    const filteredObjects = enrichedObjects;

    const userIds = filteredObjects
      .map((obj: any) => obj.actors?.user_id)
      .filter((id: string | undefined): id is string => !!id);

    let profilesMap: Record<
      string,
      {
        username: string | null;
        fullname: string | null;
        avatar_url: string | null;
        home_instance: string | null;
        is_freelancer: boolean;
      }
    > = {};

    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from("public_profiles")
        .select("id, username, fullname, avatar_url, home_instance, is_freelancer")
        .in("id", userIds);

      if (profileError) throw profileError;
      if (profiles) {
        profilesMap = Object.fromEntries(
          profiles.map((p) => [
            p.id,
            {
              username: p.username,
              fullname: p.fullname,
              avatar_url: p.avatar_url,
              home_instance: p.home_instance,
              is_freelancer: p.is_freelancer || false,
            },
          ])
        );
      }
    }

    // Fetch company data for company posts
    const companyIds = [...new Set(filteredObjects.map((obj: any) => obj.company_id).filter(Boolean))];
    let companiesMap: Record<string, { id: string; name: string; slug: string; logo_url: string | null }> = {};

    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name, slug, logo_url")
        .in("id", companyIds);

      if (companies) {
        companiesMap = Object.fromEntries(companies.map((c) => [c.id, c]));
      }
    }

    // Transform the data into our expected format
    const federatedPosts: FederatedPost[] = filteredObjects.map((obj: any) => {
      const raw = obj.content as any;
      const note = raw?.type === "Create" ? raw.object : raw;
      const actor = obj.actors;
      const profile = actor?.user_id ? profilesMap[actor.user_id] : undefined;
      const company = obj.company_id ? companiesMap[obj.company_id] : undefined;

      const displayName = company?.name || profile?.fullname || profile?.username || actor?.preferred_username || "Unknown User";

      // Get content warning from ActivityPub summary field
      const contentWarning = note?.summary || raw?.summary || null;

      return {
        id: obj.id,
        content: note,
        created_at: obj.published_at,
        published_at: obj.published_at,
        actor_name: displayName,
        actor_avatar: company?.logo_url || profile?.avatar_url || undefined,
        user_id: actor?.user_id || null,
        profile: profile
          ? {
              username: profile.username || undefined,
              fullname: profile.fullname || undefined,
              avatar_url: profile.avatar_url || undefined,
              home_instance: profile.home_instance || undefined,
              is_freelancer: profile.is_freelancer || false,
            }
          : undefined,
        company: company || undefined,
        source: obj.source === "local" ? "local" : "remote",
        type: note?.type || "Note",
        content_warning: contentWarning,
      };
    });

    return federatedPosts;
  } catch (error) {
    throw error;
  }
};

export const federateActivity = async (activity: any) => {
  try {

    const { data, error } = await supabase
      .from("ap_objects")
      .insert({
        type: activity.type,
        content: activity,
        attributed_to: activity.attributed_to || activity.actor?.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error storing federated activity:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error federating activity:", error);
    throw error;
  }
};

// Fix moderation functions to return proper response format
export const getActorModeration = async () => {
  try {
    const { data, error } = await supabase.from("blocked_actors").select("*").order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching actor moderation:", error);
    return [];
  }
};

export const updateActorModeration = async (actorUrl: string, status: string, reason: string) => {
  try {
    const { data, error } = await supabase
      .from("blocked_actors")
      .upsert({
        actor_url: actorUrl,
        status,
        reason,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating actor moderation:", error);
    return { success: false, error };
  }
};

export const deleteActorModeration = async (actorUrl: string) => {
  try {
    const { error } = await supabase.from("blocked_actors").delete().eq("actor_url", actorUrl);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting actor moderation:", error);
    return { success: false, error };
  }
};

export const getDomainModeration = async () => {
  try {
    const { data, error } = await supabase.from("blocked_domains").select("*").order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching domain moderation:", error);
    return [];
  }
};

export const updateDomainModeration = async (host: string, status: string, reason: string) => {
  try {
    const { data, error } = await supabase
      .from("blocked_domains")
      .upsert({
        host,
        status,
        reason,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating domain moderation:", error);
    return { success: false, error };
  }
};

export const deleteDomainModeration = async (host: string) => {
  try {
    const { error } = await supabase.from("blocked_domains").delete().eq("host", host);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting domain moderation:", error);
    return { success: false, error };
  }
};

export const getRateLimitedHosts = async (requestThreshold: number, timeWindow: number) => {
  try {
    const windowStart = new Date(Date.now() - timeWindow * 60 * 1000).toISOString();

    const { data, error } = await supabase.rpc("get_rate_limited_hosts", {
      window_start: windowStart,
      request_threshold: requestThreshold,
    });

    if (error) throw error;

    return {
      success: true,
      hosts: data || [],
    };
  } catch (error) {
    console.error("Error fetching rate limited hosts:", error);
    return {
      success: false,
      hosts: [],
    };
  }
};

export const getProxiedMediaUrl = (originalUrl: string): string => {
  if (!originalUrl) return originalUrl;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (originalUrl.startsWith(supabaseUrl)) {
    return originalUrl;
  }

  if (originalUrl.startsWith("data:")) {
    return originalUrl;
  }

  return `${supabaseUrl}/functions/v1/proxy-media?url=${encodeURIComponent(originalUrl)}`;
};
