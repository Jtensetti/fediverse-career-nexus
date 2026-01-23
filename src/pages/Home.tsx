import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Index from "./Index";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Redirect authenticated users to feed immediately
    if (user) {
      navigate("/feed", { replace: true });
    }
  }, [user, navigate]);

  // Show the index page for unauthenticated users (Index handles its own loading)
  if (!user) {
    return <Index />;
  }

  // User is authenticated - will redirect via useEffect
  return null;
};

export default Home;
