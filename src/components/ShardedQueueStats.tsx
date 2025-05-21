
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RefreshCw, Play, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

interface QueueStats {
  partition_key: number;
  total_count: number;
  pending_count: number;
  processing_count: number;
  failed_count: number;
  processed_count: number;
}

const ShardedQueueStats = () => {
  const [isRunningCoordinator, setIsRunningCoordinator] = useState(false);

  // Fetch queue statistics
  const { data: queueStats, isLoading, refetch } = useQuery({
    queryKey: ["queueStats"],
    queryFn: async () => {
      // Using direct SQL query instead of rpc to avoid TypeScript issues
      const { data, error } = await supabase
        .from('federation_queue_stats')
        .select('*');
      
      if (error) throw new Error(error.message);
      return data as QueueStats[];
    }
  });

  // Mutation to migrate data from old queue to partitioned queue
  const migrateQueueMutation = useMutation({
    mutationFn: async () => {
      // Using a direct SQL query with custom function call
      const { data, error } = await supabase.rpc("migrate_federation_queue_data");
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (count) => {
      toast({
        title: "Queue data migration successful",
        description: `${count} items migrated to the partitioned queue.`
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Migration failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation to run the federation coordinator
  const runCoordinatorMutation = useMutation({
    mutationFn: async () => {
      setIsRunningCoordinator(true);
      const { data, error } = await supabase.functions.invoke("federation-coordinator", {
        body: {}
      });
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Federation coordinator completed",
        description: `Processed items across ${data.results.length} partitions.`
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Federation coordinator failed",
        description: error.message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsRunningCoordinator(false);
    }
  });

  // Mutation to run the federation worker for a specific partition
  const runWorkerMutation = useMutation({
    mutationFn: async (partition: number) => {
      const { data, error } = await supabase.functions.invoke("federation", {
        body: { partition }
      });
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Federation worker completed",
        description: data.message
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Federation worker failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Sharded Queue</h2>
          <p className="text-muted-foreground">
            Federation queue partitioned by actor ID
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            onClick={() => migrateQueueMutation.mutate()}
            disabled={migrateQueueMutation.isPending}
          >
            <Clock className="mr-2 h-4 w-4" />
            Migrate Legacy Data
          </Button>
          
          <Button 
            variant="default" 
            onClick={() => runCoordinatorMutation.mutate()}
            disabled={isRunningCoordinator}
          >
            <Play className="mr-2 h-4 w-4" />
            Run Coordinator
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {queueStats && queueStats.length > 0 ? (
            queueStats.map((stats) => (
              <Card key={stats.partition_key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">
                    Partition {stats.partition_key}
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => runWorkerMutation.mutate(stats.partition_key)}
                    disabled={runWorkerMutation.isPending}
                  >
                    Process
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Total: {stats.total_count}</span>
                        <span className="text-muted-foreground">Pending: {stats.pending_count}</span>
                      </div>
                      <Progress 
                        value={stats.total_count > 0 ? (stats.processed_count / stats.total_count) * 100 : 0} 
                        className="h-2 mt-1" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-md bg-muted p-2">
                        <div className="text-muted-foreground">Processing</div>
                        <div className="text-xl font-bold">{stats.processing_count}</div>
                      </div>
                      <div className="rounded-md bg-muted p-2">
                        <div className="text-muted-foreground">Failed</div>
                        <div className="text-xl font-bold text-destructive">{stats.failed_count}</div>
                      </div>
                      <div className="rounded-md bg-muted p-2">
                        <div className="text-muted-foreground">Processed</div>
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.processed_count}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="md:col-span-2">
              <CardContent className="flex items-center justify-center p-6">
                <p className="text-muted-foreground">
                  No queue statistics available. The partitioned queue may be empty.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ShardedQueueStats;
