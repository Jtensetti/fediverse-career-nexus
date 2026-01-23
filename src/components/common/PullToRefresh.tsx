import { useState, useRef, useCallback, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
  threshold?: number;
  maxPull?: number;
}

export default function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 80,
  maxPull = 120,
}: PullToRefreshProps) {
  const isMobile = useIsMobile();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only enable pull-to-refresh when scrolled to top
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    // Only allow pulling down
    if (diff > 0) {
      // Apply resistance to the pull
      const resistance = 0.5;
      const pull = Math.min(diff * resistance, maxPull);
      setPullDistance(pull);
      
      // Prevent default scroll when pulling
      if (pull > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, isRefreshing, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold); // Keep indicator visible during refresh
      
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
  const showIndicator = pullDistance > 10 || isRefreshing;
  const isReady = pullDistance >= threshold;

  // Only render pull-to-refresh on mobile
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute left-0 right-0 flex items-center justify-center transition-opacity duration-200 z-10",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: -40,
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? "none" : "transform 0.2s ease-out",
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full bg-background border shadow-sm",
            isReady && "border-primary",
            isRefreshing && "border-primary"
          )}
        >
          <RefreshCw
            className={cn(
              "h-5 w-5 text-muted-foreground transition-colors",
              isReady && "text-primary",
              isRefreshing && "text-primary animate-spin"
            )}
            style={{
              transform: isRefreshing ? undefined : `rotate(${progress * 180}deg)`,
              transition: isPulling ? "none" : "transform 0.2s ease-out",
            }}
          />
        </div>
      </div>

      {/* Content with pull offset */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
