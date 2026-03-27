
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CircleCheck, CircleAlert, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  traceId: string;
  checks: {
    database: {
      status: 'pass' | 'warn' | 'fail';
      latency_ms: number;
      message?: string;
    };
    queue: {
      status: 'pass' | 'warn' | 'fail';
      pending_count: number;
      max_allowed: number;
      message?: string;
    };
  };
}

export default function HealthCheckStatus() {
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  const fetchHealthStatus = async (): Promise<HealthStatus> => {
    try {
      // Use standard fetch API instead of directly accessing the protected url property
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/healthz`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch health status');
      }
      
      const data = await response.json();
      const traceId = response.headers.get('X-Trace-ID') || data.traceId || 'unknown';
      
      return { ...data, traceId };
    } catch (error) {
      console.error('Error fetching health data:', error);
      throw error;
    }
  };
  
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['healthStatus'],
    queryFn: fetchHealthStatus,
    refetchInterval: 60000, // Refresh every minute
  });
  
  useEffect(() => {
    if (!isFetching && data) {
      setLastRefresh(new Date());
    }
  }, [data, isFetching]);
  
  const handleRefresh = () => {
    refetch();
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return 'bg-success/10 text-success border-success/20';
      case 'degraded':
      case 'warn':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'unhealthy':
      case 'fail':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return <CircleCheck className="h-4 w-4 text-success" />;
      case 'degraded':
      case 'warn':
        return <CircleAlert className="h-4 w-4 text-warning" />;
      case 'unhealthy':
      case 'fail':
        return <CircleAlert className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-display text-primary">System Health</CardTitle>
          {data && (
            <Badge variant="outline" className={`${getStatusColor(data.status)}`}>
              <span className="flex items-center gap-1">
                {getStatusIcon(data.status)}
                {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
              </span>
            </Badge>
          )}
        </div>
        <CardDescription>
          Monitor the health of the system components
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : error ? (
          <div className="p-4 border border-destructive/20 bg-destructive/10 text-destructive rounded-md">
            Failed to load health status. Please try again.
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-muted-foreground">Database</span>
                <Badge variant="outline" className={getStatusColor(data.checks.database.status)}>
                  {data.checks.database.status === 'pass' ? 'Connected' : 
                   data.checks.database.status === 'warn' ? 'Slow' : 'Error'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Latency: {data.checks.database.latency_ms}ms
                {data.checks.database.message && (
                  <div className="text-xs mt-1 text-muted-foreground/70">{data.checks.database.message}</div>
                )}
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-muted-foreground">Queue Depth</span>
                <Badge variant="outline" className={getStatusColor(data.checks.queue.status)}>
                  {data.checks.queue.status === 'pass' ? 'Normal' : 
                   data.checks.queue.status === 'warn' ? 'High' : 'Critical'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {data.checks.queue.pending_count} / {data.checks.queue.max_allowed} messages
                {data.checks.queue.message && (
                  <div className="text-xs mt-1 text-muted-foreground/70">{data.checks.queue.message}</div>
                )}
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Last checked: {new Date(data.timestamp).toLocaleString()}
            </div>
            
            <div className="text-xs text-muted-foreground">
              Trace ID: {data.traceId}
            </div>
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isLoading || isFetching}
          className="w-full text-primary hover:text-primary/80 border-primary/30"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </CardFooter>
    </Card>
  );
}
