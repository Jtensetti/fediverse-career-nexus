import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/validate.ts";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Fetch ALL user data in parallel
    const results = await fetchAllUserData(userId);

    if (format === "gdpr") {
      return buildGdprExport(user, results);
    }

    if (format === "activitypub") {
      return buildActivityPubExport(user, results, supabaseUrl);
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

async function fetchAllUserData(userId: string) {
  const [
    profile, actor, experiences, education, skills, posts, replies,
    messages, connections, following, followers, savedItems, reactions,
    articles, articleReactions, articleAuthors, notifications, blockedUsers,
    consents, events, eventAttendees, eventRsvps, eventInvitations,
    cvSections, jobPosts, jobConversations, pollVotes, postBoosts,
    postReactions, recommendations, referrals, endorsements,
    sectionVisibility, feedPreferences, crossPostSettings, customFeeds,
    companyEmployees, companyRoles, companyFollowers, starterPacks,
    starterPackMembers, followedPacks, userSettings, userAchievements,
    cwPreferences, profileViews, messageRequests, actorFollowers,
    outgoingFollows, newsletterSubs
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
    supabaseClient.from("article_reactions").select("*").eq("user_id", userId),
    supabaseClient.from("article_authors").select("*").eq("user_id", userId),
    supabaseClient.from("notifications").select("*").eq("recipient_id", userId),
    supabaseClient.from("user_blocks").select("*").eq("blocker_id", userId),
    supabaseClient.from("user_consents").select("*").eq("user_id", userId),
    supabaseClient.from("events").select("*").eq("user_id", userId),
    supabaseClient.from("event_attendees").select("*").eq("user_id", userId),
    supabaseClient.from("event_rsvps").select("*").eq("user_id", userId),
    supabaseClient.from("event_invitations").select("*").eq("user_id", userId),
    supabaseClient.from("cv_sections").select("*").eq("user_id", userId),
    supabaseClient.from("job_posts").select("*").eq("user_id", userId),
    supabaseClient.from("job_conversations").select("*").or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),
    supabaseClient.from("poll_votes").select("*").eq("user_id", userId),
    supabaseClient.from("post_boosts").select("*").eq("user_id", userId),
    supabaseClient.from("post_reactions").select("*").eq("user_id", userId),
    supabaseClient.from("recommendations").select("*").or(`recommender_id.eq.${userId},recommended_id.eq.${userId}`),
    supabaseClient.from("referrals").select("*").eq("referrer_id", userId),
    supabaseClient.from("skill_endorsements").select("*").or(`endorser_id.eq.${userId},user_id.eq.${userId}`),
    supabaseClient.from("profile_section_visibility").select("*").eq("user_id", userId),
    supabaseClient.from("user_feed_preferences").select("*").eq("user_id", userId),
    supabaseClient.from("cross_post_settings").select("*").eq("user_id", userId),
    supabaseClient.from("custom_feeds").select("*").eq("user_id", userId),
    supabaseClient.from("company_employees").select("*").eq("user_id", userId),
    supabaseClient.from("company_roles").select("*").eq("user_id", userId),
    supabaseClient.from("company_followers").select("*").eq("user_id", userId),
    supabaseClient.from("starter_packs").select("*").eq("created_by", userId),
    supabaseClient.from("starter_pack_members").select("*").eq("user_id", userId),
    supabaseClient.from("user_followed_packs").select("*").eq("user_id", userId),
    supabaseClient.from("user_settings").select("*").eq("user_id", userId),
    supabaseClient.from("user_achievements").select("*").eq("user_id", userId),
    supabaseClient.from("user_cw_preferences").select("*").eq("user_id", userId),
    supabaseClient.from("profile_views").select("*").eq("viewer_id", userId),
    supabaseClient.from("message_requests").select("*").or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),
    supabaseClient.from("actor_followers").select("*").eq("local_actor_id", userId),
    supabaseClient.from("outgoing_follows").select("*").eq("local_actor_id", userId),
    supabaseClient.from("newsletter_subscribers").select("*").eq("user_id", userId),
  ]);

  // Fetch company data for companies where user is owner or admin
  const adminRoles = (companyRoles.data || []).filter(
    (r: any) => r.role === 'owner' || r.role === 'admin'
  );
  const adminCompanyIds = adminRoles.map((r: any) => r.company_id);

  let managedCompanies: any[] = [];
  if (adminCompanyIds.length > 0) {
    const companyDataPromises = adminCompanyIds.map(async (companyId: string) => {
      const [company, employees, roles, posts, auditLog, followers, claimRequests] = await Promise.all([
        supabaseClient.from("companies").select("*").eq("id", companyId).single(),
        supabaseClient.from("company_employees").select("*").eq("company_id", companyId),
        supabaseClient.from("company_roles").select("*").eq("company_id", companyId),
        supabaseClient.from("ap_objects").select("*").eq("company_id", companyId),
        supabaseClient.from("company_audit_log").select("*").eq("company_id", companyId),
        supabaseClient.from("company_followers").select("*").eq("company_id", companyId),
        supabaseClient.from("company_claim_requests").select("*").eq("company_id", companyId),
      ]);
      return {
        company: company.data,
        employees: employees.data || [],
        roles: roles.data || [],
        posts: posts.data || [],
        auditLog: auditLog.data || [],
        followers: followers.data || [],
        claimRequests: claimRequests.data || [],
      };
    });
    managedCompanies = await Promise.all(companyDataPromises);
  }

  return {
    profile: profile.data,
    actor: actor.data,
    experiences: experiences.data || [],
    education: education.data || [],
    skills: skills.data || [],
    posts: posts.data || [],
    replies: replies.data || [],
    messages: messages.data || [],
    connections: connections.data || [],
    following: following.data || [],
    followers: followers.data || [],
    savedItems: savedItems.data || [],
    reactions: reactions.data || [],
    articles: articles.data || [],
    articleReactions: articleReactions.data || [],
    articleAuthors: articleAuthors.data || [],
    notifications: notifications.data || [],
    blockedUsers: blockedUsers.data || [],
    consents: consents.data || [],
    events: events.data || [],
    eventAttendees: eventAttendees.data || [],
    eventRsvps: eventRsvps.data || [],
    eventInvitations: eventInvitations.data || [],
    cvSections: cvSections.data || [],
    jobPosts: jobPosts.data || [],
    jobConversations: jobConversations.data || [],
    pollVotes: pollVotes.data || [],
    postBoosts: postBoosts.data || [],
    postReactions: postReactions.data || [],
    recommendations: recommendations.data || [],
    referrals: referrals.data || [],
    endorsements: endorsements.data || [],
    sectionVisibility: sectionVisibility.data || [],
    feedPreferences: feedPreferences.data || [],
    crossPostSettings: crossPostSettings.data || [],
    customFeeds: customFeeds.data || [],
    companyEmployees: companyEmployees.data || [],
    companyRoles: companyRoles.data || [],
    companyFollowers: companyFollowers.data || [],
    starterPacks: starterPacks.data || [],
    starterPackMembers: starterPackMembers.data || [],
    followedPacks: followedPacks.data || [],
    userSettings: userSettings.data || [],
    userAchievements: userAchievements.data || [],
    cwPreferences: cwPreferences.data || [],
    profileViews: profileViews.data || [],
    messageRequests: messageRequests.data || [],
    actorFollowers: actorFollowers.data || [],
    outgoingFollows: outgoingFollows.data || [],
    newsletterSubs: newsletterSubs.data || [],
    managedCompanies,
  };
}

function buildGdprExport(user: any, d: any) {
  const redactedActor = d.actor ? { ...d.actor, private_key: "[REDACTED]" } : null;

  const exportData = {
    exportDate: new Date().toISOString(),
    exportFormat: "GDPR Data Portability Export (Article 20)",
    schemaVersion: "2.0",
    user: { id: user.id, email: user.email, createdAt: user.created_at },
    profile: d.profile,
    actor: redactedActor,
    experiences: d.experiences,
    education: d.education,
    skills: d.skills,
    cvSections: d.cvSections,
    posts: d.posts,
    replies: d.replies,
    postReactions: d.postReactions,
    postBoosts: d.postBoosts,
    pollVotes: d.pollVotes,
    articles: d.articles,
    articleReactions: d.articleReactions,
    articleAuthors: d.articleAuthors,
    messages: d.messages,
    messageRequests: d.messageRequests,
    connections: d.connections,
    following: d.following,
    followers: d.followers,
    actorFollowers: d.actorFollowers,
    outgoingFollows: d.outgoingFollows,
    savedItems: d.savedItems,
    reactions: d.reactions,
    events: d.events,
    eventAttendees: d.eventAttendees,
    eventRsvps: d.eventRsvps,
    eventInvitations: d.eventInvitations,
    jobPosts: d.jobPosts,
    jobConversations: d.jobConversations,
    endorsements: d.endorsements,
    recommendations: d.recommendations,
    referrals: d.referrals,
    starterPacks: d.starterPacks,
    starterPackMembers: d.starterPackMembers,
    followedPacks: d.followedPacks,
    companyEmployees: d.companyEmployees,
    companyRoles: d.companyRoles,
    companyFollowers: d.companyFollowers,
    notifications: d.notifications,
    blockedUsers: d.blockedUsers,
    consents: d.consents,
    sectionVisibility: d.sectionVisibility,
    feedPreferences: d.feedPreferences,
    crossPostSettings: d.crossPostSettings,
    customFeeds: d.customFeeds,
    userSettings: d.userSettings,
    userAchievements: d.userAchievements,
    cwPreferences: d.cwPreferences,
    profileViews: d.profileViews,
    newsletterSubscriptions: d.newsletterSubs,
    managedCompanies: d.managedCompanies.length > 0 ? d.managedCompanies : undefined,
    dataCategories: {
      profile: "Personal information provided during account creation",
      actor: "ActivityPub identity and federation data (private key redacted)",
      experiences: "Work experience entries",
      education: "Education entries",
      skills: "Skills added to profile",
      cvSections: "CV/resume sections",
      posts: "Content posted on the platform (ActivityPub Note objects)",
      replies: "Replies to other posts",
      postReactions: "Reactions on posts",
      postBoosts: "Posts you boosted/shared",
      pollVotes: "Votes cast in polls",
      articles: "Long-form articles authored",
      articleReactions: "Reactions on articles",
      messages: "Direct messages sent and received",
      messageRequests: "Message requests sent and received",
      connections: "Professional connections",
      following: "Users you follow",
      followers: "Users following you",
      actorFollowers: "Fediverse followers (remote ActivityPub actors)",
      outgoingFollows: "Fediverse accounts you follow (remote ActivityPub actors)",
      savedItems: "Bookmarked/saved items",
      reactions: "Likes and reactions",
      events: "Events you created",
      eventAttendees: "Events you attend",
      eventRsvps: "Event RSVPs",
      eventInvitations: "Event invitations received",
      jobPosts: "Job listings you created",
      jobConversations: "Job inquiry conversations",
      endorsements: "Skill endorsements given and received",
      recommendations: "Recommendations given and received",
      referrals: "Referrals made",
      starterPacks: "Starter packs you created",
      companyEmployees: "Company employment records",
      companyRoles: "Company admin roles",
      companyFollowers: "Companies you follow",
      notifications: "Notifications received",
      blockedUsers: "Users you have blocked",
      consents: "Record of privacy consents",
      sectionVisibility: "Profile section visibility settings",
      feedPreferences: "Feed preferences",
      crossPostSettings: "Cross-posting configuration",
      customFeeds: "Custom feed configurations",
      userSettings: "User settings",
      cwPreferences: "Content warning preferences",
      profileViews: "Profile views you made",
      newsletterSubscriptions: "Newsletter subscriptions",
      managedCompanies: "Full data for companies you own or administer (profile, employees, roles, posts, audit log, followers, claims)",
    }
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="nolto-data-export-${new Date().toISOString().split('T')[0]}.json"`
    }
  });
}

function buildActivityPubExport(user: any, d: any, supabaseUrl: string) {
  const profile = d.profile;
  const actor = d.actor;

  if (!profile || !actor) {
    return new Response(
      JSON.stringify({ error: "Profile or actor not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const baseUrl = supabaseUrl.replace('/functions/v1', '');
  const actorUrl = `${baseUrl}/functions/v1/actor/${profile.username}`;

  // actor.json — W3C ActivityPub Actor
  const actorObject = {
    "@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],
    id: actorUrl,
    type: "Person",
    preferredUsername: actor.preferred_username || profile.username,
    name: profile.fullname || profile.username,
    summary: profile.bio || "",
    inbox: `${baseUrl}/functions/v1/inbox/${profile.username}`,
    outbox: `${baseUrl}/functions/v1/outbox/${profile.username}`,
    followers: `${baseUrl}/functions/v1/followers/${profile.username}`,
    following: `${baseUrl}/functions/v1/following/${profile.username}`,
    url: `https://samverkan.se/@${profile.username}`,
    manuallyApprovesFollowers: false,
    discoverable: true,
    published: actor.created_at,
    publicKey: {
      id: `${actorUrl}#main-key`,
      owner: actorUrl,
      publicKeyPem: actor.public_key || ""
    },
    icon: profile.avatar_url ? { type: "Image", mediaType: "image/jpeg", url: profile.avatar_url } : null,
    image: profile.banner_url ? { type: "Image", mediaType: "image/jpeg", url: profile.banner_url } : null,
    alsoKnownAs: actor.also_known_as || [],
    movedTo: actor.moved_to || null,
    attachment: [
      ...(profile.location ? [{ type: "PropertyValue", name: "Location", value: profile.location }] : []),
      ...(profile.website ? [{ type: "PropertyValue", name: "Website", value: `<a href="${profile.website}">${profile.website}</a>` }] : []),
    ]
  };

  // outbox.json — OrderedCollection of Create activities
  const outboxItems = (d.posts || []).map((post: any) => ({
    type: "Create",
    id: `https://samverkan.se/activities/${post.id}`,
    actor: actorUrl,
    published: post.created_at,
    object: {
      type: "Note",
      id: `https://samverkan.se/posts/${post.id}`,
      content: post.content?.content || "",
      published: post.created_at,
      attributedTo: actorUrl,
      to: ["https://www.w3.org/ns/activitystreams#Public"],
      cc: [`${baseUrl}/functions/v1/followers/${profile.username}`],
      ...(post.content_warning ? { summary: post.content_warning } : {}),
    }
  }));

  // articles as Article objects
  const articleItems = (d.articles || []).map((a: any) => ({
    type: "Create",
    id: `https://samverkan.se/activities/article-${a.id}`,
    actor: actorUrl,
    published: a.published_at || a.created_at,
    object: {
      type: "Article",
      id: `https://samverkan.se/articles/${a.slug || a.id}`,
      name: a.title,
      content: a.content,
      published: a.published_at || a.created_at,
      attributedTo: actorUrl,
      to: ["https://www.w3.org/ns/activitystreams#Public"],
      ...(a.cover_image_url ? { image: { type: "Image", url: a.cover_image_url } } : {}),
      ...(a.tags?.length ? { tag: a.tags.map((t: string) => ({ type: "Hashtag", name: `#${t}` })) } : {}),
    }
  }));

  // events as Event objects
  const eventItems = (d.events || []).map((e: any) => ({
    type: "Create",
    id: `https://samverkan.se/activities/event-${e.id}`,
    actor: actorUrl,
    published: e.created_at,
    object: {
      type: "Event",
      id: `https://samverkan.se/events/${e.id}`,
      name: e.title,
      content: e.description || "",
      startTime: e.start_date,
      endTime: e.end_date,
      location: e.is_online ? { type: "VirtualLocation", url: e.meeting_url } : { type: "Place", name: e.location },
      attributedTo: actorUrl,
    }
  }));

  const outbox = {
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "OrderedCollection",
    id: `${baseUrl}/functions/v1/outbox/${profile.username}`,
    totalItems: outboxItems.length + articleItems.length + eventItems.length,
    orderedItems: [...outboxItems, ...articleItems, ...eventItems]
  };

  // following.csv — Mastodon-compatible
  const followingCsv = "Account address\n" +
    (d.following || []).map((f: any) => f.author_id).join("\n");

  // blocked_accounts.csv
  const blockedCsv = "Account address\n" +
    (d.blockedUsers || []).map((b: any) => b.blocked_user_id).join("\n");

  // bookmarks.json
  const bookmarks = {
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "OrderedCollection",
    totalItems: d.savedItems.length,
    orderedItems: d.savedItems.map((item: any) => ({
      type: "Note", id: item.post_id, savedAt: item.created_at
    }))
  };

  // likes.json
  const likes = {
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "OrderedCollection",
    totalItems: d.reactions.length + d.postReactions.length,
    orderedItems: [
      ...d.reactions.map((r: any) => ({
        type: "Like", object: r.target_id, published: r.created_at, content: r.reaction_type
      })),
      ...d.postReactions.map((r: any) => ({
        type: "Like", object: r.post_id, published: r.created_at, content: r.emoji
      })),
    ]
  };

  // Announce (boosts)
  const boosts = {
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "OrderedCollection",
    totalItems: d.postBoosts.length,
    orderedItems: d.postBoosts.map((b: any) => ({
      type: "Announce", actor: actorUrl, object: b.post_id, published: b.created_at
    }))
  };

  // profile.json — structured profile data as AP attachments
  const profileData = {
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "Profile",
    describes: actorUrl,
    experiences: d.experiences.map((e: any) => ({
      type: "PropertyValue",
      name: `${e.title} at ${e.company}`,
      value: `${e.start_date || ""}–${e.end_date || "present"}`,
      description: e.description || "",
      location: e.location || "",
    })),
    education: d.education.map((e: any) => ({
      type: "PropertyValue",
      name: `${e.degree} — ${e.institution}`,
      value: `${e.start_year || ""}–${e.end_year || ""}`,
      field: e.field || "",
    })),
    skills: d.skills.map((s: any) => s.name || s.skill_name),
    cvSections: d.cvSections,
    endorsements: d.endorsements,
    recommendations: d.recommendations,
  };

  // messages.json — ChatMessage format
  const messagesExport = {
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "OrderedCollection",
    totalItems: d.messages.length,
    orderedItems: d.messages.map((m: any) => ({
      type: "ChatMessage",
      id: m.id,
      attributedTo: m.sender_id,
      to: [m.recipient_id],
      content: m.content,
      published: m.created_at,
    }))
  };

  const activityPubExport = {
    exportDate: new Date().toISOString(),
    exportFormat: "ActivityPub Data Portability Export",
    schemaVersion: "2.0",
    note: "This export is compatible with Mastodon and other ActivityPub servers. Import following.csv to your new instance to restore your social graph.",
    files: {
      "actor.json": actorObject,
      "outbox.json": outbox,
      "following.csv": followingCsv,
      "blocked_accounts.csv": blockedCsv,
      "bookmarks.json": bookmarks,
      "likes.json": likes,
      "boosts.json": boosts,
      "profile.json": profileData,
      "messages.json": messagesExport,
    },
    additionalData: {
      events: d.events,
      eventRsvps: d.eventRsvps,
      jobPosts: d.jobPosts,
      jobConversations: d.jobConversations,
      pollVotes: d.pollVotes,
      referrals: d.referrals,
      starterPacks: d.starterPacks,
      companyEmployees: d.companyEmployees,
      companyRoles: d.companyRoles,
      companyFollowers: d.companyFollowers,
      customFeeds: d.customFeeds,
      feedPreferences: d.feedPreferences,
      crossPostSettings: d.crossPostSettings,
      userSettings: d.userSettings,
      consents: d.consents,
    },
    managedCompanies: d.managedCompanies.length > 0 ? d.managedCompanies.map((mc: any) => ({
      company: mc.company,
      employees: mc.employees,
      roles: mc.roles,
      posts: mc.posts,
      auditLog: mc.auditLog,
      followers: mc.followers,
      claimRequests: mc.claimRequests,
    })) : undefined,
  };

  return new Response(JSON.stringify(activityPubExport, null, 2), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="nolto-activitypub-export-${new Date().toISOString().split('T')[0]}.json"`
    }
  });
}
