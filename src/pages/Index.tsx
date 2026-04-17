import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import UnauthenticatedHomepage from "@/components/homepage/UnauthenticatedHomepage";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { SEOHead } from "@/components/common";

/**
 * Root route (`/`).
 * - Authed users: redirected to /feed.
 * - Unauthed users: see the marketing homepage.
 */
export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/feed", { replace: true });
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Authed users will be redirected by the effect above; render nothing in the meantime.
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Samverkan - Det professionella nätverket för offentlig sektor"
        description="Anslut er organisation till en säker plattform byggd för kommuner, regioner och myndigheter. Inga algoritmer, ingen dataförsäljning."
      />
      <Navbar />
      <main className="flex-grow">
        <UnauthenticatedHomepage />
      </main>
      <Footer />
    </div>
  );
}
