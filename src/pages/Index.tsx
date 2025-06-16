
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Home from "./Home";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect automatically, let user choose when to sign in
  }, [user]);

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

  // If user is authenticated, show the main app
  if (user) {
    return <Home />;
  }

  // If not authenticated, show welcome page with sign in option
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Bondy
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect with professionals, share your thoughts, and build your network in a federated social platform.
          </p>
          
          <div className="space-y-4 max-w-md mx-auto">
            <Button
              onClick={() => navigate("/auth")}
              className="w-full bg-bondy-primary hover:bg-bondy-primary/90"
              size="lg"
            >
              Sign In / Sign Up
            </Button>
          </div>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">🌐 Federated</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-600">
                Connect with users across the fediverse using ActivityPub protocol
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">💼 Professional</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-600">
                Build your professional network and showcase your expertise
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">🔒 Privacy-First</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-600">
                Control your data and decide who can see your content
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
