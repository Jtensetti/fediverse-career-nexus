
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BatchedFederationStats from "./BatchedFederationStats";
import RemoteInstancesTable from "./RemoteInstancesTable";
import ShardedQueueStats from "./ShardedQueueStats";
import FederationAnalytics from "./FederationAnalytics";

const FederationMetricsOverview = () => {
  const [activeTab, setActiveTab] = useState<string>("analytics");

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Federation Management</CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs 
          defaultValue="analytics" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-4 grid grid-cols-4 md:grid-cols-4">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="instances">Instances</TabsTrigger>
            <TabsTrigger value="queues">Queues</TabsTrigger>
            <TabsTrigger value="batches">Batches</TabsTrigger>
          </TabsList>
          
          <TabsContent value="analytics" className="space-y-4">
            <FederationAnalytics />
          </TabsContent>
          
          <TabsContent value="instances" className="space-y-4">
            <RemoteInstancesTable />
          </TabsContent>
          
          <TabsContent value="queues" className="space-y-4">
            <ShardedQueueStats />
          </TabsContent>
          
          <TabsContent value="batches" className="space-y-4">
            <BatchedFederationStats />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FederationMetricsOverview;
