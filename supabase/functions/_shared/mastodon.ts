import { createClient } from 'npm:@supabase/supabase-js@2.89.0';
import { serviceClient } from './local-actor.ts';
import { getFederationBaseUrl, getSiteUrl } from './federation-urls.ts';
import { tokenHash } from './oauth.ts';
import { HttpError } from './user-auth.ts';
import { readBody } from './remote-fetch.ts';

export const MASTODON_SCOPES = ['read', 'write', 'follow', 'push', 'read:accounts', 'read:statuses', 'read:favourites', 'read:follows', 'write:statuses', 'write:favourites', 'write:follows'];
export type Db = ReturnType<typeof serviceClient>;
export type Grant = { id: string; client_id: string; user_id: string | null; actor_id: string | null; scopes: string[] };
export const publicClient = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });

export function scopes(value: unknown, fallback = 'read'): string[] {
  if (value !== undefined && typeof value !== 'string') throw new HttpError(400, 'Invalid scope');
  const result = [...new Set((value === undefined ? fallback : value as string).trim().split(/\s+/).filter(Boolean))];
  if (!result.length || result.length > 16 || result.some(scope => !MASTODON_SCOPES.includes(scope))) throw new HttpError(400, 'Unsupported scope');
  return result;
}
export function hasScope(granted: string[], required: string): boolean {
  return granted.includes(required) || granted.includes(required.split(':')[0]) || (['read:follows', 'write:follows'].includes(required) && granted.includes('follow'));
}
export function decimalId(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) throw new HttpError(400, 'Invalid ID');
  return value;
}
export function redirectUri(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\u007f]/.test(value)) throw new HttpError(400, 'Invalid redirect URI');
  let url: URL;
  try { url = new URL(value); } catch { throw new HttpError(400, 'Invalid redirect URI'); }
  const loopback = url.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
  const native = /^[a-z][a-z0-9+.-]{1,63}:$/.test(url.protocol) && !['http:', 'https:', 'javascript:', 'data:', 'file:', 'blob:', 'ftp:', 'mailto:', 'about:', 'urn:', 'vbscript:', 'intent:'].includes(url.protocol) && value.includes('://');
  if (url.username || url.password || url.hash || (!loopback && url.protocol !== 'https:' && !native)) throw new HttpError(400, 'Use HTTPS, loopback HTTP or an app-specific redirect');
  if (url.searchParams.has('code') || url.searchParams.has('state') || url.searchParams.has('error')) throw new HttpError(400, 'Redirect URI contains reserved OAuth parameters');
  return value;
}
export function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function safeHtml(value: unknown, remote = false): string {
  let text = typeof value === 'string' ? value.slice(0,50000) : '';
  if (remote) text = text.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/p\s*>/gi, '\n\n').replace(/<[^>]*>/g, '');
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\r?\n/g, '<br>');
}
export async function parameters(req: Request): Promise<Record<string, unknown>> {
  let raw: string;
  try { raw = await readBody(req, 32768); } catch { throw new HttpError(413, 'Request is too large'); }
  if (req.headers.get('content-type')?.split(';')[0] === 'application/json') {
    try { const body = JSON.parse(raw); if (body && typeof body === 'object' && !Array.isArray(body)) return body; } catch { /* invalid JSON */ }
    throw new HttpError(400, 'Invalid JSON request');
  }
  if (req.headers.get('content-type')?.split(';')[0] !== 'application/x-www-form-urlencoded') throw new HttpError(415, 'Use JSON or URL-encoded form data');
  const body: Record<string, unknown> = Object.create(null);
  for (const [key,value] of new URLSearchParams(raw)) {
    if (key.endsWith('[]')) { const name = key.slice(0,-2); body[name] = [...(Array.isArray(body[name]) ? body[name] as string[] : []), value]; }
    else if (Object.hasOwn(body,key)) throw new HttpError(400, 'Duplicate request parameter');
    else body[key] = value;
  }
  return body;
}
export function response(data: unknown, status = 200, extra: Record<string,string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Pragma': 'no-cache', 'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type, idempotency-key', 'Access-Control-Expose-Headers': 'Link, Retry-After', ...extra } });
}
export async function rpc<T>(db: Db, name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db.rpc(name, args);
  if (error) {
    if (/^PT[45]\d{2}$/.test(error.code)) throw new HttpError(Number(error.code.slice(2)), error.message);
    throw new Error('Database operation failed: '+error.code);
  }
  return data as T;
}
export async function rateLimit(db: Db, key: string, limit: number, seconds = 300) {
  if (!await rpc<boolean>(db, 'mastodon_rate_limit', { p_key: await tokenHash(key), p_limit: limit, p_seconds: seconds })) throw new HttpError(429, 'Too many requests. Try again later.');
}
export function requestIp(req: Request) {
  // Supabase appends the peer address. Never trust the caller's first XFF entry.
  return req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim().slice(0,128) || 'unknown';
}
export async function access(req: Request, db: Db, required?: string, userRequired = false): Promise<{ grant: Grant; hash: string }> {
  const raw = req.headers.get('authorization')?.match(/^Bearer ([0-9a-f]{64})$/i)?.[1];
  if (!raw) throw new HttpError(401, 'Access token required');
  const hash = await tokenHash(raw);
  const grant = await rpc<Grant>(db, 'mastodon_identity', { p_hash: hash, p_scope: required || null });
  if (userRequired && !grant.user_id) throw new HttpError(401, 'User authorization required');
  await rateLimit(db, 'api:'+grant.id, 300);
  return { grant, hash };
}
export function browserOrigin(req: Request) {
  if (req.headers.get('origin') !== getSiteUrl()) throw new HttpError(403, 'Open this page on Nolto');
}
export function mastodonHandler(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') return response(null);
    if (Deno.env.get('MASTODON_CLIENT_ENABLED') !== 'true') return response({ error: 'Mastodon client access is not enabled on this instance' }, 503);
    try { return await handler(req); }
    catch (error) {
      if (error instanceof HttpError) return response({ error: error.message }, error.status, error.status === 429 ? { 'Retry-After': '300' } : {});
      console.error('Mastodon request failed', error instanceof Error ? error.name : 'UnknownError');
      return response({ error: 'The request could not be completed' }, 503);
    }
  };
}
export function instanceInfo(v2 = false, stats: Record<string,number> = {}) {
  const origin = getFederationBaseUrl();
  const common = { title: 'Nolto', version: '4.3.0 (compatible; Nolto)', description: 'Nolto — ett professionellt nätverk i fediversum. Begränsat Mastodon-klientstöd.', languages: ['sv','en'], rules: [],
    configuration: { statuses: { max_characters: 5000, max_media_attachments: 0, characters_reserved_per_url: 23 }, accounts: { max_featured_tags: 0 }, media_attachments: { supported_mime_types: [], image_size_limit: 0, video_size_limit: 0 }, polls: { max_options: 0, max_characters_per_option: 0, min_expiration: 0, max_expiration: 0 } },
    registrations: { enabled: false, approval_required: false, message: 'Skapa ditt konto på Nolto.' },
    nolto: { experimental: true, active_month_basis: 'public_post_authors', capabilities: ['accounts','public_timeline','home_timeline','text_statuses','replies','favourites','follows'], unsupported: ['media_upload','polls','push','streaming','direct_messages','boosts','status_edit','status_delete'] } };
  return v2 ? { ...common, domain: new URL(origin).hostname, source_url: 'https://github.com/Jtensetti/fediverse-career-nexus', usage: { users: { active_month: Number(stats.active_month || 0) } }, thumbnail: { url: origin+'/placeholder.svg' }, contact: { email: '', account: null } }
    : { ...common, uri: new URL(origin).hostname, short_description: common.description, email: '', urls: { streaming_api: null }, stats, thumbnail: origin+'/placeholder.svg', contact_account: null, registrations: false, approval_required: false, invites_enabled: false };
}
