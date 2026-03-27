
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { getMetricsByHost, getTopFailingHosts, getRateLimitedHosts, getFederationSummary } from "@/services/federation/federationAnalyticsService";
import { Activity, AlertTriangle, Clock } from "lucide-react";

export default function FederationAnalytics() {
  const [activeTab, setActiveTab] = useState<string>("metrics");
  const [loading, setLoading] = useState<boolean>(true);
  const [timeframe, setTimeframe] = useState<string>("24h");
  const [metrics, setMetrics] = useState<any[]>([]);
  const [failingHosts, setFailingHosts] = useState<any[]>([]);
  const [rateLimitedHosts, setRateLimitedHosts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        const summaryData = await getFederationSummary(timeframe);
        setSummary(summaryData);
        
        switch (activeTab) {
          case "metrics":
            const metricsData = await getMetricsByHost(10);
            setMetrics(metricsData);
            break;
          case "failures":
            const failuresData = await getTopFailingHosts(10);
            setFailingHosts(failuresData);
            break;
          case "ratelimited":
            const rateLimitedData = await getRateLimitedHosts(timeframe);
            setRateLimitedHosts(rateLimitedData);
            break;
        }
      } catch (error) {
        console.error("Error fetching federation data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [activeTab, timeframe]);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Federationsanalys
        </CardTitle>
        <CardDescription>
          Prestandamått och insikter för federationstrafik
        </CardDescription>
        {summary && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-muted p-3 rounded-lg text-center">
              <div className="text-2xl font-bold">{summary.total_requests}</div>
              <div className="text-xs text-muted-foreground">Totala förfrågningar</div>
            </div>
            <div className="bg-muted p-3 rounded-lg text-center">
              <div className="text-2xl font-bold">{summary.success_percent}%</div>
              <div className="text-xs text-muted-foreground">Lyckade</div>
            </div>
            <div className="bg-muted p-3 rounded-lg text-center">
              <div className="text-2xl font-bold">{summary.median_latency_ms}ms</div>
              <div className="text-xs text-muted-foreground">Median latens</div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="metrics">Värdmått</TabsTrigger>
              <TabsTrigger value="failures">Misslyckanden</TabsTrigger>
              <TabsTrigger value="ratelimited">Hastighetsbegränsade</TabsTrigger>
            </TabsList>
            
            <select 
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="1h">Senaste timmen</option>
              <option value="6h">Senaste 6 timmarna</option>
              <option value="24h">Senaste 24 timmarna</option>
              <option value="72h">Senaste 3 dagarna</option>
            </select>
          </div>
          
          <TabsContent value="metrics">
            {loading ? (
              <div className="flex justify-center items-center h-60">
                <div className="animate-pulse">Laddar mått...</div>
              </div>
            ) : (
              <Table>
                <TableCaption>Federationsmått per värd för tidsperioden {timeframe}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Värd</TableHead>
                    <TableHead>Förfrågningar</TableHead>
                    <TableHead>Lyckade</TableHead>
                    <TableHead>Latens (ms)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.length > 0 ? (
                    metrics.map((host) => (
                      <TableRow key={host.remote_host}>
                        <TableCell>{host.remote_host}</TableCell>
                        <TableCell>{host.total_requests}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={host.success_percent} className="h-2 w-20" />
                            <span>{host.success_percent.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{host.median_latency_ms}ms</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">Ingen data tillgänglig</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>
          
          <TabsContent value="failures">
            {loading ? (
              <div className="flex justify-center items-center h-60">
                <div className="animate-pulse">Laddar feldata...</div>
              </div>
            ) : (
              <Table>
                <TableCaption>Mest misslyckade värdar för tidsperioden {timeframe}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Värd</TableHead>
                    <TableHead>Misslyckade</TableHead>
                    <TableHead>Lyckade</TableHead>
                    <TableHead>Totalt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failingHosts.length > 0 ? (
                    failingHosts.map((host) => (
                      <TableRow key={host.remote_host}>
                        <TableCell className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          {host.remote_host}
                        </TableCell>
                        <TableCell>{host.failed_requests}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={host.success_percent} className="h-2 w-20" />
                            <span>{host.success_percent.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{host.total_requests}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">Inga misslyckanden registrerade</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>
          
          <TabsContent value="ratelimited">
            {loading ? (
              <div className="flex justify-center items-center h-60">
                <div className="animate-pulse">Laddar hastighetsbegränsningsdata...</div>
              </div>
            ) : (
              <Table>
                <TableCaption>Hastighetsbegränsade värdar för tidsperioden {timeframe}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Värd</TableHead>
                    <TableHead>Antal förfrågningar</TableHead>
                    <TableHead>Senaste förfrågan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rateLimitedHosts.length > 0 ? (
                    rateLimitedHosts.map((host) => (
                      <TableRow key={host.remote_host}>
                        <TableCell className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-red-500" />
                          {host.remote_host}
                        </TableCell>
                        <TableCell>{host.request_count}</TableCell>
                        <TableCell>
                          {new Date(host.latest_request).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">Inga hastighetsbegränsade värdar</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
