
import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
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
import FederatedFeedPage from "./pages/FederatedFeed";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Events from "./pages/Events";
import EventCreate from "./pages/EventCreate";
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
import PostView from "./pages/PostView";
import { useAuth } from "./contexts/AuthContext";
import { AuthProvider } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

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
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/login" element={<Auth />} />
            <Route path="/auth/signup" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/jobs" element={<Jobs />} />
                    <Route path="/jobs/:id" element={<JobView />} />
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
                    <Route
                      path="/profile/:usernameOrId"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/events"
                      element={
                        <ProtectedRoute>
                          <Events />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/events/create"
                      element={
                        <ProtectedRoute>
                          <EventCreate />
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
