import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Index from "./Index";
import { Loader2 } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Redirect authenticated users to feed
    if (!loading && user) {
      navigate("/feed");
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show the index page for unauthenticated users
  if (!user) {
    return <Index />;
  }

  // This should not be reached due to the redirect
  return null;
};

export default Home;
