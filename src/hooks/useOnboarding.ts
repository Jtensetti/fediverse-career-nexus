import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const ONBOARDING_COMPLETE_KEY = "nolto-onboarding-complete";

export const useOnboarding = () => {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasChecked(true);
      return;
    }

    // Check if onboarding was completed
    const completedUsers = JSON.parse(
      localStorage.getItem(ONBOARDING_COMPLETE_KEY) || "[]"
    );

    if (!completedUsers.includes(user.id)) {
      // Check if user is new (created within last 5 minutes)
      const createdAt = new Date(user.created_at || Date.now());
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      if (createdAt > fiveMinutesAgo) {
        setShowOnboarding(true);
      }
    }

    setHasChecked(true);
  }, [user]);

  const completeOnboarding = () => {
    if (!user) return;

    const completedUsers = JSON.parse(
      localStorage.getItem(ONBOARDING_COMPLETE_KEY) || "[]"
    );

    if (!completedUsers.includes(user.id)) {
      completedUsers.push(user.id);
      localStorage.setItem(ONBOARDING_COMPLETE_KEY, JSON.stringify(completedUsers));
    }

    setShowOnboarding(false);
  };

  return {
    showOnboarding,
    completeOnboarding,
    hasChecked,
  };
};
