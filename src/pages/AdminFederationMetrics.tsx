
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FederationMetricsOverview from "@/components/FederationMetricsOverview";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Helmet } from "react-helmet-async";
import AdminFixSecurityInvoker from "@/components/AdminFixSecurityInvoker";
import { toast } from "@/hooks/use-toast";

export default function AdminFederationMetrics() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const navigate = useNavigate();
  
  const checkAdminStatus = async () => {
    try {
      setCheckingAdmin(true);
      setLoading(true);
      
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/');
        return;
      }
      
      // Check if user has admin role
      const { data, error } = await supabase.rpc(
        'is_admin',
        { user_id: session.user.id }
      );
      
      if (error) {
        console.error("Error checking admin status:", error);
        toast({
          title: "Error checking admin status",
          description: error.message,
          variant: "destructive"
        });
        navigate('/');
        return;
      }
      
      if (!data) {
        toast({
          title: "Access denied",
          description: "You don't have admin privileges",
          variant: "destructive"
        });
        navigate('/');
        return;
      }
      
      setIsAdmin(true);
      toast({
        title: "Admin access granted",
        description: "Welcome to the Federation Management console"
      });
    } catch (error: any) {
      console.error("Error checking admin status:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setLoading(false);
      setCheckingAdmin(false);
    }
  };
  
  useEffect(() => {
    checkAdminStatus();
  }, [navigate]);
  
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
  
  if (!isAdmin) {
    return null; // Redirecting in useEffect
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Federation Metrics - Admin</title>
      </Helmet>
      
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center mb-6 justify-between">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                className="mr-4"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold">Federation Management</h1>
            </div>
            
            <Button 
              variant="outline"
              onClick={checkAdminStatus} 
              disabled={checkingAdmin}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${checkingAdmin ? 'animate-spin' : ''}`} />
              {checkingAdmin ? 'Checking Access...' : 'Refresh Access'}
            </Button>
          </div>
          
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Federation Management Console</AlertTitle>
            <AlertDescription>
              Monitor and manage federation traffic with other instances.
              Track metrics, manage queues, and process batched operations.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
            <div className="md:col-span-9">
              <FederationMetricsOverview />
            </div>
            <div className="md:col-span-3">
              <AdminFixSecurityInvoker />
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
