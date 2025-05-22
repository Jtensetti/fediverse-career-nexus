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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
      case 'warn':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
      case 'fail':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return <CircleCheck className="h-4 w-4 text-green-600" />;
      case 'degraded':
      case 'warn':
      case 'unhealthy':
      case 'fail':
        return <CircleAlert className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-display text-bondy-primary">System Health</CardTitle>
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
          <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
            Failed to load health status. Please try again.
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-500">Database</span>
                <Badge variant="outline" className={getStatusColor(data.checks.database.status)}>
                  {data.checks.database.status === 'pass' ? 'Connected' : 
                   data.checks.database.status === 'warn' ? 'Slow' : 'Error'}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                Latency: {data.checks.database.latency_ms}ms
                {data.checks.database.message && (
                  <div className="text-xs mt-1 text-gray-500">{data.checks.database.message}</div>
                )}
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-500">Queue Depth</span>
                <Badge variant="outline" className={getStatusColor(data.checks.queue.status)}>
                  {data.checks.queue.status === 'pass' ? 'Normal' : 
                   data.checks.queue.status === 'warn' ? 'High' : 'Critical'}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                {data.checks.queue.pending_count} / {data.checks.queue.max_allowed} messages
                {data.checks.queue.message && (
                  <div className="text-xs mt-1 text-gray-500">{data.checks.queue.message}</div>
                )}
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              Last checked: {new Date(data.timestamp).toLocaleString()}
            </div>
            
            <div className="text-xs text-gray-500">
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
          className="w-full text-bondy-accent hover:text-bondy-accent border-bondy-accent/30"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </CardFooter>
    </Card>
  );
}
