import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { encryptMessage, decryptMessage } from "../_shared/message-encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, messageId, content, partnerId } = body;

    if (action === "encrypt") {
      // Encrypt a message content (used when sending)
      if (!content) {
        return new Response(
          JSON.stringify({ error: "Missing content" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const encryptedContent = await encryptMessage(content);
      
      return new Response(
        JSON.stringify({ encryptedContent }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "decrypt") {
      // Decrypt a single message by ID
      if (!messageId) {
        return new Response(
          JSON.stringify({ error: "Missing messageId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch the message and verify the user has access
      const { data: message, error: fetchError } = await supabaseClient
        .from("messages")
        .select("*")
        .eq("id", messageId)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .single();

      if (fetchError || !message) {
        return new Response(
          JSON.stringify({ error: "Message not found or access denied" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If not encrypted, return as-is
      if (!message.is_encrypted || !message.encrypted_content) {
        return new Response(
          JSON.stringify({ content: message.content }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Decrypt the content
      const decryptedContent = await decryptMessage(message.encrypted_content);
      
      return new Response(
        JSON.stringify({ content: decryptedContent }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "decrypt-batch") {
      // Decrypt multiple messages for a conversation
      if (!partnerId) {
        return new Response(
          JSON.stringify({ error: "Missing partnerId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch messages between the user and partner
      const { data: messages, error: fetchError } = await supabaseClient
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch messages" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Decrypt each encrypted message
      const decryptedMessages = await Promise.all(
        (messages || []).map(async (msg) => {
          if (msg.is_encrypted && msg.encrypted_content) {
            try {
              const decryptedContent = await decryptMessage(msg.encrypted_content);
              return { ...msg, content: decryptedContent };
            } catch (error) {
              console.error(`Failed to decrypt message ${msg.id}:`, error);
              return { ...msg, content: "[Decryption failed]" };
            }
          }
          return msg;
        })
      );

      return new Response(
        JSON.stringify({ messages: decryptedMessages }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in encrypt-message:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
