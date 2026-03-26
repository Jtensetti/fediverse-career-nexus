import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Server, FileCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

const TrustBadges = () => {
  const { t } = useTranslation();

  const badges = [
    { icon: Shield, labelKey: "gdpr", shortLabelKey: "gdprShort" },
    { icon: Server, labelKey: "swedishData", shortLabelKey: "swedishDataShort" },
    { icon: Lock, labelKey: "secureLogin", shortLabelKey: "secureLoginShort" },
    { icon: FileCheck, labelKey: "hostedSweden", shortLabelKey: "hostedSwedenShort" },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {badges.map(({ icon: Icon, labelKey, shortLabelKey }) => (
        <Badge
          key={labelKey}
          variant="secondary"
          className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-primary-foreground/30 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-all"
        >
          <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
          <span className="sm:hidden">{t(`homepage.trustBadges.${shortLabelKey}`)}</span>
          <span className="hidden sm:inline">{t(`homepage.trustBadges.${labelKey}`)}</span>
        </Badge>
      ))}
    </div>
  );
};

export default TrustBadges;
