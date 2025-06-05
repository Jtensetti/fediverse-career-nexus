
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./Index";
import DashboardLayout from "@/components/DashboardLayout";
import FederatedFeed from "@/components/FederatedFeed";

const Home = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isAuthenticated === null) {
    return null;
  }

  if (!isAuthenticated) {
    return <Index />;
  }

  return (
    <DashboardLayout showHeader={false}>
      <div className="max-w-2xl mx-auto">
        <FederatedFeed />
      </div>
    </DashboardLayout>
  );
};

export default Home;
