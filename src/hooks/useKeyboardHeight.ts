import { useState, useEffect } from "react";

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    // Only run on mobile
    if (typeof window === "undefined" || !window.visualViewport) return;

    const viewport = window.visualViewport;
    let initialHeight = viewport.height;

    const handleResize = () => {
      // The keyboard is open when viewport height is less than initial height
      const heightDiff = initialHeight - viewport.height;
      
      // Threshold to avoid false positives from address bar changes
      if (heightDiff > 100) {
        setKeyboardHeight(heightDiff);
        setIsKeyboardOpen(true);
      } else {
        setKeyboardHeight(0);
        setIsKeyboardOpen(false);
      }
    };

    const handleScroll = () => {
      // Update position when viewport scrolls (keyboard animation)
      handleResize();
    };

    // Set initial height when component mounts
    initialHeight = window.innerHeight;

    viewport.addEventListener("resize", handleResize);
    viewport.addEventListener("scroll", handleScroll);

    return () => {
      viewport.removeEventListener("resize", handleResize);
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return { keyboardHeight, isKeyboardOpen };
}
