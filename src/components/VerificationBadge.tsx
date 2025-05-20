
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, ShieldX, Clock } from "lucide-react";

interface VerificationBadgeProps {
  status: 'unverified' | 'pending' | 'verified' | 'rejected' | undefined;
  className?: string;
}

const VerificationBadge = ({ status, className }: VerificationBadgeProps) => {
  if (!status || status === 'unverified') {
    return null;
  }
  
  const getStatusDetails = () => {
    switch (status) {
      case 'verified':
        return {
          icon: <ShieldCheck className="h-3 w-3 mr-1" />,
          label: "Verified",
          variant: "outline",
          tooltipText: "This information has been verified"
        };
      case 'pending':
        return {
          icon: <Clock className="h-3 w-3 mr-1" />,
          label: "Verification pending",
          variant: "secondary",
          tooltipText: "Verification is in progress"
        };
      case 'rejected':
        return {
          icon: <ShieldX className="h-3 w-3 mr-1" />,
          label: "Verification failed",
          variant: "destructive",
          tooltipText: "This information could not be verified"
        };
      default:
        return null;
    }
  };
  
  const statusDetails = getStatusDetails();
  
  if (!statusDetails) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={statusDetails.variant as any} 
            className={`text-xs inline-flex items-center ${className || ''}`}
          >
            {statusDetails.icon}
            {statusDetails.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{statusDetails.tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VerificationBadge;
