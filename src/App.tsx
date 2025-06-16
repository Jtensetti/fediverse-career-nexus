
import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Jobs from "./pages/Jobs";
import FederatedFeedPage from "./pages/FederatedFeed";
import Auth from "./pages/Auth";
import Events from "./pages/Events";
import Mission from "./pages/Mission";
import Documentation from "./pages/Documentation";
import FederationGuide from "./pages/FederationGuide";
import HelpCenter from "./pages/HelpCenter";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CodeOfConductPage from "./pages/CodeOfConductPage";
import { useAuth } from "./contexts/AuthContext";

function App() {
  const queryClient = new QueryClient();

  const toasterConfig = {
    position: "top-center" as const,
    duration: 3000,
    className: "z-[100]",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster {...toasterConfig} />
      <TooltipProvider>
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
            <Route path="/auth/:authType" element={<Auth />} />
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
            <Route path="/events" element={<Events />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn()) {
    return <Navigate to="/auth/signin" replace />;
  }

  return <>{children}</>;
}

export default App;
