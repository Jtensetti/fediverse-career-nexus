import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ActorProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // On mount, check if we need to redirect to the actor JSON endpoint
    const headers = new Headers(Object.entries(document.headers || {}));
    const acceptHeader = headers.get("Accept");
    
    if (acceptHeader && (
      acceptHeader.includes("application/activity+json") || 
      acceptHeader.includes("application/ld+json")
    )) {
      // If the client is requesting ActivityPub data, redirect to our Edge Function
      const edgeFunctionUrl = `${supabase.functions.url}/actor/${username}`;
      window.location.href = edgeFunctionUrl;
    } else {
      // Otherwise, redirect to the regular profile page
      navigate(`/profile/${username}`);
    }
  }, [username, navigate]);

  // This component doesn't render anything visible
  // It just handles the redirection logic
  return null;
};

export default ActorProfile;
