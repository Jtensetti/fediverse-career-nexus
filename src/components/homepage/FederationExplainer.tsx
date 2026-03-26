import { User, Server, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

const FederationExplainer = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: User,
      title: t("homepage.onboarding.step1"),
      description: t("homepage.onboarding.step1Desc"),
    },
    {
      icon: Server,
      title: t("homepage.onboarding.step2"),
      description: t("homepage.onboarding.step2Desc"),
    },
    {
      icon: Globe,
      title: t("homepage.onboarding.step3"),
      description: t("homepage.onboarding.step3Desc"),
    },
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-4">
              {t("homepage.onboarding.title")}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t("homepage.onboarding.subtitle")}
            </p>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent -translate-y-1/2 z-0" />

            <div className="grid md:grid-cols-3 gap-8 relative z-10">
              {steps.map(({ icon: Icon, title, description }, index) => (
                <div key={title} className="text-center">
                  <div className="relative inline-flex items-center justify-center mb-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                      <Icon className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm shadow">
                      {index + 1}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FederationExplainer;
