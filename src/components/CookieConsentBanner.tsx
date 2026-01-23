import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie, ChevronDown, ChevronUp, Shield, Type, X } from "lucide-react";
import { Link } from "react-router-dom";
import { setFontPreference, getFontPreference } from "@/components/FontLoader";
import { cn } from "@/lib/utils";

interface CookiePreferences {
  essential: boolean; // Always true, can't be disabled
  typography: boolean; // Google Fonts
  consented_at: string | null;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  typography: true,
  consented_at: null,
};

function getStoredPreferences(): CookiePreferences | null {
  try {
    const stored = localStorage.getItem("cookie_preferences");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to parse cookie preferences:", e);
  }
  return null;
}

function savePreferences(prefs: CookiePreferences) {
  try {
    localStorage.setItem("cookie_preferences", JSON.stringify(prefs));
    // Sync typography preference with FontLoader
    setFontPreference(prefs.typography ? "google" : "system");
  } catch (e) {
    console.error("Failed to save cookie preferences:", e);
  }
}

export default function CookieConsentBanner() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(() => {
    const stored = getStoredPreferences();
    if (stored) return stored;
    // Sync with existing font preference if it exists
    const fontPref = getFontPreference();
    return { ...DEFAULT_PREFERENCES, typography: fontPref === "google" };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = getStoredPreferences();
    if (stored?.consented_at) {
      // User has already made a choice
      return;
    }

    // Show banner after a brief delay
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleAcceptAll = () => {
    const newPrefs: CookiePreferences = {
      essential: true,
      typography: true,
      consented_at: new Date().toISOString(),
    };
    savePreferences(newPrefs);
    setPreferences(newPrefs);
    setIsVisible(false);
  };

  const handleRejectOptional = () => {
    const newPrefs: CookiePreferences = {
      essential: true,
      typography: false,
      consented_at: new Date().toISOString(),
    };
    savePreferences(newPrefs);
    setPreferences(newPrefs);
    setIsVisible(false);
    // Reload to apply font change
    window.location.reload();
  };

  const handleSavePreferences = () => {
    const newPrefs: CookiePreferences = {
      ...preferences,
      consented_at: new Date().toISOString(),
    };
    savePreferences(newPrefs);
    setIsVisible(false);
    // Reload if typography changed
    const currentFontPref = getFontPreference();
    if ((currentFontPref === "google") !== preferences.typography) {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg animate-in slide-in-from-bottom-5">
      <div className="container mx-auto max-w-4xl">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Cookie className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {t("cookies.title", "Cookie Preferences")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "cookies.description",
                    "We use essential cookies for authentication and security. You can customize optional preferences below."
                  )}{" "}
                  <Link to="/privacy" className="underline hover:text-foreground">
                    {t("cookies.learnMore", "Privacy Policy")}
                  </Link>
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={handleDismiss}
              aria-label={t("common.cancel", "Dismiss")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Expandable Details */}
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {t("cookies.customize", "Customize preferences")}
            </button>

            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                showDetails ? "max-h-96 mt-4" : "max-h-0"
              )}
            >
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                {/* Essential Cookies - Always On */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">
                        {t("cookies.essential", "Essential Cookies")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "cookies.essentialDesc",
                          "Required for authentication, security (Cloudflare), and basic functionality. Cannot be disabled."
                        )}
                      </p>
                    </div>
                  </div>
                  <Switch checked disabled aria-label="Essential cookies (always enabled)" />
                </div>

                {/* Typography - Optional */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Type className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">
                        {t("cookies.typography", "Typography (Google Fonts)")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "cookies.typographyDesc",
                          "Loads custom fonts from Google for better readability. Your IP is shared with Google when enabled."
                        )}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.typography}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, typography: checked }))
                    }
                    aria-label="Toggle Google Fonts"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleRejectOptional}>
              {t("cookies.rejectOptional", "Essential Only")}
            </Button>
            {showDetails && (
              <Button variant="outline" size="sm" onClick={handleSavePreferences}>
                {t("cookies.savePreferences", "Save Preferences")}
              </Button>
            )}
            <Button size="sm" onClick={handleAcceptAll}>
              {t("cookies.acceptAll", "Accept All")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
