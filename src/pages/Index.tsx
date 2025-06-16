
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Home from "./Home";
import UnauthenticatedHomepage from "@/components/UnauthenticatedHomepage";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect automatically, let user choose when to sign in
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bondy-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, show the main app
  if (user) {
    return <Home />;
  }

  // If not authenticated, show the UnauthenticatedHomepage
  return <UnauthenticatedHomepage />;
}
