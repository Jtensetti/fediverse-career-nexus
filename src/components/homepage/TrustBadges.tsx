import { Badge } from "@/components/ui/badge";
import { Globe, Lock, Code, Server } from "lucide-react";

const TrustBadges = () => {
  const badges = [
    { icon: Globe, label: "ActivityPub Compatible", shortLabel: "ActivityPub" },
    { icon: Lock, label: "Privacy-First", shortLabel: "Privacy" },
    { icon: Code, label: "Open Source", shortLabel: "Open" },
    { icon: Server, label: "Self-Hostable", shortLabel: "Hostable" },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {badges.map(({ icon: Icon, label, shortLabel }) => (
        <Badge
          key={label}
          variant="secondary"
          className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-primary-foreground/30 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-all"
        >
          <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
          <span className="sm:hidden">{shortLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </Badge>
      ))}
    </div>
  );
};

export default TrustBadges;
