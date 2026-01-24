import { AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const bgColor = variant === "error" ? "bg-destructive/10" : "bg-yellow-500/10";
  const borderColor = variant === "error" ? "border-destructive/50" : "border-yellow-500/50";
  const textColor = variant === "error" ? "text-destructive" : "text-yellow-700 dark:text-yellow-400";

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
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className={textColor}
              aria-label="Dismiss"
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
