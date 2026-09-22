/** Anonymous, read-only API shared by the web visitor feed and native app. */
export interface PublicBackend {
  url: string;
  publishableKey: string;
}

export interface PublicPost {
  id: string;
  content: Record<string, unknown>;
  created_at: string;
  published_at?: string;
  type: string;
  source: "local" | "remote";
  actor_name: string;
  actor_avatar?: string;
  user_id?: string;
  content_warning?: string;
  profile?: { username?: string; fullname?: string; avatar_url?: string; home_instance?: string; is_freelancer: boolean };
  company?: { id: string; name: string; slug: string; logo_url: string | null };
}

type Row = Record<string, unknown>;
const record = (value: unknown): value is Row => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): string | undefined => typeof value === "string" ? value : undefined;
const uuid = (value: unknown): value is string => typeof value === "string" && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value);

export async function fetchPublicFeed(
  backend: PublicBackend,
  { scope = "local", offset = 0, limit = 12, signal }: { scope?: "local" | "federated"; offset?: number; limit?: number; signal?: AbortSignal } = {},
): Promise<PublicPost[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isInteger(offset) || offset < 0) throw new Error("Invalid feed page");
  const origin = new URL(backend.url);
  if (!backend.publishableKey || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") throw new Error("Invalid public backend configuration");
  const read = async (resource: string, query: Record<string, string>): Promise<Row[]> => {
    const url = new URL(`/rest/v1/${resource}`, origin);
    url.search = new URLSearchParams(query).toString();
    const response = await fetch(url, { headers: { apikey: backend.publishableKey }, signal, credentials: "omit" });
    if (!response.ok) throw new Error(`Public feed request failed (${response.status})`);
    const data: unknown = await response.json();
    if (!Array.isArray(data) || !data.every(record)) throw new Error("Invalid public feed response");
    return data;
  };
  const rows = await read("federated_feed", {
    select: "id,content,published_at,source,type,attributed_to,company_id",
    order: "published_at.desc.nullslast,id.desc", limit: String(limit), offset: String(offset),
    ...(scope === "local" ? { source: "eq.local", type: "neq.Announce" } : {}),
  });
  if (!rows.length) return [];
  const ids = (values: unknown[]) => [...new Set(values.filter(uuid))];
  const actorIds = ids(rows.map(row => row.attributed_to));
  const companyIds = ids(rows.map(row => row.company_id));
  const [actors, companies] = await Promise.all([
    actorIds.length ? read("public_actors", { select: "id,user_id,preferred_username", id: `in.(${actorIds.join(",")})` }) : [],
    companyIds.length ? read("companies", { select: "id,name,slug,logo_url", id: `in.(${companyIds.join(",")})` }) : [],
  ]);
  const userIds = ids(actors.map(actor => actor.user_id));
  const profiles = userIds.length ? await read("public_profiles", { select: "id,username,fullname,avatar_url,home_instance,is_freelancer", id: `in.(${userIds.join(",")})` }) : [];
  const byId = (data: Row[]) => new Map(data.map(row => [row.id, row]));
  const actorMap = byId(actors), companyMap = byId(companies), profileMap = byId(profiles);
  return rows.map(row => {
    if (!uuid(row.id) || !record(row.content)) throw new Error("Invalid public post");
    const content = row.content.type === "Create" ? row.content.object : row.content;
    if (!record(content)) throw new Error("Invalid public post content");
    const actor = actorMap.get(row.attributed_to);
    const profile = profileMap.get(actor?.user_id);
    const company = companyMap.get(row.company_id);
    return {
      id: row.id, content, created_at: text(row.published_at) ?? "", published_at: text(row.published_at),
      type: text(content.type) ?? text(row.type) ?? "Note", source: row.source === "remote" ? "remote" : "local",
      actor_name: text(company?.name) ?? text(profile?.fullname) ?? text(profile?.username) ?? text(actor?.preferred_username) ?? "",
      actor_avatar: text(company?.logo_url) ?? text(profile?.avatar_url), user_id: text(actor?.user_id),
      content_warning: text(content.summary),
      profile: profile ? { username: text(profile.username), fullname: text(profile.fullname), avatar_url: text(profile.avatar_url), home_instance: text(profile.home_instance), is_freelancer: profile.is_freelancer === true } : undefined,
      company: company && uuid(company.id) && typeof company.name === "string" && typeof company.slug === "string" ? { id: company.id, name: company.name, slug: company.slug, logo_url: text(company.logo_url) ?? null } : undefined,
    };
  });
}
