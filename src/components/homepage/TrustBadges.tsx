import { Badge } from "@/components/ui/badge";
import { Globe, Lock, Code, Server } from "lucide-react";

const TrustBadges = () => {
  const badges = [
    { icon: Globe, label: "ActivityPub Compatible" },
    { icon: Lock, label: "Privacy-First" },
    { icon: Code, label: "Open Source" },
    { icon: Server, label: "Self-Hostable" },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {badges.map(({ icon: Icon, label }) => (
        <Badge
          key={label}
          variant="secondary"
          className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm px-4 py-2 text-sm font-medium transition-all"
        >
          <Icon className="h-4 w-4 mr-2" />
          {label}
        </Badge>
      ))}
    </div>
  );
};

export default TrustBadges;
