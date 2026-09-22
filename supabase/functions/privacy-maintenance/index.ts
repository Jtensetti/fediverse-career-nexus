import { serviceClient, jsonResponse } from '../_shared/local-actor.ts';
import { workerHandler } from '../_shared/user-auth.ts';
import { archiveDeletedMedia, encryptedDeletionSnapshot, RETENTION_BUCKET } from '../_shared/deletion.ts';

Deno.serve(workerHandler(async () => {
  const db = serviceClient(10000);
  const started = Date.now();
  const { data: lease, error: leaseError } = await db.rpc('claim_privacy_worker');
  if (leaseError) throw leaseError;
  if (!lease) return jsonResponse({ busy: true });
  const result = { archived: 0, hidden_content: 0, purged: 0, discarded_images: 0, deferred: 0, failed: 0 };
  // Each API call is bounded. Stop starting work well before the two-minute lease expires.
  const hasTime = () => Date.now() - started < 40000;
  try {
    const { data: requests, error } = await db.rpc('claim_deletion_requests', { p_limit: 1 });
    if (error) throw error;
    for (const request of requests || []) {
      let complete = false;
      let failed = false;
      try {
        const { data: files, error } = await db.rpc('list_purge_media', { p_request_id: request.id })
          .order('request_id').order('object_id').limit(10);
        if (error) throw error;
        for (const file of files || []) {
          if (!hasTime()) break;
          const { error: sourceError } = await db.storage.from(file.bucket_id).remove([file.name]);
          if (sourceError) throw sourceError;
          // Also removes an archive uploaded just before a previous worker crashed.
          const { error: archiveError } = await db.storage.from(RETENTION_BUCKET).remove([`${file.request_id}/${file.object_id}.bin`]);
          if (archiveError) throw archiveError;
          const { error: marked } = await db.from('deletion_media').delete().eq('bucket_id', file.bucket_id).eq('name', file.name);
          if (marked) throw marked;
        }
        const { data: remaining, error: readError } = await db.rpc('list_purge_media', { p_request_id: request.id }).limit(1);
        if (readError) throw readError;
        if (remaining?.length || !hasTime()) continue;
        if (request.kind === 'account') {
          const { data: leftovers, error } = await db.rpc('list_deletion_owned_files', { p_owner_id: request.owner_id })
            .order('bucket_id').order('name').limit(10);
          if (error) throw error;
          for (const file of leftovers || []) {
            if (!hasTime()) break;
            const { error } = await db.storage.from(file.bucket_id).remove([file.name]);
            if (error) throw error;
          }
          const { data: remaining, error: readError } = await db.rpc('list_deletion_owned_files', { p_owner_id: request.owner_id }).limit(1);
          if (readError) throw readError;
          if (remaining?.length || !hasTime()) continue;
          const { error: deleted } = await db.auth.admin.deleteUser(request.owner_id);
          if (deleted && deleted.status !== 404) throw deleted;
          const { error: cleared } = await db.from('deletion_requests').delete().eq('owner_id', request.owner_id);
          if (cleared) throw cleared;
        } else {
          const { error } = await db.rpc('finish_content_deletion', { p_request_id: request.id, p_lease_id: request.lease_id });
          if (error) throw error;
        }
        complete = true;
        result.purged++;
      } catch {
        failed = true;
        result.failed++;
      } finally {
        if (!complete) {
          if (!failed) result.deferred++;
          const { error } = await db.from('deletion_requests').update({ state: 'pending', last_error: failed ? 'purge_failed' : null })
            .eq('id', request.id).eq('lease_id', request.lease_id);
          if (error) throw error;
        }
      }
    }
    if (hasTime()) {
      const { data: accounts, error } = await db.from('deletion_requests').select('id,owner_id').eq('kind', 'account').eq('auth_banned', false).limit(2);
      if (error) throw error;
      for (const account of accounts || []) {
        if (!hasTime()) break;
        const { error } = await db.auth.admin.updateUserById(account.owner_id, { ban_duration: '876000h' });
        if (error) { result.failed++; continue; }
        const { error: marked } = await db.from('deletion_requests').update({ auth_banned: true }).eq('id', account.id);
        if (marked) throw marked;
      }
    }
    if (hasTime()) {
      const { data: content, error } = await db.rpc('pending_account_content', { p_limit: 5 });
      if (error) throw error;
      for (const row of content || []) {
        if (!hasTime()) break;
        const { error } = await db.rpc('schedule_content_deletion', { p_kind: row.kind, p_id: row.id, p_owner_id: row.owner_id,
          p_updated_at: row.updated_at, p_encrypted_payload: await encryptedDeletionSnapshot(row.kind, row.id, row.snapshot), p_files: [] });
        if (error) result.failed++; else result.hidden_content++;
      }
    }
    if (hasTime()) {
      const { data: files, error } = await db.from('deletion_media').select('*').eq('source_removed', false)
        .or(`last_attempt_at.is.null,last_attempt_at.lt.${new Date(Date.now() - 300000).toISOString()}`)
        .order('last_attempt_at', { nullsFirst: true }).order('request_id').limit(10);
      if (error) throw error;
      for (const file of files || []) {
        if (!hasTime()) break;
        const { error: attempted } = await db.from('deletion_media').update({ last_attempt_at: new Date().toISOString() })
          .eq('bucket_id', file.bucket_id).eq('name', file.name);
        if (attempted) throw attempted;
        try { await archiveDeletedMedia(file); result.archived++; }
        catch { result.failed++; }
      }
    }
    if (hasTime()) {
      const { data: images, error } = await db.rpc('claim_post_image_cleanup', { p_limit: 10 });
      if (error) throw error;
      for (const image of images || []) {
        if (!hasTime()) break;
        const { error: removed } = await db.storage.from('posts').remove([image.storage_path]);
        if (removed) { result.failed++; continue; }
        const { error: finished } = await db.rpc('finish_post_image_cleanup', { p_id: image.id });
        if (finished) throw finished;
        result.discarded_images++;
      }
    }
    if (hasTime()) {
      const { error } = await db.rpc('purge_expired_private_metadata');
      if (error) throw error;
    }
    return jsonResponse(result, result.failed ? 503 : 200);
  } finally {
    const { error } = await db.from('privacy_worker_lease').delete().eq('lease_id', lease);
    if (error) console.error('Privacy worker lease release failed');
  }
}));
