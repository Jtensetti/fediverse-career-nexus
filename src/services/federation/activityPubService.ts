
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ActivityPubActivity {
  "@context": string;
  type: string;
  actor: string;
  object: any;
  to?: string[];
  cc?: string[];
  published?: string;
  id?: string;
}

// Create a Create activity for a job post
export const createJobPostActivity = async (jobPost: any): Promise<ActivityPubActivity | null> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      toast.error('You must be logged in to create activities');
      return null;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('public_profiles')
      .select('username')
      .eq('id', session.session.user.id)
      .single();

    if (!profile?.username) {
      toast.error('User profile not found');
      return null;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      toast.error('VITE_SUPABASE_URL not set');
      return null;
    }
    const actorUrl = `${supabaseUrl}/functions/v1/actor/${profile.username}`;

    // Create the Note/Article object for the job post
    const jobObject = {
      type: "Article",
      name: jobPost.title,
      content: `<h2>${jobPost.title}</h2><p><strong>Company:</strong> ${jobPost.company_name}</p><p><strong>Location:</strong> ${jobPost.location}</p><p><strong>Type:</strong> ${jobPost.job_type.replace('_', ' ')}</p>${jobPost.salary_min && jobPost.salary_max ? `<p><strong>Salary:</strong> ${jobPost.salary_currency} ${jobPost.salary_min.toLocaleString()} - ${jobPost.salary_max.toLocaleString()}</p>` : ''}<p><strong>Remote:</strong> ${jobPost.remote_allowed ? 'Yes' : 'No'}</p><div>${jobPost.description}</div>${jobPost.skills?.length ? `<p><strong>Skills:</strong> ${jobPost.skills.join(', ')}</p>` : ''}`,
      summary: `New job posting: ${jobPost.title} at ${jobPost.company_name}`,
      attributedTo: actorUrl,
      tag: jobPost.skills?.map((skill: string) => ({
        type: "Hashtag",
        name: `#${skill.replace(/\s+/g, '')}`,
        href: `${supabaseUrl}/tags/${encodeURIComponent(skill)}`
      })) || [],
      // Add job-specific properties
      jobTitle: jobPost.title,
      hiringOrganization: {
        type: "Organization",
        name: jobPost.company_name
      },
      jobLocation: {
        type: "Place",
        name: jobPost.location
      },
      employmentType: jobPost.job_type,
      ...(jobPost.salary_min && jobPost.salary_max && {
        baseSalary: {
          type: "MonetaryAmount",
          currency: jobPost.salary_currency,
          value: {
            minValue: jobPost.salary_min,
            maxValue: jobPost.salary_max
          }
        }
      }),
      ...(jobPost.application_url && {
        applicationUrl: jobPost.application_url
      }),
      ...(jobPost.contact_email && {
        contactEmail: jobPost.contact_email
      })
    };

    // Create the Create activity
    const activity: ActivityPubActivity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Create",
      actor: actorUrl,
      object: jobObject,
      to: ["https://www.w3.org/ns/activitystreams#Public"],
      cc: [`${actorUrl}/followers`]
    };

    return activity;
  } catch (error) {
    console.error('Error creating job post activity:', error);
    toast.error('Failed to create activity');
    return null;
  }
};

// Send an activity to the outbox
export const sendActivityToOutbox = async (activity: ActivityPubActivity): Promise<boolean> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      toast.error('You must be logged in to send activities');
      return false;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('public_profiles')
      .select('username')
      .eq('id', session.session.user.id)
      .single();

    if (!profile?.username) {
      toast.error('User profile not found');
      return false;
    }

    // Send to outbox via Supabase function
    const { data, error } = await supabase.functions.invoke('outbox', {
      body: activity,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session.access_token}`
      }
    });

    if (error) {
      console.error('Error sending activity to outbox:', error);
      toast.error('Failed to federate job post');
      return false;
    }

    console.log('Activity sent to outbox:', data);
    return true;
  } catch (error) {
    console.error('Error in sendActivityToOutbox:', error);
    toast.error('Failed to send activity');
    return false;
  }
};

// Create and send a job post activity
export const federateJobPost = async (jobPost: any): Promise<boolean> => {
  const activity = await createJobPostActivity(jobPost);
  if (!activity) {
    return false;
  }

  return await sendActivityToOutbox(activity);
};
