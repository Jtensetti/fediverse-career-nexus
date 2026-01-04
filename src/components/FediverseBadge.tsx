
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
            className={`bg-blue-500 hover:bg-blue-600 text-white inline-flex items-center gap-1 ${className || ''}`}
          >
            <Check size={12} className="text-white" />
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
