import { encryptMessage, decryptMessage } from "../_shared/message-encryption.ts";
import { serviceClient, jsonResponse } from "../_shared/local-actor.ts";
import { HttpError, postHandler, requestBody, requireUser, uuid } from "../_shared/user-auth.ts";

const columns = "id,sender_id,recipient_id,content,read_at,created_at,is_encrypted,encrypted_content,is_federated,delivery_status";

async function readable(message: Record<string, any>) {
  const { encrypted_content, ...result } = message;
  if (message.is_encrypted) {
    if (!encrypted_content) throw new Error("Encrypted message has no ciphertext");
    result.content = await decryptMessage(encrypted_content);
  }
  return result;
}

Deno.serve(postHandler(async req => {
  const { user, client } = await requireUser(req);
  const { action, messageId, content, partnerId, before, jobConversationId } = await requestBody(req);
  if (action === "send") {
    const recipient = uuid(partnerId, "partnerId");
    if (typeof content !== "string" || !content.trim() || new TextEncoder().encode(content).length > 10000) {
      throw new HttpError(400, "A message must contain between 1 and 10000 bytes");
    }
    const { data: permission, error } = await client.rpc("can_message_user", { p_sender_id: user.id, p_recipient_id: recipient });
    if (error) throw error;
    if (!permission?.can_message || permission.is_federated) throw new HttpError(403, "Messaging is not permitted");
    let conversation: string | null = null;
    if (jobConversationId !== undefined) {
      conversation = uuid(jobConversationId, "jobConversationId");
      const { data, error } = await client.from("job_conversations").select("applicant_id,poster_id").eq("id", conversation).maybeSingle();
      if (error) throw error;
      if (!data || !((data.applicant_id === user.id && data.poster_id === recipient) || (data.poster_id === user.id && data.applicant_id === recipient))) throw new HttpError(403, "Invalid job conversation");
    }
    // Encryption failure aborts delivery. Never fall back to storing plaintext.
    const encrypted = await encryptMessage(content);
    const { data: message, error: insertError } = await serviceClient().from("messages").insert({
      sender_id: user.id, recipient_id: recipient, content: "", encrypted_content: encrypted,
      is_encrypted: true, is_federated: false, delivery_status: "local", job_conversation_id: conversation,
    }).select(columns).single();
    if (insertError) throw insertError;
    return jsonResponse({ message: await readable(message) }, 201);
  }
  if (action === "decrypt") {
    const id = uuid(messageId, "messageId");
    // User-scoped RLS is an independent boundary, in addition to validated filters.
    const { data, error } = await client.from("messages").select(columns).eq("id", id)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(404, "Message not found");
    return jsonResponse({ content: (await readable(data)).content });
  }
  if (action === "decrypt-batch") {
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
