import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";
import { Link } from "react-router-dom";

export default function CookieBanner() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookie notice
    const accepted = localStorage.getItem("cookie_notice_accepted");
    if (!accepted) {
      // Small delay to prevent flash on page load
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie_notice_accepted", new Date().toISOString());
    setIsVisible(false);
  };

  const handleDismiss = () => {
    // Dismiss for this session only
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg animate-in slide-in-from-bottom-5">
      <div className="container mx-auto max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Cookie className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {t("cookies.title", "Cookie Notice")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("cookies.description", "We use only essential cookies for authentication and security. We do not use tracking cookies or share data with third parties.")}
                {" "}
                <Link to="/privacy" className="underline hover:text-foreground">
                  {t("cookies.learnMore", "Learn more")}
                </Link>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleAccept}>
              {t("cookies.accept", "Got it")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
