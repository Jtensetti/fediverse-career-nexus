import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, 
  Briefcase, 
  Calendar, 
  FileText, 
  MessageSquare, 
  Users,
  Globe,
  Shield,
  Repeat
} from "lucide-react";

const FeatureShowcase = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: User,
      titleKey: "featureShowcase.professionalProfiles",
      descriptionKey: "featureShowcase.profilesDesc",
      fedAdvantageKey: "featureShowcase.portableIdentity",
    },
    {
      icon: Briefcase,
      titleKey: "featureShowcase.jobBoard",
      descriptionKey: "featureShowcase.jobDesc",
      fedAdvantageKey: "featureShowcase.crossInstanceListings",
    },
    {
      icon: Calendar,
      titleKey: "featureShowcase.events",
      descriptionKey: "featureShowcase.eventsDesc",
      fedAdvantageKey: "featureShowcase.federatedRsvps",
    },
    {
      icon: FileText,
      titleKey: "featureShowcase.articles",
      descriptionKey: "featureShowcase.articlesDesc",
      fedAdvantageKey: "featureShowcase.reachAnyInstance",
    },
    {
      icon: MessageSquare,
      titleKey: "featureShowcase.directMessages",
      descriptionKey: "featureShowcase.dmDesc",
      fedAdvantageKey: "featureShowcase.crossInstanceMessaging",
    },
    {
      icon: Users,
      titleKey: "featureShowcase.connections",
      descriptionKey: "featureShowcase.connectionsDesc",
      fedAdvantageKey: "featureShowcase.followAnywhere",
    },
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-4">
              {t("featureShowcase.title")}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t("featureShowcase.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, titleKey, descriptionKey, fedAdvantageKey }) => (
              <Card 
                key={titleKey} 
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 shadow-md"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-secondary font-medium bg-secondary/10 px-2 py-1 rounded-full">
                      <Globe className="h-3 w-3" />
                      {t(fedAdvantageKey)}
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-3">{t(titleKey)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{t(descriptionKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional highlights */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <Shield className="h-8 w-8 text-primary shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground">{t("featureShowcase.privacyByDesign")}</h4>
                <p className="text-sm text-muted-foreground">{t("featureShowcase.noTracking")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <Repeat className="h-8 w-8 text-primary shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground">{t("featureShowcase.fullPortability")}</h4>
                <p className="text-sm text-muted-foreground">{t("featureShowcase.exportAnytime")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <Globe className="h-8 w-8 text-primary shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground">{t("featureShowcase.openProtocol")}</h4>
                <p className="text-sm text-muted-foreground">{t("featureShowcase.builtOnActivityPub")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
