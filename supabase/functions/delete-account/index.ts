import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/validate.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user identity
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleting account for user: ${user.id}`);

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Find user's actor(s)
    const { data: actors } = await adminClient
      .from('actors')
      .select('id')
      .eq('user_id', user.id);

    const actorIds = actors?.map(a => a.id) ?? [];

    if (actorIds.length > 0) {
      // 2. Clear federation queue for these actors
      await adminClient
        .from('federation_queue_partitioned')
        .delete()
        .in('actor_id', actorIds);

      // 3. Detach ap_objects from actors to prevent the queue_delete_for_federation
      //    trigger from trying to re-insert into federation_queue after actor is gone
      await adminClient
        .from('ap_objects')
        .update({ attributed_to: null, type: 'Tombstone' })
        .in('attributed_to', actorIds);

      // 4. Clean up other actor-linked tables
      for (const actorId of actorIds) {
        await Promise.all([
          adminClient.from('inbox_items').delete().eq('recipient_id', actorId),
          adminClient.from('actor_followers').delete().eq('local_actor_id', actorId),
          adminClient.from('outgoing_follows').delete().eq('local_actor_id', actorId),
          adminClient.from('follower_batches').delete().eq('actor_id', actorId),
          adminClient.from('activities').delete().eq('actor_id', actorId),
        ]);
      }
    }

    // 5. Clean up tables referencing user via connected_user_id (not covered by FK cascade)
    await adminClient
      .from('user_connections')
      .delete()
      .eq('connected_user_id', user.id);

    // 6. Clean up messages where user is recipient (sender_id cascades, but recipient might not)
    await adminClient
      .from('messages')
      .delete()
      .eq('recipient_id', user.id);

    // 7. Now delete the auth user — cascade handles profiles, posts, reactions, etc.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error('Delete error:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete account', details: deleteError.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully deleted user: ${user.id}`);

    return new Response(
      JSON.stringify({ success: true }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
