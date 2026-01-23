
import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary, SkipToContent } from "@/components/common";
import SessionExpiryWarning from "@/components/SessionExpiryWarning";
import MobileBottomNav from "@/components/MobileBottomNav";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import Jobs from "./pages/Jobs";
import JobView from "./pages/JobView";
import JobCreate from "./pages/JobCreate";
import JobEdit from "./pages/JobEdit";
import JobManage from "./pages/JobManage";
import FederatedFeedPage from "./pages/FederatedFeed";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import AuthRecovery from "./pages/AuthRecovery";
import ConfirmEmail from "./pages/ConfirmEmail";
import Events from "./pages/Events";
import EventCreate from "./pages/EventCreate";
import EventView from "./pages/EventView";
import EventEdit from "./pages/EventEdit";
import NotFound from "./pages/NotFound";
import Articles from "./pages/Articles";
import ArticleView from "./pages/ArticleView";
import ArticleCreate from "./pages/ArticleCreate";
import ArticleManage from "./pages/ArticleManage";
import ArticleEdit from "./pages/ArticleEdit";
import Connections from "./pages/Connections";
import Messages from "./pages/Messages";
import MessageConversation from "./pages/MessageConversation";
import Notifications from "./pages/Notifications";
import Mission from "./pages/Mission";
import Documentation from "./pages/Documentation";
import FederationGuide from "./pages/FederationGuide";
import HelpCenter from "./pages/HelpCenter";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CodeOfConductPage from "./pages/CodeOfConductPage";
import InstanceGuidelinesPage from "./pages/InstanceGuidelines";
import Instances from "./pages/Instances";
import AdminFederationHealth from "./pages/AdminFederationHealth";
import AdminInstances from "./pages/AdminInstances";
import ModerationDashboard from "./pages/ModerationDashboard";
import PostView from "./pages/PostView";
import SavedItemsPage from "./pages/SavedItems";
import StarterPacks from "./pages/StarterPacks";
import StarterPackView from "./pages/StarterPackView";
import StarterPackCreate from "./pages/StarterPackCreate";
import FeedSettings from "./pages/FeedSettings";
import Search from "./pages/Search";
import Freelancers from "./pages/Freelancers";
import { useAuth } from "./contexts/AuthContext";
import { AuthProvider } from "@/contexts/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds before data is considered stale
      gcTime: 300000, // 5 minutes cache time (formerly cacheTime)
      refetchOnMount: true, // Refetch when component mounts for fresh data
      refetchOnWindowFocus: true, // Refetch when user returns to tab
      retry: 1, // Only retry once on failure
    },
  },
});

// Redirect component for referral join links
function JoinRedirect() {
  const { code } = useParams();
  return <Navigate to={`/auth/signup?ref=${code}`} replace />;
}

function App() {
  const toasterConfig = {
    position: "top-center" as const,
    duration: 3000,
    className: "z-[100]",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <ErrorBoundary>
              <BrowserRouter>
                <AuthProvider>
                <SkipToContent />
                <Toaster {...toasterConfig} />
                <SessionExpiryWarning />
                <main id="main-content">
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/mission" element={<Mission />} />
                    <Route path="/documentation" element={<Documentation />} />
                    <Route path="/help" element={<HelpCenter />} />
                    <Route path="/federation" element={<FederationGuide />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/code-of-conduct" element={<CodeOfConductPage />} />
                    <Route path="/instance-guidelines" element={<InstanceGuidelinesPage />} />
                    <Route path="/instances" element={<Instances />} />
                    <Route path="/packs" element={<StarterPacks />} />
                    <Route path="/packs/:slug" element={<StarterPackView />} />
                    <Route path="/packs/create" element={<ProtectedRoute><StarterPackCreate /></ProtectedRoute>} />
                    <Route path="/settings/feeds" element={<ProtectedRoute><FeedSettings /></ProtectedRoute>} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/freelancers" element={<Freelancers />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/login" element={<Auth />} />
            <Route path="/auth/signup" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/recovery" element={<AuthRecovery />} />
            <Route path="/confirm-email" element={<ConfirmEmail />} />
            {/* Referral join route - redirects to signup with ref param */}
            <Route path="/join/:code" element={<JoinRedirect />} />
                    <Route path="/jobs" element={<Jobs />} />
                    <Route path="/jobs/:id" element={<JobView />} />
                    <Route path="/jobs/create" element={<ProtectedRoute><JobCreate /></ProtectedRoute>} />
                    <Route path="/jobs/manage" element={<ProtectedRoute><JobManage /></ProtectedRoute>} />
                    <Route path="/jobs/edit/:id" element={<ProtectedRoute><JobEdit /></ProtectedRoute>} />
                    <Route path="/articles/:slug" element={<ArticleView />} />
                    <Route path="/post/:postId" element={<PostView />} />

                    {/* Protected routes */}
                    <Route
                      path="/feed"
                      element={
                        <ProtectedRoute>
                          <FederatedFeedPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile/edit"
                      element={
                        <ProtectedRoute>
                          <ProfileEdit />
                        </ProtectedRoute>
                      }
                    />
                    {/* Public profile route - anyone can view profiles */}
                    <Route path="/profile/:usernameOrId" element={<Profile />} />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/saved"
                      element={
                        <ProtectedRoute>
                          <SavedItemsPage />
                        </ProtectedRoute>
                      }
                    />
                    {/* Events - list and detail are public, create/edit are protected */}
                    <Route path="/events" element={<Events />} />
                    <Route path="/events/:id" element={<EventView />} />
                    <Route
                      path="/events/create"
                      element={
                        <ProtectedRoute>
                          <EventCreate />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/events/edit/:id"
                      element={
                        <ProtectedRoute>
                          <EventEdit />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/articles"
                      element={
                        <ProtectedRoute>
                          <Articles />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/articles/create"
                      element={
                        <ProtectedRoute>
                          <ArticleCreate />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/articles/manage"
                      element={
                        <ProtectedRoute>
                          <ArticleManage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/articles/edit/:id"
                      element={
                        <ProtectedRoute>
                          <ArticleEdit />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/connections"
                      element={
                        <ProtectedRoute>
                          <Connections />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/messages"
                      element={
                        <ProtectedRoute>
                          <Messages />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/messages/:conversationId"
                      element={
                        <ProtectedRoute>
                          <MessageConversation />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/notifications"
                      element={
                        <ProtectedRoute>
                          <Notifications />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/federation-health"
                      element={
                        <ProtectedRoute>
                          <AdminFederationHealth />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/instances"
                      element={
                        <ProtectedRoute>
                          <AdminInstances />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/moderation"
                      element={
                        <ProtectedRoute>
                          <ModerationDashboard />
                        </ProtectedRoute>
                      }
                    />
                    {/* Catch-all for 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <MobileBottomNav />
                </AuthProvider>
              </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

export default App;
