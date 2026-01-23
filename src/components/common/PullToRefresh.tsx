import { useState, useRef, useCallback, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
  threshold?: number;
}

export default function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 60,
}: PullToRefreshProps) {
  const isMobile = useIsMobile();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const startY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only enable pull-to-refresh when scrolled to top of page
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    // Only allow pulling down when at top
    if (diff > 0 && window.scrollY === 0) {
      // Apply resistance to the pull
      const resistance = 0.4;
      const pull = Math.min(diff * resistance, 80);
      setPullDistance(pull);
    } else {
      setPullDistance(0);
    }
  }, [isPulling, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  // Calculate progress for visual feedback
  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 5 || isRefreshing;
  const isReady = pullDistance >= threshold;

  // On desktop, render children directly without any wrapper
  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator - collapsible div that expands when pulling */}
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden transition-all duration-200",
          !isPulling && !isRefreshing && "duration-200"
        )}
        style={{
          height: isRefreshing ? 48 : pullDistance,
          transition: isPulling ? "none" : "height 0.2s ease-out",
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full bg-background border shadow-sm",
            isReady && "border-primary",
            isRefreshing && "border-primary"
          )}
          style={{
            opacity: showIndicator ? 1 : 0,
            transition: "opacity 0.15s ease-out",
          }}
        >
          <RefreshCw
            className={cn(
              "h-5 w-5 text-muted-foreground transition-colors",
              isReady && "text-primary",
              isRefreshing && "text-primary animate-spin"
            )}
            style={{
              transform: isRefreshing ? undefined : `rotate(${progress * 180}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content - no transform, stays in normal document flow */}
      {children}
    </div>
  );
}
