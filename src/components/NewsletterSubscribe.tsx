
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { subscribeToNewsletter, unsubscribeFromNewsletter, checkNewsletterSubscription } from "@/services/newsletterService";
import { supabase } from "@/integrations/supabase/client";

const NewsletterSubscribe = () => {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        setEmail(user.email);
        const subscriptionStatus = await checkNewsletterSubscription(user.email);
        setIsSubscribed(subscriptionStatus);
      }
    };

    fetchUserData();
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const result = await subscribeToNewsletter(email);
      if (result) {
        setIsSubscribed(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!email) return;

    setIsLoading(true);
    try {
      const result = await unsubscribeFromNewsletter(email);
      if (result) {
        setIsSubscribed(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!userEmail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Subscribe to our newsletter</CardTitle>
          <CardDescription>
            Please sign in to subscribe to our newsletter.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Newsletter</CardTitle>
        <CardDescription>
          {isSubscribed 
            ? "You're subscribed to receive updates about new articles." 
            : "Subscribe to receive updates about new articles."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSubscribed ? (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 text-green-700 rounded-md flex items-center gap-2">
              <Mail size={16} />
              <span>You're subscribed with: {email}</span>
            </div>
            <Button 
              variant="outline" 
              onClick={handleUnsubscribe} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Processing..." : "Unsubscribe"}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || !!userEmail}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Processing..." : "Subscribe"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default NewsletterSubscribe;
