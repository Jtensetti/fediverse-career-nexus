
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FederatedFeed from "@/components/FederatedFeed";
import PostComposer from "@/components/PostComposer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import ProfileCompleteness from "@/components/onboarding/ProfileCompleteness";
import SuggestedActions from "@/components/onboarding/SuggestedActions";
import ReferralWidget from "@/components/ReferralWidget";
import AchievementBadges from "@/components/AchievementBadges";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";

const FederatedFeedPage = () => {
  const [feedSource, setFeedSource] = useState<string>("all");
  const queryClient = useQueryClient();
  const { showOnboarding, completeOnboarding, hasChecked } = useOnboarding();
  
  // Check for achievements when user visits the feed
  useAchievementChecker();

  const handleRefresh = () => {
    // Invalidate the feed query to force a refresh
    queryClient.invalidateQueries({ queryKey: ['federatedFeed'] });
  };

  return (
    <div className="min-h-screen flex flex-col">
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
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
                <Globe className="h-7 w-7" />
                Federated Feed
              </h1>
              
              <div className="flex items-center gap-2">
                <Select value={feedSource} onValueChange={setFeedSource}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="local">Local Only</SelectItem>
                    <SelectItem value="remote">Remote Only</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" onClick={handleRefresh}>Refresh</Button>
              </div>
            </div>
            
            <PostComposer className="mb-6" />
            
            <FederatedFeed className="mb-8" sourceFilter={feedSource} />
          </div>
          
          {/* Sidebar */}
          <aside className="lg:w-80 space-y-6 lg:sticky lg:top-4 lg:self-start">
            <ProfileCompleteness />
            <AchievementBadges compact />
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
