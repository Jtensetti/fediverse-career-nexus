import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Activity,
  Server,
  Database,
  Zap,
  Bell,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

interface FederationHealth {
  total_pending: number;
  total_processing: number;
  total_failed: number;
  oldest_pending_age_minutes: number;
  avg_processing_time_ms: number;
}

interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  activeEntries: number;
  totalHits: number;
  averageHitsPerEntry: string;
}

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  metadata: unknown;
  acknowledged_at: string | null;
  created_at: string;
}

interface InstanceHealth {
  host: string;
  health_score: number;
  request_count_24h: number;
  error_count_24h: number;
  last_seen_at: string;
  status: string;
}

export default function AdminFederationHealth() {
  const [health, setHealth] = useState<FederationHealth | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [instances, setInstances] = useState<InstanceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      // Load federation health
      const { data: healthData } = await supabase.rpc("get_federation_health");
      if (healthData && healthData.length > 0) {
        setHealth(healthData[0]);
      }

      // Load cache stats
      const { data: cacheData } = await supabase.functions.invoke("cache-manager", {
        body: { action: "stats" }
      });
      if (cacheData?.stats) {
        setCacheStats(cacheData.stats);
      }

      // Load alerts
      const { data: alertsData } = await supabase
        .from("federation_alerts")
        .select("*")
        .is("acknowledged_at", null)
        .order("created_at", { ascending: false })
        .limit(20);
      setAlerts(alertsData || []);

      // Load instance health
      const { data: instancesData } = await supabase
        .from("remote_instances")
        .select("host, health_score, request_count_24h, error_count_24h, last_seen_at, status")
        .order("request_count_24h", { ascending: false })
        .limit(20);
      setInstances(instancesData || []);

    } catch (error) {
      console.error("Error loading health data:", error);
      toast.error("Failed to load health data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  const handleCleanup = async (dryRun: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke("cleanup-scheduler", {
        body: { dryRun }
      });
      
      if (error) throw error;
      
      if (dryRun) {
        toast.info(`Would clean ${data.totalCleaned} items`);
      } else {
        toast.success(`Cleaned ${data.totalCleaned} items`);
        await loadData();
      }
    } catch (error) {
      toast.error("Cleanup failed");
    }
  };

  const handleCachePrewarm = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("cache-manager", {
        body: { action: "prewarm" }
      });
      
      if (error) throw error;
      toast.success(`Pre-warmed ${data.refreshed} actor caches`);
      await loadData();
    } catch (error) {
      toast.error("Cache pre-warm failed");
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await supabase
        .from("federation_alerts")
        .update({ acknowledged_at: new Date().toISOString() })
        .eq("id", alertId);
      
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast.success("Alert acknowledged");
    } catch (error) {
      toast.error("Failed to acknowledge alert");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "warning": return "secondary";
      default: return "outline";
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Federation Health</h1>
            <p className="text-muted-foreground">Monitor and manage federation infrastructure</p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Health Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{health?.total_pending || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="text-2xl font-bold">{health?.total_processing || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold">{health?.total_failed || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <Database className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cache Entries</p>
                  <p className="text-2xl font-bold">{cacheStats?.activeEntries || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="queue">
          <TabsList>
            <TabsTrigger value="queue">Queue Health</TabsTrigger>
            <TabsTrigger value="cache">Cache</TabsTrigger>
            <TabsTrigger value="instances">Instances</TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts
              {alerts.length > 0 && (
                <Badge variant="destructive" className="ml-2">{alerts.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Queue Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Oldest Pending Item</p>
                    <p className="text-lg font-medium">
                      {health?.oldest_pending_age_minutes 
                        ? `${Math.round(health.oldest_pending_age_minutes)} minutes` 
                        : "No pending items"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Queue Partitions</p>
                    <p className="text-lg font-medium">16 active</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Queue Utilization</span>
                    <span>{Math.min(((health?.total_pending || 0) / 1000) * 100, 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(((health?.total_pending || 0) / 1000) * 100, 100)} />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleCleanup(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Preview Cleanup
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleCleanup(false)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Run Cleanup
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cache" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Cache Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Entries</p>
                    <p className="text-lg font-medium">{cacheStats?.activeEntries || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expired Entries</p>
                    <p className="text-lg font-medium">{cacheStats?.expiredEntries || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Hits</p>
                    <p className="text-lg font-medium">{cacheStats?.totalHits || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Hits/Entry</p>
                    <p className="text-lg font-medium">{cacheStats?.averageHitsPerEntry || "0"}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCachePrewarm}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Pre-warm Popular Actors
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="instances" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Remote Instances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {instances.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No instance data yet</p>
                  ) : (
                    instances.map((instance) => (
                      <div key={instance.host} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <span className={`font-medium ${getHealthColor(instance.health_score)}`}>
                            {instance.health_score}%
                          </span>
                          <span className="font-mono text-sm">{instance.host}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{instance.request_count_24h} req/24h</span>
                          {instance.error_count_24h > 0 && (
                            <Badge variant="destructive">{instance.error_count_24h} errors</Badge>
                          )}
                          <Badge variant={instance.status === "active" ? "default" : "secondary"}>
                            {instance.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Active Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alerts.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>No active alerts</span>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div key={alert.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={getSeverityColor(alert.severity) as "default"}>
                              {alert.severity}
                            </Badge>
                            <span className="font-medium">{alert.alert_type}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
