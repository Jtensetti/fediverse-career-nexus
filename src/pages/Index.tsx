import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { i18n } = useTranslation();
  const sv = i18n.language.startsWith("sv");
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
          <p className="text-muted-foreground">Laddar...</p>
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
        title={sv ? "Ett öppnare arbetsliv" : "A more open working life"}
        description={sv ? "Möt människor, dela det du kan och hitta din nästa möjlighet. Utforska Noltos offentliga flöde utan konto." : "Meet people, share what you know and find your next opportunity. Explore Nolto’s public feed without an account."}
      />
      <Navbar />
      <div className="flex-grow">
        <UnauthenticatedHomepage />
      </div>
      <Footer />
    </div>
  );
}
