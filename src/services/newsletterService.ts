
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NewsletterSubscription {
  id: string;
  email: string;
  confirmed: boolean;
  confirm_token: string | null;
  created_at: string;
  unsubscribed_at: string | null;
}

// Subscribe to newsletter (public endpoint - no auth required)
export const subscribeToNewsletter = async (email: string): Promise<NewsletterSubscription | null> => {
  try {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .upsert({
        email: email,
        confirmed: false, // Require confirmation by default
        unsubscribed_at: null,
      })
      .select()
      .single();
    
    if (error) {
      toast.error(`Error subscribing to newsletter: ${error.message}`);
      return null;
    }
    
    toast.success('Successfully subscribed to newsletter!');
    return data as NewsletterSubscription;
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    toast.error('Failed to subscribe to newsletter. Please try again.');
    return null;
  }
};

// Unsubscribe from newsletter
export const unsubscribeFromNewsletter = async (email: string): Promise<NewsletterSubscription | null> => {
  try {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .update({
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('email', email)
      .select()
      .single();
    
    if (error) {
      toast.error(`Error unsubscribing from newsletter: ${error.message}`);
      return null;
    }
    
    toast.success('Successfully unsubscribed from newsletter.');
    return data as NewsletterSubscription;
  } catch (error) {
    console.error('Error unsubscribing from newsletter:', error);
    toast.error('Failed to unsubscribe from newsletter. Please try again.');
    return null;
  }
};

// Check if email is subscribed to newsletter
export const checkNewsletterSubscription = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('confirmed, unsubscribed_at')
      .eq('email', email)
      .maybeSingle();
    
    if (error || !data) {
      return false;
    }
    
    return data.confirmed === true && data.unsubscribed_at === null;
  } catch (error) {
    console.error('Error checking newsletter subscription:', error);
    return false;
  }
};

// Get all newsletter subscribers (admin only)
export const getNewsletterSubscribers = async (): Promise<NewsletterSubscription[]> => {
  try {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .is('unsubscribed_at', null)
      .eq('confirmed', true);
    
    if (error) {
      console.error('Error fetching newsletter subscribers:', error);
      return [];
    }
    
    return (data || []) as NewsletterSubscription[];
  } catch (error) {
    console.error('Error fetching newsletter subscribers:', error);
    return [];
  }
};
