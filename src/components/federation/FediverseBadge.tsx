
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Globe } from "lucide-react";

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
            <Check size={12} />
            <span className="text-xs">Verified via {homeInstance}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="flex items-center gap-1">
            <Globe size={14} />
            This user's identity is verified through their Fediverse account on {homeInstance}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FediverseBadge;
