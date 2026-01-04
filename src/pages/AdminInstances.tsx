
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RemoteInstancesTable from "@/components/RemoteInstancesTable";
import ShardedQueueStats from "@/components/ShardedQueueStats";
import HealthCheckStatus from "@/components/HealthCheckStatus";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const AdminInstances = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
          _user_id: userId
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
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  // If user is not an admin, show access denied message
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="container mx-auto py-10 px-4 sm:px-6 flex-grow">
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
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Instance Management - Admin</title>
      </Helmet>
      
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
