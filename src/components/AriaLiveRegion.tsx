import { useEffect, useState } from "react";

interface AriaLiveRegionProps {
  message: string;
  politeness?: "polite" | "assertive";
  clearAfter?: number;
}

/**
 * Accessible live region for screen reader announcements
 * Use this to announce dynamic content changes to screen readers
 */
export default function AriaLiveRegion({
  message,
  politeness = "polite",
  clearAfter = 5000,
}: AriaLiveRegionProps) {
  const [announcement, setAnnouncement] = useState(message);

  useEffect(() => {
    setAnnouncement(message);

    if (clearAfter > 0 && message) {
      const timer = setTimeout(() => setAnnouncement(""), clearAfter);
      return () => clearTimeout(timer);
    }
  }, [message, clearAfter]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}
