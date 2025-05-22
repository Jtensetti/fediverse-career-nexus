
import { supabase } from "@/integrations/supabase/client";

export interface FederationMetricsByHost {
  remote_host: string;
  total_requests: number;
  success_percent: number;
  median_latency_ms: number;
  failed_requests: number;
}

export interface RateLimitedHost {
  remote_host: string;
  request_count: number;
  latest_request: string;
}

export interface FederationSummary {
  total_requests: number;
  successful_requests: number;
  success_percent: string;
  median_latency_ms: number;
  window_start: string;
  window_end: string;
}

/**
 * Get federation metrics by host
 */
export const getMetricsByHost = async (limit = 10): Promise<FederationMetricsByHost[]> => {
  try {
    const { data, error } = await supabase.functions.invoke("analytics", {
      body: { action: "getMetricsByHost", limit }
    });
    
    if (error) {
      console.error("Error fetching metrics by host:", error);
      return [];
    }
    
    return data.hosts;
  } catch (error) {
    console.error("Error in getMetricsByHost:", error);
    return [];
  }
};

/**
 * Get top failing hosts
 */
export const getTopFailingHosts = async (limit = 10): Promise<FederationMetricsByHost[]> => {
  try {
    const { data, error } = await supabase.functions.invoke("analytics", {
      body: { action: "getTopFailingHosts", limit }
    });
    
    if (error) {
      console.error("Error fetching top failing hosts:", error);
      return [];
    }
    
    return data.hosts;
  } catch (error) {
    console.error("Error in getTopFailingHosts:", error);
    return [];
  }
};

/**
 * Get rate limited hosts
 */
export const getRateLimitedHosts = async (timeframe = '24h'): Promise<RateLimitedHost[]> => {
  try {
    const { data, error } = await supabase.functions.invoke("analytics", {
      body: { action: "getRateLimitedHosts", timeframe }
    });
    
    if (error) {
      console.error("Error fetching rate limited hosts:", error);
      return [];
    }
    
    return data.hosts;
  } catch (error) {
    console.error("Error in getRateLimitedHosts:", error);
    return [];
  }
};

/**
 * Get federation summary
 */
export const getFederationSummary = async (timeframe = '24h'): Promise<FederationSummary | null> => {
  try {
    const { data, error } = await supabase.functions.invoke("analytics", {
      body: { action: "getSummary", timeframe }
    });
    
    if (error) {
      console.error("Error fetching federation summary:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error in getFederationSummary:", error);
    return null;
  }
};
