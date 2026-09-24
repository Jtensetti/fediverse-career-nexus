import { tx } from "@/i18n/tx";
import { REACTION_EMOJIS, type ReactionKey } from "@/lib/reactions";

type NotificationLike = {
  type: string;
  content?: string | null;
  object_type?: string | null;
  actor?: { fullname?: string | null; username?: string | null } | null;
};

/** Full-sentence, per-language notification copy (no concatenated phrase fragments). */
export function notificationText(notification: NotificationLike): string {
  const name = notification.actor?.fullname || notification.actor?.username || tx("notificationText.someone");
  let data: { reaction?: string } = {};
  let plain: string | null = null;
  if (notification.content) {
    try { data = JSON.parse(notification.content) ?? {}; } catch { plain = notification.content; }
  }
  const emoji = REACTION_EMOJIS[(data.reaction || "love") as ReactionKey] || "👍";
  const onComment = notification.object_type === "reply";
  switch (notification.type) {
    case "connection_request": return tx("notificationText.connectionRequest", { name });
    case "connection_accepted": return tx("notificationText.connectionAccepted", { name });
    case "endorsement": return plain ? tx("notificationText.withText", { name, text: plain }) : tx("notificationText.endorsement", { name });
    case "message": return tx("notificationText.message", { name });
    case "follow": return tx("notificationText.follow", { name });
    case "like": return tx(onComment ? "notificationText.reactedComment" : "notificationText.reactedPost", { name, emoji });
    case "boost": return tx("notificationText.boost", { name });
    case "reply": return tx(onComment ? "notificationText.repliedComment" : "notificationText.repliedPost", { name });
    case "mention": return tx("notificationText.mention", { name });
    case "recommendation_request": return tx("notificationText.recommendationRequest", { name });
    case "recommendation_received": return tx("notificationText.recommendationReceived", { name });
    case "message_reaction": return tx("notificationText.reactedMessage", { name, emoji });
    case "article_published": return tx("notificationText.articlePublished", { name });
    default: return plain || tx("notificationText.fallback");
  }
}
