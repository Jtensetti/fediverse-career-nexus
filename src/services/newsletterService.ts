
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NewsletterSubscription {
  id: string;
  user_id: string;
  email: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
  is_active: boolean;
}

// Subscribe to newsletter
export const subscribeToNewsletter = async (email: string): Promise<NewsletterSubscription | null> => {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('You must be logged in to subscribe to the newsletter');
      return null;
    }
    
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .upsert({
        user_id: user.id,
        email: email,
        is_active: true,
        unsubscribed_at: null,
      })
      .select()
      .single();
    
    if (error) {
      toast.error(`Error subscribing to newsletter: ${error.message}`);
      return null;
    }
    
    toast.success('Successfully subscribed to newsletter!');
    return data;
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    toast.error('Failed to subscribe to newsletter. Please try again.');
    return null;
  }
};

// Unsubscribe from newsletter
export const unsubscribeFromNewsletter = async (email: string): Promise<NewsletterSubscription | null> => {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('You must be logged in to unsubscribe from the newsletter');
      return null;
    }
    
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .update({
        is_active: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('email', email)
      .select()
      .single();
    
    if (error) {
      toast.error(`Error unsubscribing from newsletter: ${error.message}`);
      return null;
    }
    
    toast.success('Successfully unsubscribed from newsletter.');
    return data;
  } catch (error) {
    console.error('Error unsubscribing from newsletter:', error);
    toast.error('Failed to unsubscribe from newsletter. Please try again.');
    return null;
  }
};

// Check if user is subscribed to newsletter
export const checkNewsletterSubscription = async (email: string): Promise<boolean> => {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }
    
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .select('is_active')
      .eq('user_id', user.id)
      .eq('email', email)
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return data.is_active;
  } catch (error) {
    console.error('Error checking newsletter subscription:', error);
    return false;
  }
};

// Get all newsletter subscribers
export const getNewsletterSubscribers = async (): Promise<NewsletterSubscription[]> => {
  try {
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching newsletter subscribers:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching newsletter subscribers:', error);
    return [];
  }
};
