
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RemoteInstancesTable from "@/components/RemoteInstancesTable";
import ShardedQueueStats from "@/components/ShardedQueueStats";
import HealthCheckStatus from "@/components/HealthCheckStatus";
import { supabase } from "@/integrations/supabase/client";

const AdminInstances = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if the current user is an admin
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setLoading(false);
          setError("You must be logged in to access this page");
          return;
        }
        
        const userId = session.user.id;
        
        // Check if user is an admin
        const { data: adminData, error: adminError } = await supabase.rpc('is_admin', {
          user_id: userId
        });
        
        if (adminError) {
          console.error('Error checking admin status:', adminError);
          setError("Failed to verify admin permissions");
        } else {
          setIsAdmin(adminData || false);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking user role:', error);
        setError("Failed to check user permissions");
        setLoading(false);
      }
    };
    
    checkUserRole();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4 sm:px-6 text-center">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  // If user is not an admin, show access denied message
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-10 px-4 sm:px-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "Access denied. Only administrators can access this page."}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button asChild variant="outline">
            <a href="/">Return to Home</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6">
      <Helmet>
        <title>Instance Management - Admin</title>
      </Helmet>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Instance Management</h1>
        <p className="text-muted-foreground">
          Monitor and manage remote federated instances
        </p>
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
  );
};

export default AdminInstances;
