import React, { lazy, Suspense } from "react";

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
import SessionExpiryWarning from "@/components/auth/SessionExpiryWarning";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { AlertBanner } from "@/components/layout/AlertBanner";
import { useAuth } from "./contexts/AuthContext";
import { AuthProvider } from "@/contexts/AuthContext";

// Eager-loaded critical routes (landing, auth, 404)
import Index from "./pages/Index";
import Auth from "./pages/auth/Auth";
import NotFound from "./pages/NotFound";

// Lazy-loaded routes — split into per-route chunks
const Profile = lazy(() => import("./pages/profile/Profile"));
const ProfileEdit = lazy(() => import("./pages/profile/ProfileEdit"));
const Jobs = lazy(() => import("./pages/jobs/Jobs"));
const JobView = lazy(() => import("./pages/jobs/JobView"));
const JobCreate = lazy(() => import("./pages/jobs/JobCreate"));
const JobEdit = lazy(() => import("./pages/jobs/JobEdit"));
const JobManage = lazy(() => import("./pages/jobs/JobManage"));
const FederatedFeedPage = lazy(() => import("./pages/federation/FederatedFeed"));
const AuthCallback = lazy(() => import("./pages/auth/AuthCallback"));
const AuthRecovery = lazy(() => import("./pages/auth/AuthRecovery"));
const ConfirmEmail = lazy(() => import("./pages/auth/ConfirmEmail"));
const MfaRecover = lazy(() => import("./pages/auth/MfaRecover"));
const Events = lazy(() => import("./pages/events/Events"));
const EventCreate = lazy(() => import("./pages/events/EventCreate"));
const EventView = lazy(() => import("./pages/events/EventView"));
const EventEdit = lazy(() => import("./pages/events/EventEdit"));
const Articles = lazy(() => import("./pages/articles/Articles"));
const ArticleView = lazy(() => import("./pages/articles/ArticleView"));
const ArticleCreate = lazy(() => import("./pages/articles/ArticleCreate"));
const ArticleManage = lazy(() => import("./pages/articles/ArticleManage"));
const ArticleEdit = lazy(() => import("./pages/articles/ArticleEdit"));
const Connections = lazy(() => import("./pages/profile/Connections"));
const Messages = lazy(() => import("./pages/messaging/Messages"));
const MessageConversation = lazy(() => import("./pages/messaging/MessageConversation"));
const Notifications = lazy(() => import("./pages/social/Notifications"));
const Mission = lazy(() => import("./pages/info/Mission"));
const Documentation = lazy(() => import("./pages/info/Documentation"));
const FederationGuide = lazy(() => import("./pages/federation/FederationGuide"));
const HelpCenter = lazy(() => import("./pages/info/HelpCenter"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const CodeOfConductPage = lazy(() => import("./pages/legal/CodeOfConductPage"));
const InstanceGuidelinesPage = lazy(() => import("./pages/legal/InstanceGuidelines"));
const CookiesPage = lazy(() => import("./pages/legal/CookiesPage"));
const Instances = lazy(() => import("./pages/federation/Instances"));
const AdminFederationHealth = lazy(() => import("./pages/federation/AdminFederationHealth"));
const AdminInstances = lazy(() => import("./pages/federation/AdminInstances"));
const ModerationDashboard = lazy(() => import("./pages/moderation/ModerationDashboard"));
const PostView = lazy(() => import("./pages/posts/PostView"));
const SavedItemsPage = lazy(() => import("./pages/social/SavedItems"));
const StarterPacks = lazy(() => import("./pages/social/StarterPacks"));
const StarterPackView = lazy(() => import("./pages/social/StarterPackView"));
const StarterPackCreate = lazy(() => import("./pages/social/StarterPackCreate"));
const FeedSettings = lazy(() => import("./pages/settings/FeedSettings"));
const Search = lazy(() => import("./pages/search/Search"));
const Freelancers = lazy(() => import("./pages/social/Freelancers"));
const Followers = lazy(() => import("./pages/profile/Followers"));
const Following = lazy(() => import("./pages/profile/Following"));
const Companies = lazy(() => import("./pages/company/Companies"));
const CompanyProfile = lazy(() => import("./pages/company/CompanyProfile"));
const CompanyCreate = lazy(() => import("./pages/company/CompanyCreate"));
const CompanyEdit = lazy(() => import("./pages/company/CompanyEdit"));
const CompanyAdmin = lazy(() => import("./pages/company/CompanyAdmin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minute before data is considered stale
      gcTime: 300_000, // 5 minutes cache time
      refetchOnMount: true,
      refetchOnWindowFocus: false, // Avoid redundant refetches on tab focus
      retry: 1,
    },
  },
});

// Redirect component for referral join links
function JoinRedirect() {
  const { code } = useParams();
  return <Navigate to={`/auth/signup?ref=${code}`} replace />;
}

// Redirect components for old company URLs
function CompanySlugRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/organisation/${slug}`} replace />;
}
function CompanySlugEditRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/organisation/${slug}/redigera`} replace />;
}
function CompanySlugAdminRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/organisation/${slug}/admin`} replace />;
}

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div
        className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
        aria-label="Laddar sida"
      />
    </div>
  );
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
                <AlertBanner />
                <main id="main-content">
                  <Suspense fallback={<RouteFallback />}>
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
                    <Route path="/cookies" element={<CookiesPage />} />
                    <Route path="/instances" element={<Instances />} />
                    <Route path="/packs" element={<StarterPacks />} />
                    <Route path="/packs/:slug" element={<StarterPackView />} />
                    <Route path="/packs/create" element={<ProtectedRoute><StarterPackCreate /></ProtectedRoute>} />
                    <Route path="/settings/feeds" element={<ProtectedRoute><FeedSettings /></ProtectedRoute>} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/freelancers" element={<Freelancers />} />
                    {/* Organisation routes */}
                    <Route path="/organisationer" element={<Companies />} />
                    <Route path="/organisation/:slug" element={<CompanyProfile />} />
                    <Route path="/organisationer/skapa" element={<ProtectedRoute><CompanyCreate /></ProtectedRoute>} />
                    <Route path="/organisation/:slug/redigera" element={<ProtectedRoute><CompanyEdit /></ProtectedRoute>} />
                    <Route path="/organisation/:slug/admin" element={<ProtectedRoute><CompanyAdmin /></ProtectedRoute>} />
                    {/* Redirects from old company URLs */}
                    <Route path="/companies" element={<Navigate to="/organisationer" replace />} />
                    <Route path="/companies/create" element={<Navigate to="/organisationer/skapa" replace />} />
                    <Route path="/company/:slug" element={<CompanySlugRedirect />} />
                    <Route path="/company/:slug/edit" element={<CompanySlugEditRedirect />} />
                    <Route path="/company/:slug/admin" element={<CompanySlugAdminRedirect />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/login" element={<Auth />} />
            <Route path="/auth/signup" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/recovery" element={<AuthRecovery />} />
            <Route path="/confirm-email" element={<ConfirmEmail />} />
            <Route path="/aterstall-mfa" element={<MfaRecover />} />
            {/* Referral join route - redirects to signup with ref param */}
            <Route path="/join/:code" element={<JoinRedirect />} />
                    <Route path="/jobs" element={<Jobs />} />
                    <Route path="/jobs/:id" element={<JobView />} />
                    <Route path="/jobs/create" element={<ProtectedRoute><JobCreate /></ProtectedRoute>} />
                    <Route path="/jobs/manage" element={<ProtectedRoute><JobManage /></ProtectedRoute>} />
                    <Route path="/jobs/edit/:id" element={<ProtectedRoute><JobEdit /></ProtectedRoute>} />
                    {/* Route aliases for common typos - singular /job → /jobs */}
                    <Route path="/job/create" element={<Navigate to="/jobs/create" replace />} />
                    <Route path="/job/:id" element={<Navigate to="/jobs/:id" replace />} />
                    <Route path="/job" element={<Navigate to="/jobs" replace />} />
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
                    {/* Public profile routes - anyone can view profiles */}
                    <Route path="/profile/:usernameOrId" element={<Profile />} />
                    <Route path="/profile/:userId/followers" element={<Followers />} />
                    <Route path="/profile/:userId/following" element={<Following />} />
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
                  </Suspense>
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
          <p className="text-muted-foreground">Laddar...</p>
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
