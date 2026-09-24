import { ArrowLeft, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RemoteInstancesTable from "@/components/federation/RemoteInstancesTable";
import ShardedQueueStats from "@/components/federation/ShardedQueueStats";
import HealthCheckStatus from "@/components/federation/HealthCheckStatus";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { SEOHead } from "@/components/common/SEOHead";
import { useModerationAccess } from "@/hooks/useModerationAccess";

import { tx } from "@/i18n/tx";
const AdminInstances = () => {
  const navigate = useNavigate();
  const { hasAccess, loading } = useModerationAccess();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">{tx("ui.adminInstances.verifyingAccess")}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // If user doesn't have access, show access denied message
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 max-w-md"
            >
              <div className="p-4 rounded-full bg-destructive/10 w-fit mx-auto">
                <Shield className="h-12 w-12 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold">{tx("ui.adminInstances.accessRestricted")}</h1>
              <p className="text-muted-foreground">
                {tx("ui.adminInstances.thisAreaIsRestricted")}
              </p>
              <Button onClick={() => navigate('/')} variant="outline">
                {tx("ui.adminInstances.returnHome")}
              </Button>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title={tx("ui.adminInstances.instanceManagementAdmin")} description={tx("ui.adminInstances.manageRateLimitedInstances")} />
      
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              className="mr-4"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {tx("ui.adminInstances.back")}
            </Button>
            <h1 className="text-3xl font-bold">{tx("ui.adminInstances.instanceManagement")}</h1>
          </div>

          {/* Add HealthCheckStatus at the top for visibility */}
          <div className="mb-8">
            <HealthCheckStatus />
          </div>

          <Tabs defaultValue="instances" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="instances">{tx("ui.adminInstances.rateLimitedInstances")}</TabsTrigger>
              <TabsTrigger value="queue">{tx("ui.adminInstances.federationQueue")}</TabsTrigger>
              <TabsTrigger value="logs">{tx("ui.adminInstances.federationLogs")}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="instances" className="space-y-4">
              <RemoteInstancesTable />
            </TabsContent>
            
            <TabsContent value="queue" className="space-y-4">
              <ShardedQueueStats />
            </TabsContent>
            
            <TabsContent value="logs" className="space-y-4">
              <div className="text-center py-8 border border-dashed rounded-lg">
                <p className="text-muted-foreground">
                  {tx("ui.adminInstances.federationLogsFunctionalityWill")}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminInstances;
