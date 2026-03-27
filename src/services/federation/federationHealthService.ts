import { supabase } from "@/integrations/supabase/client";

export interface FederationHealth {
  total_pending: number;
  total_processing: number;
  total_failed: number;
  oldest_pending_age_minutes: number;
  avg_processing_time_ms: number;
}

export interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  activeEntries: number;
  totalHits: number;
  averageHitsPerEntry: string;
}

export interface InstanceHealth {
  host: string;
  health_score: number;
  request_count_24h: number;
  error_count_24h: number;
  last_seen_at: string;
  status: string;
}

/**
 * Get federation queue health metrics
 */
export const getFederationHealth = async (): Promise<FederationHealth | null> => {
  try {
    const { data, error } = await supabase.rpc("get_federation_health");
    
    if (error) {
      console.error("Error fetching federation health:", error);
      return null;
    }
    
    return data?.[0] || null;
  } catch (error) {
    console.error("Error in getFederationHealth:", error);
    return null;
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async (): Promise<CacheStats | null> => {
  try {
    const { data, error } = await supabase.functions.invoke("cache-manager", {
      body: { action: "stats" }
    });
    
    if (error) {
      console.error("Error fetching cache stats:", error);
      return null;
    }
    
    return data?.stats || null;
  } catch (error) {
    console.error("Error in getCacheStats:", error);
    return null;
  }
};

/**
 * Get instance health data
 */
export const getInstanceHealth = async (limit = 20): Promise<InstanceHealth[]> => {
  try {
    const { data, error } = await supabase
      .from("remote_instances")
      .select("host, health_score, request_count_24h, error_count_24h, last_seen_at, status")
      .order("request_count_24h", { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error("Error fetching instance health:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getInstanceHealth:", error);
    return [];
  }
};

/**
 * Run cleanup scheduler
 */
export const runCleanup = async (dryRun = false) => {
  try {
    const { data, error } = await supabase.functions.invoke("cleanup-scheduler", {
      body: { dryRun }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error running cleanup:", error);
    throw error;
  }
};

/**
 * Pre-warm popular actor caches
 */
export const prewarmCache = async () => {
  try {
    const { data, error } = await supabase.functions.invoke("cache-manager", {
      body: { action: "prewarm" }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error pre-warming cache:", error);
    throw error;
  }
};

/**
 * Check if a host is rate limited
 */
export const checkHostRateLimit = async (remoteHost: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc("check_host_rate_limit", {
      p_remote_host: remoteHost
    });
    
    if (error) {
      console.error("Error checking rate limit:", error);
      return true; // Allow by default on error
    }
    
    return data;
  } catch (error) {
    console.error("Error in checkHostRateLimit:", error);
    return true;
  }
};
