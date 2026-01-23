import { AlertCircle, ArrowLeft, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RemoteInstancesTable from "@/components/RemoteInstancesTable";
import ShardedQueueStats from "@/components/ShardedQueueStats";
import HealthCheckStatus from "@/components/HealthCheckStatus";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/common/SEOHead";
import { useModerationAccess } from "@/hooks/useModerationAccess";

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
            <p className="text-muted-foreground">Verifying access...</p>
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
              <h1 className="text-2xl font-bold">Access Restricted</h1>
              <p className="text-muted-foreground">
                This area is restricted to authorized moderators only.
              </p>
              <Button onClick={() => navigate('/')} variant="outline">
                Return Home
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
      <SEOHead title="Instance Management - Admin" description="Manage rate-limited instances and federation queues." />
      
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
              Back
            </Button>
            <h1 className="text-3xl font-bold">Instance Management</h1>
          </div>

          {/* Add HealthCheckStatus at the top for visibility */}
          <div className="mb-8">
            <HealthCheckStatus />
          </div>

          <Tabs defaultValue="instances" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="instances">Rate Limited Instances</TabsTrigger>
              <TabsTrigger value="queue">Federation Queue</TabsTrigger>
              <TabsTrigger value="logs">Federation Logs</TabsTrigger>
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
                  Federation logs functionality will be added in a future update.
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
