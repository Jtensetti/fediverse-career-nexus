import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";
import { createLogger } from "../_shared/logger.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Notification type to human-readable text
function getNotificationDescription(type: string, content: string | null): string {
  switch (type) {
    case 'connection_request':
      return 'sent you a connection request';
    case 'connection_accepted':
      return 'accepted your connection request';
    case 'endorsement':
      return content || 'endorsed your skill';
    case 'message':
      return 'sent you a message';
    case 'message_reaction':
      return 'reacted to your message';
    case 'follow':
      return 'started following you';
    case 'like':
      return 'liked your post';
    case 'boost':
      return 'boosted your post';
    case 'reply':
      return 'replied to your post';
    case 'mention':
      return 'mentioned you';
    case 'recommendation_request':
      return 'requested a recommendation from you';
    case 'recommendation_received':
      return 'wrote you a recommendation';
    case 'article_published':
      return 'published a new article';
    case 'job_application':
      return 'applied to your job posting';
    default:
      return 'sent you a notification';
  }
}

// Get notification icon emoji for email
function getNotificationEmoji(type: string): string {
  switch (type) {
    case 'connection_request':
    case 'connection_accepted':
    case 'follow':
      return '👤';
    case 'endorsement':
      return '👍';
    case 'message':
      return '💬';
    case 'message_reaction':
      return '😊';
    case 'like':
      return '❤️';
    case 'boost':
      return '🔄';
    case 'reply':
      return '💭';
    case 'mention':
      return '@';
    case 'recommendation_request':
    case 'recommendation_received':
      return '📝';
    case 'article_published':
      return '📰';
    case 'job_application':
      return '💼';
    default:
      return '🔔';
  }
}

interface NotificationWithActor {
  id: string;
  type: string;
  content: string | null;
  created_at: string;
  actor_name: string | null;
}

serve(async (req) => {
  const traceId = crypto.randomUUID();
  const logger = createLogger("send-notification-digest", traceId);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.info({ traceId }, "Starting notification digest job");

    const siteUrl = Deno.env.get("SITE_URL") || "https://nolto.social";
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Nolto <noreply@nolto.social>";

    // Find users with unread notifications older than 36 hours
    // who haven't received a digest email in the last 36 hours
    const thirtyySixHoursAgo = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();

    // Get users with old unread notifications
    const { data: usersWithNotifications, error: usersError } = await supabase
      .from('notifications')
      .select('recipient_id')
      .eq('read', false)
      .lt('created_at', thirtyySixHoursAgo)
      .order('created_at', { ascending: false });

    if (usersError) {
      logger.error({ error: usersError, traceId }, "Error fetching users with notifications");
      throw usersError;
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(usersWithNotifications?.map(n => n.recipient_id) || [])];
    
    if (uniqueUserIds.length === 0) {
      logger.info({ traceId }, "No users with old unread notifications");
      return new Response(JSON.stringify({ success: true, emailsSent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.info({ userCount: uniqueUserIds.length, traceId }, "Found users with unread notifications");

    let emailsSent = 0;
    let errorsEncountered = 0;

    for (const userId of uniqueUserIds) {
      try {
        // Check if we've already sent a digest recently (within 36 hours)
        const { data: tracking } = await supabase
          .from('notification_digest_tracking')
          .select('last_digest_sent_at')
          .eq('user_id', userId)
          .single();

        if (tracking?.last_digest_sent_at) {
          const lastSent = new Date(tracking.last_digest_sent_at);
          const hoursSinceLastDigest = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceLastDigest < 36) {
            logger.debug({ userId, hoursSinceLastDigest, traceId }, "Skipping - digest sent recently");
            continue;
          }
        }

        // Get user's email - first check profiles.contact_email, then fall back to auth email
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('contact_email')
          .eq('id', userId)
          .single();
        
        const contactEmail = userProfile?.contact_email;
        
        // If user has a contact_email set, use that; otherwise try auth email
        let userEmail: string | null = null;
        
        if (contactEmail) {
          userEmail = contactEmail;
        } else {
          // Fall back to auth email
          const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
          if (!userError && user?.email) {
            // Validate it looks like a real email domain (not a Fediverse handle)
            const emailDomain = user.email.split('@')[1];
            // Check if domain has MX-like structure (contains at least one dot after @)
            if (emailDomain && emailDomain.includes('.')) {
              userEmail = user.email;
            }
          }
        }
        
        if (!userEmail) {
          logger.debug({ userId, traceId }, "Skipping - no valid email found");
          continue;
        }

        // Get the user's unread notifications with actor info
        const { data: notifications, error: notifError } = await supabase
          .from('notifications')
          .select(`
            id,
            type,
            content,
            created_at,
            actor_id
          `)
          .eq('recipient_id', userId)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(10);

        if (notifError || !notifications || notifications.length === 0) {
          continue;
        }

        // Enrich with actor names from public_profiles
        const actorIds = [...new Set(notifications.map(n => n.actor_id).filter(Boolean))];
        let actorMap = new Map<string, string>();
        
        if (actorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('public_profiles')
            .select('id, fullname, username')
            .in('id', actorIds);
          
          if (profiles) {
            profiles.forEach(p => {
              actorMap.set(p.id, p.fullname || p.username || 'Someone');
            });
          }
        }

        const enrichedNotifications: NotificationWithActor[] = notifications.map(n => ({
          id: n.id,
          type: n.type,
          content: n.content,
          created_at: n.created_at,
          actor_name: n.actor_id ? actorMap.get(n.actor_id) || 'Someone' : 'Someone'
        }));

        // Build the email HTML
        const notificationListHtml = enrichedNotifications.map(n => {
          const emoji = getNotificationEmoji(n.type);
          const description = getNotificationDescription(n.type, n.content);
          const timeAgo = formatTimeAgo(new Date(n.created_at));
          
          return `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="40" style="vertical-align: top; padding-right: 12px;">
                      <span style="font-size: 20px;">${emoji}</span>
                    </td>
                    <td style="vertical-align: top;">
                      <p style="margin: 0; font-size: 15px; color: #1a1a1a; line-height: 1.4;">
                        <strong>${escapeHtml(n.actor_name || 'Someone')}</strong> ${escapeHtml(description)}
                      </p>
                      <p style="margin: 4px 0 0 0; font-size: 13px; color: #6a6a6a;">
                        ${timeAgo}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;
        }).join('');

        const totalUnread = notifications.length;
        const moreText = totalUnread >= 10 ? ' (and possibly more)' : '';

        const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You have notifications waiting</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 24px 32px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #ffffff;">Nolto</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #1a1a1a;">
                You have ${totalUnread} unread notification${totalUnread > 1 ? 's' : ''}${moreText}
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #6a6a6a; line-height: 1.5;">
                Here's what you've missed on Nolto:
              </p>
              
              <!-- Notifications List -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${notificationListHtml}
              </table>
              
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 32px;">
                <tr>
                  <td align="center">
                    <a href="${siteUrl}/notifications" 
                       style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 15px; font-weight: 500;">
                      View your notifications
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #9a9a9a; text-align: center;">
                You're receiving this because you have unread notifications on Nolto.
              </p>
              <p style="margin: 0; font-size: 13px; color: #9a9a9a; text-align: center;">
                <a href="${siteUrl}/profile/edit" style="color: #6a6a6a; text-decoration: underline;">Manage email preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;

        // Send the email
        const { error: emailError } = await resend.emails.send({
          from: fromEmail,
          to: [userEmail],
          subject: `You have ${totalUnread} unread notification${totalUnread > 1 ? 's' : ''} on Nolto`,
          html: emailHtml,
        });

        if (emailError) {
          logger.error({ userId, error: emailError, traceId }, "Failed to send digest email");
          errorsEncountered++;
          continue;
        }

        // Update tracking record
        await supabase
          .from('notification_digest_tracking')
          .upsert({
            user_id: userId,
            last_digest_sent_at: new Date().toISOString(),
            last_notification_check_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        emailsSent++;
        logger.info({ userId, notificationCount: totalUnread, traceId }, "Digest email sent");

      } catch (userError) {
        logger.error({ userId, error: userError, traceId }, "Error processing user for digest");
        errorsEncountered++;
      }
    }

    logger.info({ emailsSent, errorsEncountered, traceId }, "Notification digest job complete");

    return new Response(JSON.stringify({ 
      success: true, 
      emailsSent,
      errorsEncountered,
      traceId
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    logger.error({ error: error.message, traceId }, "Error in notification digest function");
    return new Response(JSON.stringify({ error: error.message, traceId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper to escape HTML
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Format time ago for emails
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
}
