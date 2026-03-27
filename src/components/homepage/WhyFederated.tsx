import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const WhyFederated = () => {
  const { t } = useTranslation();

  const comparisons = [
    { feature: t("homepage.comparison.feed"), linkedin: t("homepage.comparison.feedTraditional"), nolto: t("homepage.comparison.feedSamverkan") },
    { feature: t("homepage.comparison.data"), linkedin: t("homepage.comparison.dataTraditional"), nolto: t("homepage.comparison.dataSamverkan") },
    { feature: t("homepage.comparison.gdpr"), linkedin: t("homepage.comparison.gdprTraditional"), nolto: t("homepage.comparison.gdprSamverkan") },
    { feature: t("homepage.comparison.hosting"), linkedin: t("homepage.comparison.hostingTraditional"), nolto: t("homepage.comparison.hostingSamverkan") },
    { feature: t("homepage.comparison.interop"), linkedin: t("homepage.comparison.interopTraditional"), nolto: t("homepage.comparison.interopSamverkan") },
    { feature: t("homepage.comparison.ads"), linkedin: t("homepage.comparison.adsTraditional"), nolto: t("homepage.comparison.adsSamverkan") },
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-4">
              {t("homepage.comparison.title")}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t("homepage.comparison.subtitle")}
            </p>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-card rounded-xl shadow-lg overflow-hidden border">
            <div className="grid grid-cols-3 bg-muted/50">
              <div className="p-4 font-semibold text-muted-foreground"></div>
              <div className="p-4 text-center font-semibold text-muted-foreground border-l">
                {t("homepage.comparison.traditional")}
              </div>
              <div className="p-4 text-center font-semibold text-primary border-l bg-primary/5">
                Samverkan
              </div>
            </div>

            {comparisons.map((row, index) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 ${index !== comparisons.length - 1 ? "border-b" : ""}`}
              >
                <div className="p-4 font-medium text-foreground">{row.feature}</div>
                <div className="p-4 text-center border-l flex items-center justify-center gap-2 text-muted-foreground">
                  <X className="h-4 w-4 text-destructive shrink-0" />
                  <span>{row.linkedin}</span>
                </div>
                <div className="p-4 text-center border-l bg-primary/5 flex items-center justify-center gap-2 text-primary">
                  <Check className="h-4 w-4 text-secondary shrink-0" />
                  <span>{row.nolto}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {comparisons.map((row) => (
              <div key={row.feature} className="bg-card rounded-lg shadow-md border overflow-hidden">
                <div className="p-3 bg-muted/50 font-medium text-foreground text-sm">{row.feature}</div>
                <div className="grid grid-cols-2 divide-x">
                  <div className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">{t("homepage.comparison.traditional")}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <X className="h-4 w-4 text-destructive shrink-0" />
                      <span>{row.linkedin}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-primary/5">
                    <div className="text-xs text-primary mb-1 font-medium">Samverkan</div>
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Check className="h-4 w-4 text-secondary shrink-0" />
                      <span>{row.nolto}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyFederated;
