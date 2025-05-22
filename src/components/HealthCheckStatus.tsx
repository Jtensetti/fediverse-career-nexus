
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

interface HealthCheckData {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  traceId?: string;
  checks: {
    database: {
      status: "pass" | "warn" | "fail";
      latency_ms: number;
      message?: string;
    };
    queue: {
      status: "pass" | "warn" | "fail";
      pending_count: number;
      max_allowed: number;
      message?: string;
    };
  };
}

const HealthCheckStatus = () => {
  const [lastTraceId, setLastTraceId] = useState<string | null>(null);

  const { data: healthData, isLoading, error, refetch } = useQuery({
    queryKey: ["healthCheck"],
    queryFn: async () => {
      try {
        const { data, error, headers } = await supabase.functions.invoke("healthz");
        
        if (error) throw new Error(error.message);
        
        // Store the trace ID if available from response
        const traceId = headers?.get("X-Trace-ID") || (data as any)?.traceId;
        if (traceId) {
          setLastTraceId(traceId);
        }
        
        return data as HealthCheckData;
      } catch (err: any) {
        console.error("Health check failed:", err);
        throw err;
      }
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Health check refreshed",
        description: "The latest system health data has been fetched.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to refresh health data",
        description: err.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "pass" || status === "healthy") {
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    } else if (status === "warn" || status === "degraded") {
      return <AlertTriangle className="h-6 w-6 text-amber-500" />;
    } else {
      return <AlertCircle className="h-6 w-6 text-red-500" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">System Health</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ) : error ? (
          <div className="flex items-center space-x-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to fetch health data</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(healthData?.status || "unhealthy")}
                <span className="font-medium">
                  Overall: {healthData?.status || "unknown"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {healthData?.timestamp
                  ? new Date(healthData.timestamp).toLocaleString()
                  : ""}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(healthData?.checks.database.status || "fail")}
                  <span>Database</span>
                </div>
                <span className="text-sm">
                  {healthData?.checks.database.latency_ms}ms
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(healthData?.checks.queue.status || "fail")}
                  <span>Queue</span>
                </div>
                <span className="text-sm">
                  {healthData?.checks.queue.pending_count} / {healthData?.checks.queue.max_allowed}
                </span>
              </div>
              
              {lastTraceId && (
                <div className="pt-2 text-xs text-muted-foreground">
                  Trace ID: {lastTraceId}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthCheckStatus;
