import { CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TransparencyScoreProps {
  score: number;
  details?: {
    hasSalary?: boolean;
    hasRemotePolicy?: boolean;
    hasInterviewProcess?: boolean;
    hasResponseTime?: boolean;
    hasTeamSize?: boolean;
    hasGrowthPath?: boolean;
    hasVisaInfo?: boolean;
  };
  showDetails?: boolean;
  className?: string;
}

const scoreLabels = [
  { min: 0, max: 25, label: 'low', color: 'text-red-500' },
  { min: 26, max: 50, label: 'fair', color: 'text-amber-500' },
  { min: 51, max: 75, label: 'good', color: 'text-blue-500' },
  { min: 76, max: 100, label: 'excellent', color: 'text-green-500' },
];

const criteriaList = [
  { key: 'hasSalary', points: 25 },
  { key: 'hasInterviewProcess', points: 20 },
  { key: 'hasRemotePolicy', points: 15 },
  { key: 'hasResponseTime', points: 15 },
  { key: 'hasTeamSize', points: 10 },
  { key: 'hasGrowthPath', points: 10 },
  { key: 'hasVisaInfo', points: 5 },
];

export default function TransparencyScore({
  score,
  details,
  showDetails = false,
  className
}: TransparencyScoreProps) {
  const { t } = useTranslation();
  const scoreInfo = scoreLabels.find(s => score >= s.min && score <= s.max) || scoreLabels[0];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div tabIndex={0} className={cn("flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
          <Badge 
            variant="secondary"
            className={cn(
              "gap-1 font-medium",
              scoreInfo.color.replace('text-', 'bg-').replace('-500', '-500/10')
            )}
          >
            <TrendingUp className={cn("h-3 w-3", scoreInfo.color)} />
            <span className={scoreInfo.color}>{score}%</span>
            <span className="text-muted-foreground">{t("jobTransparency.label")}</span>
          </Badge>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="w-64 p-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">{t("jobTransparency.title")}</span>
            <span className={cn("font-bold", scoreInfo.color)}>{score}%</span>
          </div>
          
          <Progress 
            value={score} 
            className="h-2"
          />

          <p className="text-xs text-muted-foreground">
            {t(`jobTransparency.${scoreInfo.label}`)}
          </p>

          {showDetails && details && (
            <div className="pt-2 border-t space-y-1">
              {criteriaList.map(({ key, points }) => {
                const hasItem = details[key as keyof typeof details];
                return (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    {hasItem ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className={hasItem ? "" : "text-muted-foreground"}>{t(`jobTransparency.criteria.${key}`)}</span>
                    <span className="ml-auto text-muted-foreground">+{points}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
