import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const CallToAction = () => {
  const { t } = useTranslation();

  return (
    <section className="py-16 md:py-24 clip-path-reverse-slash bg-gradient-to-br from-primary to-secondary">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center text-primary-foreground">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
            {t("homepage.finalCta.title")} {t("homepage.finalCta.titleAccent")}
          </h2>
          <p className="text-xl mb-8 text-primary-foreground/90">
            {t("homepage.finalCta.description")}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-medium">
              <Link to="/auth/signup">{t("homepage.finalCta.createAccount")}</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10 font-medium" onClick={() => document.getElementById('live-feed')?.scrollIntoView({ behavior: 'smooth' })}>
              {t("homepage.finalCta.exploreFirst")} <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
