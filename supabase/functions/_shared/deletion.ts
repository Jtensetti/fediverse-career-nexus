import { encryptValue, encryptRetainedFile } from './encryption.ts';
import { serviceClient } from './local-actor.ts';

export const RETENTION_DAYS = 30;
export const RETENTION_BUCKET = 'retained-deletions';
export const mediaBuckets = new Set(['avatars', 'posts', 'articles', 'article-covers', 'article-images', 'company-assets']);

export function retentionSecret(): string {
  const secret = Deno.env.get('RETENTION_ENCRYPTION_KEY');
  if (!secret || secret.length < 32) throw new Error('RETENTION_ENCRYPTION_KEY must contain at least 32 random characters');
  return secret;
}

export function ownedMediaReferences(value: unknown, origin: string): { bucket: string; name: string }[] {
  const matches = JSON.stringify(value).match(/https:\/\/[^\s"'<>\\]+/g) || [];
  const paths = new Map<string, { bucket: string; name: string }>();
  for (const match of matches) {
    try {
      const url = new URL(match.replace(/&amp;/g, '&'));
      if (url.origin !== new URL(origin).origin) continue;
      const path = url.pathname.replace(/^\/(?:storage\/v1\/object\/public|functions\/v1\/public-media)\//, '');
      if (path === url.pathname) continue;
      const [bucket, ...parts] = path.split('/');
      const name = parts.map(decodeURIComponent).join('/');
      if (!mediaBuckets.has(bucket) || !name || name.length > 1024 || name.split('/').some(part => ['.', '..', ''].includes(part))) continue;
      paths.set(`${bucket}/${name}`, { bucket, name });
    } catch { /* External or malformed URLs are not storage deletion targets. */ }
  }
  return [...paths.values()];
}

export function contentMediaReferences(kind: string, row: Record<string, any>, origin: string) {
  if (kind === 'post') {
    const object = row.content?.type === 'Create' ? row.content.object : row.content;
    return ownedMediaReferences([object?.attachment, object?.image], origin);
  }
  if (kind === 'article') {
    const images = [...String(row.content || '').matchAll(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/gi)].map(match => match[2]);
    return ownedMediaReferences([row.cover_image_url, ...images], origin);
  }
  return [];
}

export async function encryptedDeletionSnapshot(kind: string, id: string, row: unknown) {
  return encryptValue(JSON.stringify({ schema: 'nolto-retention/1', kind, id, row }), retentionSecret(), 'retention');
}

export async function archiveDeletedMedia(file: { bucket_id: string; name: string; object_id: string; request_id: string; archived_path?: string | null }) {
  const db = serviceClient(10000);
  const archivePath = `${file.request_id}/${file.object_id}.bin`;
  if (!file.archived_path) {
    const { data: info, error: infoError } = await db.storage.from(file.bucket_id).info(file.name);
    if (infoError || !info) throw infoError || new Error('File metadata unavailable');
    if (typeof info.size !== 'number' || info.size > 25 * 1024 * 1024) throw new Error('Retained file needs assisted processing');
    const { data: bytes, error } = await db.storage.from(file.bucket_id).download(file.name);
    if (error || !bytes) throw error || new Error('File download failed');
    if (bytes.size > 25 * 1024 * 1024) throw new Error('Retained file needs assisted processing');
    const ciphertext = await encryptRetainedFile(new Uint8Array(await bytes.arrayBuffer()), retentionSecret(), archivePath);
    const { error: uploadError } = await db.storage.from(RETENTION_BUCKET).upload(archivePath, ciphertext,
      { upsert: true, contentType: 'application/octet-stream', cacheControl: '0' });
    if (uploadError) throw uploadError;
    const { error: marked } = await db.from('deletion_media').update({ archived_path: archivePath })
      .eq('bucket_id', file.bucket_id).eq('name', file.name).eq('object_id', file.object_id);
    if (marked) throw marked;
  }
  // A retry after upload/marking still removes the original; these are separate APIs.
  const { error: removed } = await db.storage.from(file.bucket_id).remove([file.name]);
  if (removed) throw removed;
  const { error: marked } = await db.from('deletion_media').update({ source_removed: true })
    .eq('bucket_id', file.bucket_id).eq('name', file.name).eq('object_id', file.object_id);
  if (marked) throw marked;
}
