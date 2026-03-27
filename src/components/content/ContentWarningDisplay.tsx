import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContentWarningDisplayProps {
  warning: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export default function ContentWarningDisplay({
  warning,
  children,
  defaultExpanded = false,
  className
}: ContentWarningDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!warning) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", className)}>
      {/* Warning banner */}
      <div 
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border",
          "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
        )}
      >
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-sm font-medium">
          Content warning: {warning}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-1 text-inherit hover:text-inherit hover:bg-amber-500/20"
        >
          {isExpanded ? (
            <>
              Hide
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Show
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="mt-2">
          {children}
        </div>
      )}
    </div>
  );
}
