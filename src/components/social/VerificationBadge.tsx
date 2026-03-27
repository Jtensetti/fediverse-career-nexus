
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, ShieldX, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface VerificationBadgeProps {
  status: string | undefined;
  className?: string;
}

const VerificationBadge = ({ status, className }: VerificationBadgeProps) => {
  const { t } = useTranslation();
  
  if (!status || status === 'unverified') {
    return null;
  }
  
  const getStatusDetails = () => {
    switch (status) {
      case 'verified':
        return {
          icon: <ShieldCheck className="h-3 w-3 mr-1" />,
          label: t('verification.verified'),
          variant: "outline",
          tooltipText: t('verification.verifiedTooltip')
        };
      case 'pending':
        return {
          icon: <Clock className="h-3 w-3 mr-1" />,
          label: t('verification.pending'),
          variant: "secondary",
          tooltipText: t('verification.pendingTooltip')
        };
      case 'rejected':
        return {
          icon: <ShieldX className="h-3 w-3 mr-1" />,
          label: t('verification.rejected'),
          variant: "destructive",
          tooltipText: t('verification.rejectedTooltip')
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
