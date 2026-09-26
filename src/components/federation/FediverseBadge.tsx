
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Globe } from "lucide-react";

import { tx } from "@/i18n/tx";
interface FediverseBadgeProps {
  homeInstance: string;
  className?: string;
}

const FediverseBadge = ({ homeInstance, className }: FediverseBadgeProps) => {
  if (!homeInstance) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={`bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center gap-1 ${className || ''}`}
          >
            <Globe size={12} />
            <span className="text-xs">{tx("ui.fediverseBadge.accountOn", { server: homeInstance })}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="flex items-center gap-1">
            <Globe size={14} />
            {tx("ui.fediverseBadge.accountServer", { server: homeInstance })}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FediverseBadge;
