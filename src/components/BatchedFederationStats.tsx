
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RefreshCw, Play, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

interface BatchStats {
  partition_key: number;
  total_count: number;
  pending_count: number;
  processing_count: number;
  failed_count: number;
  processed_count: number;
}

const BatchedFederationStats = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch batch statistics
  const { data: batchStats, isLoading, refetch } = useQuery({
    queryKey: ["batchStats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follower_batch_stats')
        .select('*');
      
      if (error) throw new Error(error.message);
      return data as BatchStats[];
    }
  });

  // Mutation to trigger batch processing for a specific partition
  const processPartitionMutation = useMutation({
    mutationFn: async (partition: number) => {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke("follower-batch-processor", {
        body: { partition }
      });
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Batch processing started",
        description: data.message
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Failed to process batches",
        description: error.message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  // Mutation to process all pending batches
  const processAllBatchesMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke("follower-batch-processor", {
        body: {}
      });
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Batch processing started",
        description: data.message
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Failed to process batches",
        description: error.message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Follower Batch Fan-out</h2>
          <p className="text-muted-foreground">
            Batch processing of ActivityPub messages to followers
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
            variant="default" 
            onClick={() => processAllBatchesMutation.mutate()}
            disabled={isProcessing}
          >
            <Play className="mr-2 h-4 w-4" />
            Process All Batches
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
          {batchStats && batchStats.length > 0 ? (
            batchStats.map((stats) => (
              <Card key={stats.partition_key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">
                    Partition {stats.partition_key}
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => processPartitionMutation.mutate(stats.partition_key)}
                    disabled={processPartitionMutation.isPending}
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
                  No batch statistics available yet. Start creating activities to generate batches.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default BatchedFederationStats;
