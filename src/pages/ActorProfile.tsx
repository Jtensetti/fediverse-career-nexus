import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ActorProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // On mount, check if we need to redirect to the actor JSON endpoint
    const headers = new Headers();
    const acceptHeader = window.navigator.userAgent; // Use user agent as a fallback

    // Check Accept header if in a server environment (for ActivityPub clients)
    if (typeof window !== "undefined" && window.fetch) {
      // This is a client-side only check
      if (
        acceptHeader.includes("ActivityPub") || 
        acceptHeader.includes("application/activity+json") || 
        acceptHeader.includes("application/ld+json")
      ) {
        // If the client is requesting ActivityPub data, redirect to our Edge Function
        window.location.href = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/actor/${username}`;
      } else {
        // Otherwise, redirect to the regular profile page
        navigate(`/profile/${username}`);
      }
    } else {
      // Default case - just navigate to profile
      navigate(`/profile/${username}`);
    }
  }, [username, navigate]);

  // This component doesn't render anything visible
  // It just handles the redirection logic
  return null;
};

export default ActorProfile;
