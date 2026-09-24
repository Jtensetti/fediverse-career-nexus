import { Link } from "react-router-dom";
import { Github } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import PublicArtwork from "./PublicArtwork";
import "./footer.css";

import { tx } from "@/i18n/tx";
import LanguageSelector from "@/components/common/LanguageSelector";
const Footer = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const isPublic = !loading && !user;
  const brand = (
    <>
      <div className="site-footer-wordmark flex items-center gap-2 mb-4">
        {!isPublic && <img src="/brand/mascot.webp" alt="" width="40" height="40" className="h-10 w-10 object-contain" />}
        <h3 className="text-lg font-bold text-primary">Nolto</h3>
      </div>
      <p className="text-muted-foreground mb-4">
        {t("footer.tagline", "A professional social network built on the ActivityPub federation protocol.")}
      </p>
    </>
  );

  return (
    <footer className={`site-footer${isPublic ? " site-footer-public" : ""}`}>
      {isPublic && <>
        <div className="site-footer-landscape" aria-hidden="true">
          <div className="site-footer-artwork"><PublicArtwork placement="footer" /></div>
        </div>
        <div className="site-footer-intro">{brand}</div>
      </>}
      <div className="site-footer-links">
        <div className="container mx-auto px-4 py-12">
          <div className={isPublic ? "site-footer-public-nav" : "grid md:grid-cols-4 gap-8"}>
            {!isPublic && <div className="col-span-1">{brand}</div>}

            <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-primary mb-4">{t("footer.about", "About")}</h3>
                <ul className="space-y-3">
                  <li><Link to="/feed" className="text-muted-foreground hover:text-primary">{t("ui.footer.exploreTheFeed")}</Link></li>
                  <li><Link to="/hosting" className="text-muted-foreground hover:text-primary">{t("ui.footer.selfhosting")}</Link></li>
                  <li><Link to="/mission" className="text-muted-foreground hover:text-secondary transition-colors">{t("footer.ourMission", "Our Mission")}</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-primary mb-4">{t("footer.resources", "Resources")}</h3>
                <ul className="space-y-3">
                  <li><Link to="/integrations" className="text-muted-foreground hover:text-primary">{t("ui.footer.importFromNoltoButton")}</Link></li>
                  <li><Link to="/documentation" className="text-muted-foreground hover:text-secondary transition-colors">{t("footer.documentation", "Documentation")}</Link></li>
                  <li><Link to="/help" className="text-muted-foreground hover:text-secondary transition-colors">{t("footer.helpCenter", "Help Center")}</Link></li>
                  <li><Link to="/federation" className="text-muted-foreground hover:text-secondary transition-colors">{t("footer.howFederationWorks", "How Federation Works")}</Link></li>
                  <li><Link to="/instances" className="text-muted-foreground hover:text-secondary transition-colors">{t("footer.federatedInstances", "Federated Instances")}</Link></li>
                </ul>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <h3 className="text-sm font-semibold text-primary mb-4">{t("footer.legal", "Legal")}</h3>
                <ul className="space-y-3">
                  <li><Link to="/conversation-guide" className="text-muted-foreground hover:text-secondary">{t("contentCare.guideTitle")}</Link></li>
                  <li><Link to="/privacy" className="text-muted-foreground hover:text-secondary transition-colors">{t("footer.privacyPolicy", "Privacy Policy")}</Link></li>
                  <li><Link to="/terms" className="text-muted-foreground hover:text-secondary transition-colors">{t("footer.termsOfService", "Terms of Service")}</Link></li>
                  <li><Link to="/code-of-conduct" className="text-muted-foreground hover:text-secondary transition-colors">{t("footer.codeOfConduct", "Code of Conduct")}</Link></li>
                  <li><Link to="/instance-guidelines" className="text-muted-foreground hover:text-secondary transition-colors">{t("footer.instanceGuidelines", "Instance Guidelines")}</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <Separator className="my-8 bg-border" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground text-center md:text-left">
              © {new Date().getFullYear()}{' '}{tx("ui.footer.nolto")}{' '}{t("footer.copyright", "Open source under the")}{" "}
              <a
                href="https://opensource.org/licenses/MIT"
                target="_blank"
                rel="noopener"
                className="text-secondary hover:text-primary transition-colors underline"
              >
                {t("footer.mitLicense", "MIT license")}
              </a>.
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 items-center">
              <LanguageSelector />
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-secondary transition-colors">{t("footer.terms", "Terms")}</Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-secondary transition-colors">{t("footer.privacy", "Privacy")}</Link>
              <Link to="/cookies" className="text-sm text-muted-foreground hover:text-secondary transition-colors">{t("footer.cookies", "Cookies")}</Link>
              <a
                href="https://github.com/Jtensetti/fediverse-career-nexus"
                target="_blank"
                rel="noopener"
                className="text-muted-foreground hover:text-secondary transition-colors"
                title={t("footer.viewSource")}
                aria-label={t("footer.viewSource")}
              >
                <Github size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
