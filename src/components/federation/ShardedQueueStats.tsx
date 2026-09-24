
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

import { tx } from "@/i18n/tx";
interface QueueStats {
  partition_key: number;
  total_count: number;
  pending_count: number;
  processing_count: number;
  failed_count: number;
  processed_count: number;
}

const ShardedQueueStats = () => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['federation-queue-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('federation_queue_stats')
        .select('*')
        .order('partition_key');
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tx("ui.shardedQueueStats.federationQueueStatistics")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tx("ui.shardedQueueStats.federationQueueStatistics")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{tx("ui.shardedQueueStats.errorLoadingQueueStatistics")}</p>
        </CardContent>
      </Card>
    );
  }

  // Transform the data to match expected interface
  const queueStats: QueueStats[] = (stats || []).map(stat => ({
    partition_key: stat.partition_key || 0,
    total_count: stat.total_count || 0,
    pending_count: stat.pending_count || 0,
    processing_count: stat.processing_count || 0,
    failed_count: stat.failed_count || 0,
    processed_count: stat.processed_count || 0
  }));

  const totalStats = queueStats.reduce(
    (acc, stat) => ({
      total_count: acc.total_count + stat.total_count,
      pending_count: acc.pending_count + stat.pending_count,
      processing_count: acc.processing_count + stat.processing_count,
      failed_count: acc.failed_count + stat.failed_count,
      processed_count: acc.processed_count + stat.processed_count,
    }),
    { total_count: 0, pending_count: 0, processing_count: 0, failed_count: 0, processed_count: 0 }
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{tx("ui.shardedQueueStats.federationQueueOverview")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalStats.total_count}</div>
              <div className="text-sm text-muted-foreground">{tx("ui.shardedQueueStats.total")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{totalStats.pending_count}</div>
              <div className="text-sm text-muted-foreground">{tx("ui.shardedQueueStats.pending")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalStats.processing_count}</div>
              <div className="text-sm text-muted-foreground">{tx("ui.shardedQueueStats.processing")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{totalStats.failed_count}</div>
              <div className="text-sm text-muted-foreground">{tx("ui.shardedQueueStats.failed")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalStats.processed_count}</div>
              <div className="text-sm text-muted-foreground">{tx("ui.shardedQueueStats.processed")}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tx("ui.shardedQueueStats.queueStatisticsByPartition")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {queueStats.map((stat) => (
              <div key={stat.partition_key} className="flex items-center justify-between p-3 border rounded">
                <div className="font-medium">{tx("ui.shardedQueueStats.partition")}{' '}{stat.partition_key}</div>
                <div className="flex gap-6 text-sm">
                  <span>{tx("ui.shardedQueueStats.total2")}{' '}{stat.total_count}</span>
                  <span className="text-yellow-600">{tx("ui.shardedQueueStats.pending2")}{' '}{stat.pending_count}</span>
                  <span className="text-blue-600">{tx("ui.shardedQueueStats.processing2")}{' '}{stat.processing_count}</span>
                  <span className="text-red-600">{tx("ui.shardedQueueStats.failed2")}{' '}{stat.failed_count}</span>
                  <span className="text-green-600">{tx("ui.shardedQueueStats.processed2")}{' '}{stat.processed_count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShardedQueueStats;
