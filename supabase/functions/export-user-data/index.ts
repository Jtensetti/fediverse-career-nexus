import { jsonResponse } from "../_shared/local-actor.ts";
import { postHandler, requireUser, HttpError } from "../_shared/user-auth.ts";
import { decryptMessage } from "../_shared/message-encryption.ts";
import { collectPages } from "../_shared/export-pagination.ts";
import { exportScopes } from "../_shared/export-scopes.ts";

Deno.serve(postHandler(async req => {
  const { user, client } = await requireUser(req);
  const startedAt = new Date().toISOString();
  const records: Record<string, any[]> = {};
  let bytes = 0;
  const consumePage = (page: unknown[]) => {
    bytes += new TextEncoder().encode(JSON.stringify(page)).byteLength;
    if (bytes > 20 * 1024 * 1024) throw new HttpError(413, "This account requires an assisted export. Contact jtensetti@protonmail.com.");
  };
  for (const scope of exportScopes) {
    records[scope.table] = await collectPages((from, to) => {
      let query = client.from(scope.table).select(scope.columns, { count: "exact" })
        .or(scope.owners.map(column => `${column}.eq.${user.id}`).join(","));
      if (scope.columns.split(",").includes("created_at")) query = query.lte("created_at", startedAt);
      return query.order("id").range(from, to);
    }, 50000, consumePage);
  }
  const actorIds = records.actors.map(row => row.id);
  for (const [table, key] of [["ap_objects", "attributed_to"], ["actor_followers", "local_actor_id"], ["outgoing_follows", "local_actor_id"]]) {
    records[table] = actorIds.length ? await collectPages((from, to) => client.from(table).select("*", { count: "exact" })
      .in(key, actorIds).order("id").range(from, to), 50000, consumePage) : [];
  }
  const skillIds = records.skills.map(row => row.id);
  records.skill_endorsements = await collectPages((from, to) => client.from("skill_endorsements").select("*", { count: "exact" })
    .or(`endorser_id.eq.${user.id}${skillIds.length ? `,skill_id.in.(${skillIds.join(",")})` : ""}`).order("id").range(from, to), 50000, consumePage);
  for (const message of records.messages) {
    if (message.encryption_version === 'openpgp-v1') continue;
    if (message.is_encrypted) message.content = await decryptMessage(message.encrypted_content);
    delete message.encrypted_content;
  }
  const files = await collectPages<{ id: string; bucket_id: string; name: string }>((from, to) => client.rpc("list_own_storage_objects", {}, { count: "exact" }).order("id").range(from, to), 50000, consumePage);
  const archive = {
    schema: "nolto-account-export/1", started_at: startedAt, completed_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at, email_confirmed_at: user.email_confirmed_at },
    records, files,
    scope: {
      included: "Account profile, authored content, messages (new private messages remain end-to-end encrypted), relationships, preferences and uploaded file metadata",
      excluded: ["File contents (download separately)", "Passwords, signing keys and authentication tokens", "Internal security logs and other users' confidential data"],
      portability: "This JSON archive is a Nolto data export, not a Mastodon import file or a database backup.",
    },
  };
  if (new TextEncoder().encode(JSON.stringify(archive)).byteLength > 20 * 1024 * 1024) {
    throw new HttpError(413, "This account requires an assisted export. Contact jtensetti@protonmail.com.");
  }
  return jsonResponse(archive);
}));
