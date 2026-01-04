import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { checkAndGrantAchievements } from "@/services/achievementService";
import { toast } from "sonner";

/**
 * Hook to check and grant achievements when triggered
 * Automatically runs on mount and can be triggered manually
 */
export function useAchievementChecker() {
  const { user } = useAuth();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (user?.id && !hasChecked.current) {
      hasChecked.current = true;
      
      // Check achievements after a short delay to not block rendering
      const timer = setTimeout(async () => {
        const granted = await checkAndGrantAchievements(user.id);
        
        if (granted.length > 0) {
          // Show a toast for newly unlocked achievements
          granted.forEach((achievement) => {
            toast.success(`🎉 Achievement Unlocked: ${achievement}!`);
          });
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user?.id]);

  const checkNow = async () => {
    if (!user?.id) return [];
    
    const granted = await checkAndGrantAchievements(user.id);
    
    if (granted.length > 0) {
      granted.forEach((achievement) => {
        toast.success(`🎉 Achievement Unlocked: ${achievement}!`);
      });
    }
    
    return granted;
  };

  return { checkNow };
}
