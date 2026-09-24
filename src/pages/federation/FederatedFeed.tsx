import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FederatedFeed from "@/components/federation/FederatedFeed";
import PostComposer from "@/components/posts/PostComposer";
import FeedSelector from "@/components/social/FeedSelector";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import ProfileCompleteness from "@/components/onboarding/ProfileCompleteness";
import SuggestedActions from "@/components/onboarding/SuggestedActions";
import ReferralWidget from "@/components/social/ReferralWidget";
import { useOnboarding } from "@/hooks/useOnboarding";
import { getFeedPreferences } from "@/services/misc/feedPreferencesService";
import { useQuery } from "@tanstack/react-query";
import { SEOHead } from "@/components/common/SEOHead";
import { useAuth } from "@/contexts/AuthContext";
import Explore from "./Explore";

import { tx } from "@/i18n/tx";
function MemberFeed() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedFeed, setActiveFeed] = useState<string>();
  const [composerOpen, setComposerOpen] = useState(false);
  const [postsCreated, setPostsCreated] = useState(0);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showOnboarding, completeOnboarding, hasChecked } = useOnboarding();

  useEffect(() => {
    if (searchParams.get('compose') === '1') {
      setComposerOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('compose');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Load user's feed preferences
  const { data: preferences } = useQuery({
    queryKey: ['feedPreferences', user?.id],
    queryFn: getFeedPreferences,
  });

  const activeFeed = selectedFeed ?? preferences?.default_feed ?? 'following';

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['federatedFeed'] });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title={t('nav.feed')} description={t('feed.pageDescription')} />
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
          <div className="min-w-0 w-full flex-grow max-w-2xl">
            {/* Feed Header with Selector */}
            <div className="flex items-start justify-between gap-1 mb-6">
              <FeedSelector
                value={activeFeed}
                onChange={setActiveFeed}
              />
              
              <Button 
                variant="ghost" 
                size="icon"
                aria-label={t('feed.refresh')}
                onClick={handleRefresh}
                className="shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
            <PostComposer className="mb-6" open={composerOpen} onOpenChange={setComposerOpen}
              onPostCreated={() => setPostsCreated(count => count + 1)} />
            
            <FederatedFeed 
              className="mb-8" 
              feedType={activeFeed}
              onExploreNolto={() => setActiveFeed('local')}
            />
          </div>
          
          {/* Sidebar */}
          <aside className="lg:w-80 space-y-6 lg:sticky lg:top-4 lg:self-start">
            <ProfileCompleteness />
            <ReferralWidget />
            <SuggestedActions onCreatePost={() => setComposerOpen(true)} refreshKey={postsCreated} />
          </aside>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

function FederatedFeedPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-[60vh] flex items-center justify-center" aria-busy="true"><RefreshCw className="h-6 w-6 animate-spin" aria-label={tx("ui.federatedFeed.laddar")} /></div>;
  return user ? <MemberFeed key={user.id} /> : <Explore />;
}

export default FederatedFeedPage;
