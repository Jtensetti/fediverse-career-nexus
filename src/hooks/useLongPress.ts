import { useRef, useCallback, useState } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
}

interface UseLongPressResult {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
}

/**
 * Hook for detecting long-press on mobile and double-click on desktop
 * - Single tap/click: triggers onClick
 * - Long press (mobile) or double-click (desktop): triggers onLongPress
 */
export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
}: UseLongPressOptions): UseLongPressResult {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const [lastTap, setLastTap] = useState(0);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const handleEnd = useCallback(() => {
    clear();
    if (!isLongPressRef.current && onClick) {
      onClick();
    }
  }, [clear, onClick]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start timer for primary mouse button
    if (e.button === 0) {
      start();
    }
  }, [start]);

  const onMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const onMouseLeave = useCallback(() => {
    clear();
  }, [clear]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Check for double-tap
    const now = Date.now();
    if (now - lastTap < 300) {
      clear();
      onLongPress();
      setLastTap(0);
      return;
    }
    setLastTap(now);
    start();
  }, [start, clear, onLongPress, lastTap]);

  const onTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Desktop double-click handler
  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clear();
    onLongPress();
  }, [onLongPress, clear]);

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
    onDoubleClick,
  };
}
