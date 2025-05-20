import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const ActorInbox = () => {
  const { username } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // On mount, check if we need to redirect
    const acceptHeader = window.navigator.userAgent; // Use user agent as a fallback

    // Check Accept header if in a client environment
    if (typeof window !== "undefined" && window.fetch) {
      // This is a client-side only check
      if (
        acceptHeader.includes("ActivityPub") || 
        acceptHeader.includes("application/activity+json") || 
        acceptHeader.includes("application/ld+json")
      ) {
        // If the client is requesting ActivityPub data, redirect to our Edge Function
        window.location.href = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inbox/${username}`;
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

export default ActorInbox;
