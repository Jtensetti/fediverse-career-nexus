import { useState, useEffect, useCallback } from "react";

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    // Only run on mobile
    if (typeof window === "undefined" || !window.visualViewport) return;

    const viewport = window.visualViewport;

    const updateKeyboardState = () => {
      // Calculate keyboard height using visualViewport
      // The offset from bottom tells us where the viewport ends
      const viewportBottom = viewport.offsetTop + viewport.height;
      const windowHeight = window.innerHeight;
      
      // When keyboard is open, viewport height is smaller and/or offset from bottom
      const keyboardOffset = windowHeight - viewportBottom;
      
      // Also check if viewport itself is smaller (more reliable on iOS)
      const viewportHeightDiff = window.screen.height - viewport.height;
      
      // Use the larger of the two measurements, with threshold to avoid address bar changes
      const effectiveKeyboardHeight = Math.max(keyboardOffset, 0);
      
      // Keyboard is considered open if there's significant height difference
      // and the viewport is significantly smaller than initial
      if (effectiveKeyboardHeight > 100 || (viewport.height < window.innerHeight - 100)) {
        // Use the difference between window inner height and viewport height
        const calculatedHeight = window.innerHeight - viewport.height;
        setKeyboardHeight(Math.max(calculatedHeight, 0));
        setIsKeyboardOpen(true);
      } else {
        setKeyboardHeight(0);
        setIsKeyboardOpen(false);
      }
    };

    viewport.addEventListener("resize", updateKeyboardState);
    viewport.addEventListener("scroll", updateKeyboardState);
    
    // Initial check
    updateKeyboardState();

    return () => {
      viewport.removeEventListener("resize", updateKeyboardState);
      viewport.removeEventListener("scroll", updateKeyboardState);
    };
  }, []);

  return { keyboardHeight, isKeyboardOpen };
}
