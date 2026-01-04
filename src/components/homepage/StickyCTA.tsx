import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const StickyCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past the hero section (approximately 90vh)
      const scrollThreshold = window.innerHeight * 0.9;
      const shouldShow = window.scrollY > scrollThreshold && !isDismissed;
      setIsVisible(shouldShow);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-0 md:bottom-6 md:left-auto md:right-6"
        >
          <div className="bg-card border shadow-2xl rounded-xl p-4 flex items-center gap-4 max-w-md mx-auto md:mx-0">
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm md:text-base">
                Ready to join?
              </p>
              <p className="text-xs md:text-sm text-muted-foreground">
                Create your free account today
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                <Link to="/auth/signup">
                  Get Started
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyCTA;
