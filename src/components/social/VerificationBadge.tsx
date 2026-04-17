
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, ShieldX, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface VerificationBadgeProps {
  status: string | undefined;
  /** Optional organisation type (from companies.industry) — drives label like "Verifierad kommun" */
  organisationType?: string | null;
  className?: string;
}

/**
 * Map an organisation type string (stored in companies.industry) to a
 * Swedish-public-sector verified label. Falls back to generic "Verifierad".
 */
function getVerifiedLabelForOrgType(orgType?: string | null): string | null {
  if (!orgType) return null;
  const t = orgType.toLowerCase();
  if (t.includes("kommun") && !t.includes("kommunalt")) return "Verifierad kommun";
  if (t.includes("region")) return "Verifierad region";
  if (t.includes("statlig myndighet")) return "Verifierad myndighet";
  if (t.includes("statligt bolag")) return "Verifierat statligt bolag";
  if (t.includes("kommunalt bolag")) return "Verifierat kommunalt bolag";
  if (t.includes("förbund") || t.includes("samverkansorgan")) return "Verifierat samverkansorgan";
  if (t.includes("universitet") || t.includes("högskola")) return "Verifierat lärosäte";
  if (t.includes("folkhögskola")) return "Verifierad folkhögskola";
  if (t.includes("civilsamhälle") || t.includes("ideell")) return "Verifierad ideell organisation";
  return null;
}

const VerificationBadge = ({ status, organisationType, className }: VerificationBadgeProps) => {
  const { t } = useTranslation();
  
  if (!status || status === 'unverified') {
    return null;
  }
  
  const getStatusDetails = () => {
    switch (status) {
      case 'verified': {
        const orgLabel = getVerifiedLabelForOrgType(organisationType);
        return {
          icon: <ShieldCheck className="h-3 w-3 mr-1" />,
          label: orgLabel ?? t('verification.verified'),
          variant: "outline",
          tooltipText: orgLabel
            ? `${orgLabel} – identitet bekräftad av Samverkan.`
            : t('verification.verifiedTooltip')
        };
      }
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
