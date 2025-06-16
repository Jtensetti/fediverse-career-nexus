
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./Index";
import DashboardLayout from "@/components/DashboardLayout";
import FederatedFeed from "@/components/FederatedFeed";

const Home = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('Home component mounted, checking auth state');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setIsAuthenticated(!!session);
        setIsLoading(false);
      }
    );

    // Check current session
    const checkInitialAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Initial session check:', session?.user?.email, error);
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Error checking session:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkInitialAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  console.log('Home render state:', { isAuthenticated, isLoading });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bondy-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('User not authenticated, showing Index page');
    return <Index />;
  }

  console.log('User authenticated, showing dashboard with feed');
  return (
    <DashboardLayout showHeader={false}>
      <div className="max-w-2xl mx-auto">
        <FederatedFeed />
      </div>
    </DashboardLayout>
  );
};

export default Home;
