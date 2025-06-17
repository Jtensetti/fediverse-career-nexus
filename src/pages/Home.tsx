
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Index from "./Index";

const Home = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state management
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const authenticated = !!session;
        setIsAuthenticated(authenticated);
        setIsLoading(false);
        
        // Redirect authenticated users to feed
        if (authenticated) {
          navigate("/feed");
        }
      }
    );

    // Check current session
    const checkInitialAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        const authenticated = !!session;
        setIsAuthenticated(authenticated);
        
        // Redirect authenticated users to feed
        if (authenticated) {
          navigate("/feed");
        }
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
  }, [navigate]);


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

  // Only show the index page if not authenticated
  if (!isAuthenticated) {
    return <Index />;
  }

  // This should not be reached due to the redirect, but just in case
  return null;
};

export default Home;
