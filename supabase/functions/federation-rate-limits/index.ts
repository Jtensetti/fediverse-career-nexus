
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

// Define CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Handle rate limit status for a given host
async function getRateLimitStatus(supabase, host, windowMinutes = 10) {
  // Calculate window start time
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  
  try {
    // Get count of requests within window
    const { count, error: countError } = await supabase
      .from('federation_request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('remote_host', host)
      .gte('timestamp', windowStart);
    
    if (countError) {
      console.error('Error checking rate limit:', countError);
      throw countError;
    }
    
    // Get recent requests for detailed view
    const { data, error } = await supabase
      .from('federation_request_logs')
      .select('*')
      .eq('remote_host', host)
      .gte('timestamp', windowStart)
      .order('timestamp', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error fetching request logs:', error);
      throw error;
    }
    
    return {
      count: count || 0,
      requests: data
    };
  } catch (error) {
    console.error('Error in rate limit check:', error);
    throw error;
  }
}

// Clear rate limit logs for a host
async function clearRateLimitLogs(supabase, host) {
  try {
    const { error } = await supabase
      .from('federation_request_logs')
      .delete()
      .eq('remote_host', host);
    
    if (error) {
      console.error('Error clearing rate limit logs:', error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in clearing logs:', error);
    throw error;
  }
}

// Get rate limited hosts that exceed threshold
async function getRateLimitedHosts(supabase, requestThreshold, windowMinutes = 10) {
  try {
    const { data, error } = await supabase.rpc('get_rate_limited_hosts', {
      window_start: new Date(Date.now() - windowMinutes * 60 * 1000).toISOString(),
      request_threshold: requestThreshold
    });
    
    if (error) {
      console.error('Error fetching rate limited hosts:', error);
      throw error;
    }
    
    return {
      hosts: data.map(item => ({
        remote_host: item.remote_host,
        request_count: item.request_count,
        latest_request: item.latest_request
      }))
    };
  } catch (error) {
    console.error('Error processing rate limited hosts:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const { action, host, windowMinutes, requestThreshold } = await req.json();
    
    let result;
    
    // Check if user has admin or moderator permissions
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check if user is admin or moderator (for sensitive operations)
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'moderator'])
      .single();
    
    const isAuthorized = roleData !== null;
    
    // Handle different actions
    switch (action) {
      case 'getStatus':
        // Allow status check for any authenticated user
        result = await getRateLimitStatus(supabase, host, windowMinutes);
        break;
        
      case 'clearLogs':
        // Only allow admins/moderators to clear logs
        if (!isAuthorized) {
          return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await clearRateLimitLogs(supabase, host);
        break;
        
      case 'getLimitedHosts':
        // Only allow admins/moderators to view all rate limited hosts
        if (!isAuthorized) {
          return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await getRateLimitedHosts(supabase, requestThreshold, windowMinutes);
        break;
        
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    
    // Return successful response with results
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
