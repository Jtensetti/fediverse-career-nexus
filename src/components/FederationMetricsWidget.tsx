
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getFederationSummary } from "@/services/federationAnalyticsService";
import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function FederationMetricsWidget() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const navigate = useNavigate();
  
  const loadMetrics = async () => {
    try {
      setLoading(true);
      const summary = await getFederationSummary();
      setMetrics(summary);
    } catch (error) {
      console.error("Error loading federation metrics:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMetrics();
    setRefreshing(false);
  };
  
  useEffect(() => {
    loadMetrics();
  }, []);
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-md flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            Federation Metrics
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw 
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} 
            />
            <span className="sr-only">Refresh</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-24">
            <div className="animate-pulse">Loading metrics...</div>
          </div>
        ) : metrics ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Requests</p>
                <p className="text-2xl font-bold">{metrics.total_requests || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Success Rate</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold">{parseFloat(metrics.success_percent || '0').toFixed(1)}%</p>
                  <Progress value={parseFloat(metrics.success_percent || '0')} className="h-2 flex-1 mt-2" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Median Latency</p>
                <p className="text-lg font-semibold">{metrics.median_latency_ms || 0}ms</p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/admin/federation-metrics')}
              >
                View Details
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No metrics available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
