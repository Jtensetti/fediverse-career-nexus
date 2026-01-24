import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FederatedFeed from "@/components/FederatedFeed";
import PostComposer from "@/components/PostComposer";
import FeedSelector from "@/components/FeedSelector";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import ProfileCompleteness from "@/components/onboarding/ProfileCompleteness";
import SuggestedActions from "@/components/onboarding/SuggestedActions";
import ReferralWidget from "@/components/ReferralWidget";
import { useOnboarding } from "@/hooks/useOnboarding";
import { getFeedPreferences } from "@/services/feedPreferencesService";
import { useQuery } from "@tanstack/react-query";
import type { FeedType } from "@/services/federationService";
import { SEOHead } from "@/components/common/SEOHead";

const FederatedFeedPage = () => {
  const [activeFeed, setActiveFeed] = useState<FeedType>("following");
  const queryClient = useQueryClient();
  const { showOnboarding, completeOnboarding, hasChecked } = useOnboarding();

  // Load user's feed preferences
  const { data: preferences } = useQuery({
    queryKey: ['feedPreferences'],
    queryFn: getFeedPreferences,
  });

  // Set default feed from preferences
  useEffect(() => {
    if (preferences?.default_feed) {
      setActiveFeed(preferences.default_feed as FeedType);
    }
  }, [preferences]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['federatedFeed'] });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title="Feed" description="Your personalized feed on Nolto - the federated professional network." />
      <Navbar />
      
      {/* Onboarding Flow */}
      {hasChecked && (
        <OnboardingFlow 
          open={showOnboarding} 
          onComplete={completeOnboarding} 
        />
      )}
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Feed Column */}
          <div className="flex-grow max-w-2xl">
            {/* Feed Header with Selector */}
            <div className="flex items-center justify-between mb-6">
              <FeedSelector
                value={activeFeed}
                onChange={(val) => setActiveFeed(val as FeedType)}
              />
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleRefresh}
                className="shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
            <PostComposer className="mb-6" />
            
            <FederatedFeed 
              className="mb-8" 
              feedType={activeFeed}
            />
          </div>
          
          {/* Sidebar */}
          <aside className="lg:w-80 space-y-6 lg:sticky lg:top-4 lg:self-start">
            <ProfileCompleteness />
            <ReferralWidget />
            <SuggestedActions />
          </aside>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default FederatedFeedPage;
