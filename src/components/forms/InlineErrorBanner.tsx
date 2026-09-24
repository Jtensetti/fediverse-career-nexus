import { AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

import { tx } from "@/i18n/tx";
interface InlineErrorBannerProps {
  message: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: "error" | "warning";
  className?: string;
}

export function InlineErrorBanner({
  message,
  details,
  onRetry,
  onDismiss,
  variant = "error",
  className = "",
}: InlineErrorBannerProps) {
  const Icon = variant === "error" ? XCircle : AlertTriangle;
  const bgColor = variant === "error" ? "bg-destructive/10" : "bg-warning/10";
  const borderColor = variant === "error" ? "border-destructive/50" : "border-warning/50";
  const textColor = variant === "error" ? "text-destructive" : "text-warning-foreground";

  return (
    <div
      className={`rounded-lg border ${borderColor} ${bgColor} p-4 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${textColor} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${textColor}`}>{message}</p>
          {details && (
            <p className={`mt-1 text-sm ${textColor}/80`}>{details}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onRetry && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className={textColor}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {tx("ui.inlineErrorBanner.retry")}
            </Button>
          )}
          {onDismiss && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className={textColor}
              aria-label={tx("ui.inlineErrorBanner.dismiss")}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default InlineErrorBanner;
