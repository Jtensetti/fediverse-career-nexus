
import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import Jobs from "./pages/Jobs";
import FederatedFeedPage from "./pages/FederatedFeed";
import Auth from "./pages/Auth";
import Events from "./pages/Events";
import EventCreate from "./pages/EventCreate";
import Articles from "./pages/Articles";
import ArticleCreate from "./pages/ArticleCreate";
import Connections from "./pages/Connections";
import Messages from "./pages/Messages";
import Mission from "./pages/Mission";
import Documentation from "./pages/Documentation";
import FederationGuide from "./pages/FederationGuide";
import HelpCenter from "./pages/HelpCenter";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CodeOfConductPage from "./pages/CodeOfConductPage";
import InstanceGuidelinesPage from "./pages/InstanceGuidelines";
import { useAuth } from "./contexts/AuthContext";
import { AuthProvider } from "@/contexts/AuthContext";

function App() {
  const queryClient = new QueryClient();

  const toasterConfig = {
    position: "top-center" as const,
    duration: 3000,
    className: "z-[100]",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HelmetProvider>
          <TooltipProvider>
            <Toaster {...toasterConfig} />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/mission" element={<Mission />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/federation" element={<FederationGuide />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/code-of-conduct" element={<CodeOfConductPage />} />
                <Route path="/instance-guidelines" element={<InstanceGuidelinesPage />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/login" element={<Auth />} />
                <Route path="/feed" element={<FederatedFeedPage />} />
                <Route
                  path="/profile/:actorId"
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
                <Route path="/jobs" element={<Jobs />} />
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
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </HelmetProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bondy-primary mx-auto mb-4"></div>
          <p>Loading...</p>
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
