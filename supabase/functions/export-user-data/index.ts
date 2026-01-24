import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Create ActivityPub Actor object for export
function createActorObject(profile: any, actor: any, supabaseUrl: string) {
  const baseUrl = supabaseUrl.replace('/functions/v1', '');
  const actorUrl = `${baseUrl}/functions/v1/actor/${profile.username}`;
  
  return {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1"
    ],
    "id": actorUrl,
    "type": "Person",
    "preferredUsername": actor.preferred_username || profile.username,
    "name": profile.fullname || profile.username,
    "summary": profile.bio || "",
    "inbox": `${baseUrl}/functions/v1/inbox/${profile.username}`,
    "outbox": `${baseUrl}/functions/v1/outbox/${profile.username}`,
    "followers": `${baseUrl}/functions/v1/followers/${profile.username}`,
    "following": `${baseUrl}/functions/v1/following/${profile.username}`,
    "url": `${baseUrl}/@${profile.username}`,
    "manuallyApprovesFollowers": false,
    "discoverable": true,
    "published": actor.created_at,
    "publicKey": {
      "id": `${actorUrl}#main-key`,
      "owner": actorUrl,
      "publicKeyPem": actor.public_key || ""
    },
    "icon": profile.avatar_url ? {
      "type": "Image",
      "mediaType": "image/jpeg",
      "url": profile.avatar_url
    } : null,
    "alsoKnownAs": actor.also_known_as || [],
    "movedTo": actor.moved_to || null
  };
}

// Create ActivityStreams OrderedCollection for outbox
function createOutboxCollection(posts: any[], baseUrl: string, username: string) {
  const actorUrl = `${baseUrl}/functions/v1/actor/${username}`;
  const items = posts.map(post => ({
    "@context": "https://www.w3.org/ns/activitystreams",
    "type": "Create",
    "id": `${baseUrl}/activities/${post.id}`,
    "actor": actorUrl,
    "published": post.created_at,
    "object": {
      "type": "Note",
      "id": `${baseUrl}/posts/${post.id}`,
      "content": post.content?.content || "",
      "published": post.created_at,
      "attributedTo": actorUrl,
      "to": ["https://www.w3.org/ns/activitystreams#Public"],
      "cc": [`${baseUrl}/functions/v1/followers/${username}`]
    }
  }));

  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    "type": "OrderedCollection",
    "id": `${baseUrl}/functions/v1/outbox/${username}`,
    "totalItems": items.length,
    "orderedItems": items
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "gdpr";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    console.log(`Exporting data for user ${userId} in format ${format}`);

    // Fetch all user data in parallel
    const [
      profileResult,
      actorResult,
      experiencesResult,
      educationResult,
      skillsResult,
      postsResult,
      repliesResult,
      messagesResult,
      connectionsResult,
      followingResult,
      followersResult,
      savedItemsResult,
      reactionsResult,
      articlesResult,
      notificationsResult,
      blockedUsersResult,
      consentsResult
    ] = await Promise.all([
      supabaseClient.from("profiles").select("*").eq("id", userId).single(),
      supabaseClient.from("actors").select("*").eq("user_id", userId).single(),
      supabaseClient.from("experiences").select("*").eq("user_id", userId),
      supabaseClient.from("education").select("*").eq("user_id", userId),
      supabaseClient.from("skills").select("*").eq("user_id", userId),
      supabaseClient.from("ap_objects").select("*").eq("attributed_to", userId).eq("type", "Note").order("created_at", { ascending: false }),
      supabaseClient.from("post_replies").select("*").eq("user_id", userId),
      supabaseClient.from("messages").select("*").or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),
      supabaseClient.from("user_connections").select("*").or(`user_id.eq.${userId},connected_user_id.eq.${userId}`),
      supabaseClient.from("author_follows").select("*").eq("follower_id", userId),
      supabaseClient.from("author_follows").select("*").eq("author_id", userId),
      supabaseClient.from("saved_items").select("*").eq("user_id", userId),
      supabaseClient.from("reactions").select("*").eq("user_id", userId),
      supabaseClient.from("articles").select("*").eq("user_id", userId),
      supabaseClient.from("notifications").select("*").eq("recipient_id", userId),
      supabaseClient.from("user_blocks").select("*").eq("blocker_id", userId),
      supabaseClient.from("user_consents").select("*").eq("user_id", userId)
    ]);

    // Handle GDPR JSON format
    if (format === "gdpr") {
      const exportData = {
        exportDate: new Date().toISOString(),
        exportFormat: "GDPR Data Portability Export",
        schemaVersion: "1.0",
        user: {
          id: userId,
          email: user.email,
          createdAt: user.created_at
        },
        profile: profileResult.data,
        actor: actorResult.data ? {
          ...actorResult.data,
          private_key: "[REDACTED]" // Don't export private key
        } : null,
        experiences: experiencesResult.data || [],
        education: educationResult.data || [],
        skills: skillsResult.data || [],
        posts: postsResult.data || [],
        replies: repliesResult.data || [],
        messages: messagesResult.data || [],
        connections: connectionsResult.data || [],
        following: followingResult.data || [],
        followers: followersResult.data || [],
        savedItems: savedItemsResult.data || [],
        reactions: reactionsResult.data || [],
        articles: articlesResult.data || [],
        notifications: notificationsResult.data || [],
        blockedUsers: blockedUsersResult.data || [],
        consents: consentsResult.data || [],
        dataCategories: {
          profile: "Personal information you provided when creating your account",
          experiences: "Work experience entries you added to your profile",
          education: "Education entries you added to your profile",
          skills: "Skills you added to your profile",
          posts: "Content you posted on the platform",
          replies: "Replies you made to other posts",
          messages: "Direct messages you sent and received",
          connections: "Your professional connections",
          following: "Users you follow",
          followers: "Users following you",
          savedItems: "Items you saved/bookmarked",
          reactions: "Your likes and reactions",
          articles: "Articles you authored",
          notifications: "Notifications you received",
          blockedUsers: "Users you have blocked",
          consents: "Record of your privacy consents"
        }
      };

      return new Response(
        JSON.stringify(exportData, null, 2),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="nolto-data-export-${new Date().toISOString().split('T')[0]}.json"`
          }
        }
      );
    }

    // Handle ActivityPub format
    if (format === "activitypub") {
      const profile = profileResult.data;
      const actor = actorResult.data;

      if (!profile || !actor) {
        return new Response(
          JSON.stringify({ error: "Profile or actor not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const baseUrl = supabaseUrl.replace('/functions/v1', '');
      
      // Create ActivityPub actor object
      const actorObject = createActorObject(profile, actor, supabaseUrl);
      
      // Create outbox collection
      const outbox = createOutboxCollection(postsResult.data || [], baseUrl, profile.username);

      // Create following.csv
      const followingCsv = "Account address\n" + 
        (followingResult.data || [])
          .map((f: any) => f.author_id)
          .join("\n");

      // Create blocked_accounts.csv  
      const blockedAccountsCsv = "Account address\n" +
        (blockedUsersResult.data || [])
          .map((b: any) => b.blocked_user_id)
          .join("\n");

      // Create bookmarks.json
      const bookmarks = {
        "@context": "https://www.w3.org/ns/activitystreams",
        "type": "OrderedCollection",
        "totalItems": (savedItemsResult.data || []).length,
        "orderedItems": (savedItemsResult.data || []).map((item: any) => ({
          "type": "Note",
          "id": item.post_id,
          "savedAt": item.created_at
        }))
      };

      // Create likes.json
      const likes = {
        "@context": "https://www.w3.org/ns/activitystreams",
        "type": "OrderedCollection",
        "totalItems": (reactionsResult.data || []).length,
        "orderedItems": (reactionsResult.data || []).map((r: any) => ({
          "type": "Like",
          "object": r.target_id,
          "likedAt": r.created_at,
          "reactionType": r.reaction_type
        }))
      };

      const activityPubExport = {
        exportDate: new Date().toISOString(),
        exportFormat: "ActivityPub Data Portability Export",
        schemaVersion: "1.0",
        note: "This export is compatible with Mastodon and other ActivityPub servers. Import following.csv to your new instance.",
        files: {
          "actor.json": actorObject,
          "outbox.json": outbox,
          "following.csv": followingCsv,
          "blocked_accounts.csv": blockedAccountsCsv,
          "bookmarks.json": bookmarks,
          "likes.json": likes
        }
      };

      return new Response(
        JSON.stringify(activityPubExport, null, 2),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="nolto-activitypub-export-${new Date().toISOString().split('T')[0]}.json"`
          }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid format. Use 'gdpr' or 'activitypub'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error exporting user data:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
