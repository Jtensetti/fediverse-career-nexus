import { decryptMessage } from "../_shared/message-encryption.ts";
import { readKey, readMessage } from "npm:openpgp@6.3.1";
import { serviceClient, jsonResponse } from "../_shared/local-actor.ts";
import { HttpError, postHandler, requestBody, requireUser, uuid } from "../_shared/user-auth.ts";

const columns = "id,sender_id,recipient_id,content,read_at,created_at,is_encrypted,encrypted_content,is_federated,delivery_status,job_conversation_id,encryption_version,sender_key_fingerprint,recipient_key_fingerprint";

async function readable(message: Record<string, any>) {
  if (message.encryption_version === "openpgp-v1") return message;
  const { encrypted_content, ...result } = message;
  if (message.is_encrypted) {
    if (!encrypted_content) throw new Error("Encrypted message has no ciphertext");
    result.content = await decryptMessage(encrypted_content);
  }
  return result;
}

Deno.serve(postHandler(async req => {
  const { user, client } = await requireUser(req);
  const body = await requestBody(req, 98304);
  const { action, messageId, partnerId, before } = body;
  if (action === "send") {
    const recipient = uuid(partnerId, "partnerId");
    const id = uuid(body.id);
    const { encrypted_content, sender_key_fingerprint, recipient_key_fingerprint } = body;
    if ("content" in body || body.sender_id !== user.id || body.recipient_id !== recipient || body.encryption_version !== "openpgp-v1" ||
        typeof encrypted_content !== "string" || encrypted_content.length > 65536) throw new HttpError(400, "End-to-end encryption is required. Update your client.");
    const { data: permission, error } = await client.rpc("can_message_user", { p_sender_id: user.id, p_recipient_id: recipient });
    if (error) throw error;
    if (!permission?.can_message || permission.is_federated) throw new HttpError(403, "Messaging is not permitted");
    let conversation: string | null = null;
    if (body.job_conversation_id !== null && body.job_conversation_id !== undefined) {
      conversation = uuid(body.job_conversation_id, "job_conversation_id");
      const { data, error } = await client.from("job_conversations").select("applicant_id,poster_id").eq("id", conversation).maybeSingle();
      if (error) throw error;
      if (!data || !((data.applicant_id === user.id && data.poster_id === recipient) || (data.poster_id === user.id && data.applicant_id === recipient))) throw new HttpError(403, "Invalid job conversation");
    }
    const { data: keys, error: keyError } = await client.from("message_public_keys").select("user_id,public_key,fingerprint").in("user_id", [user.id, recipient]);
    if (keyError) throw keyError;
    const senderKey = keys?.find(key => key.user_id === user.id);
    const recipientKey = keys?.find(key => key.user_id === recipient);
    if (!senderKey || !recipientKey || senderKey.fingerprint !== sender_key_fingerprint || recipientKey.fingerprint !== recipient_key_fingerprint) {
      throw new HttpError(409, "Both participants need their current message keys");
    }
    try {
      const message = await readMessage({ armoredMessage: encrypted_content });
      const ids = message.getEncryptionKeyIDs().map(key => key.toHex());
      const expected = await Promise.all([senderKey, recipientKey].map(async key =>
        (await (await readKey({ armoredKey: key.public_key })).getEncryptionKey()).getKeyID().toHex()));
      if (ids.length !== 2 || expected.some(id => !ids.includes(id))) throw new Error("Invalid recipients");
    } catch { throw new HttpError(400, "Invalid encrypted message envelope"); }
    const { data: message, error: insertError } = await serviceClient().from("messages").insert({
      id, sender_id: user.id, recipient_id: recipient, content: "", encrypted_content,
      encryption_version: "openpgp-v1", sender_key_fingerprint, recipient_key_fingerprint,
      is_encrypted: true, is_federated: false, delivery_status: "local", job_conversation_id: conversation,
    }).select(columns).single();
    if (insertError) throw insertError;
    return jsonResponse({ message: await readable(message) }, 201);
  }
  if (action === "read") {
    const id = uuid(messageId, "messageId");
    // User-scoped RLS is an independent boundary, in addition to validated filters.
    const { data, error } = await client.from("messages").select(columns).eq("id", id)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(404, "Message not found");
    return jsonResponse({ message: await readable(data) });
  }
  if (action === "list") {
    const partner = uuid(partnerId, "partnerId");
    let query = client.from("messages").select(columns)
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${partner}),and(sender_id.eq.${partner},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(51);
    if (before !== undefined) {
      if (!before || typeof before !== "object" || Array.isArray(before)) throw new HttpError(400, "Invalid cursor");
      const cursor = before as Record<string, unknown>;
      const id = uuid(cursor.id, "cursor id");
      const at = cursor.created_at;
      if (typeof at !== "string" || !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(at) || !Number.isFinite(Date.parse(at))) throw new HttpError(400, "Invalid cursor date");
      query = query.or(`created_at.lt.${at},and(created_at.eq.${at},id.lt.${id})`);
    }
    const { data, error } = await query;
    if (error) throw error;
    const page = (data || []).slice(0, 50);
    const last = page.at(-1);
    const next = (data?.length || 0) > 50 && last ? { id: last.id, created_at: last.created_at } : null;
    return jsonResponse({ messages: (await Promise.all(page.map(readable))).reverse(), next });
  }
  throw new HttpError(400, "Unsupported message action");
}));
