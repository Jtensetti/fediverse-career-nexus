export const PROFILE_FIELDS = ['name', 'headline', 'location', 'bio', 'profileUrl', 'handle', 'email', 'phone', 'website', 'experience', 'education', 'skills'] as const;
export type ProfileField = typeof PROFILE_FIELDS[number];
export type SharedProfile = Partial<Record<ProfileField, string | Record<string, unknown>[] | string[]>>;

export function profileShareRequest(search: string) {
  const params = new URLSearchParams(search);
  const rawOrigin = params.get('origin') || '';
  const origin = new URL(rawOrigin);
  if (origin.origin !== rawOrigin || origin.username || origin.password || (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)))) throw new Error('Ogiltig mottagaradress.');
  const request = params.get('request') || '';
  if (!/^[a-f0-9]{32}$/.test(request)) throw new Error('Ogiltig förfrågan.');
  const fields = [...new Set((params.get('fields') || '').split(','))];
  if (!fields.length || fields.some(field => !(PROFILE_FIELDS as readonly string[]).includes(field))) throw new Error('Okända profilfält.');
  return { origin: origin.origin, request, fields: fields as ProfileField[] };
}

export function selectedProfile(profile: SharedProfile, requested: ProfileField[], selected: Set<ProfileField>): SharedProfile {
  return Object.fromEntries(requested.filter(field => selected.has(field) && profile[field] !== undefined).map(field => [field, profile[field]]));
}
