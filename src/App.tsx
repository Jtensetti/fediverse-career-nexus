import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/common";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import { useAuth, AuthProvider } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <ErrorBoundary>
              <BrowserRouter>
                <AuthProvider>
                  <Toaster position="top-center" duration={3000} />
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<AuthLoginOnly />} />
                    <Route path="/auth/login" element={<AuthLoginOnly />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    {/* Everything else → home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AuthProvider>
              </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

/** Auth page wrapper that redirects to / if already logged in */
function AuthLoginOnly() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
}

export default App;
