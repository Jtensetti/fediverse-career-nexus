import DOMPurify from "dompurify";
import { getProxiedMediaUrl } from "@/services/federation/federationService";
import { getSamverkanInstanceDomain } from "@/lib/federation";
import type { FederatedPost } from "@/services/federation/federationService";

/** Extract raw content from different ActivityPub formats, sanitized */
export function getRawContent(post: FederatedPost): string {
  const isQuoteRepost = post.type === 'Announce' || post.content?.isQuoteRepost;
  let rawContent = '';

  if (isQuoteRepost) {
    rawContent = post.content.content || '';
  } else if (post.type === 'Create' && post.content.object?.content) {
    const objectContent = post.content.object.content;
    rawContent = typeof objectContent === 'string' ? objectContent : '';
  } else if (post.content.content) {
    const contentValue = post.content.content;
    rawContent = typeof contentValue === 'string' ? contentValue : '';
  } else {
    rawContent = 'Inget innehåll tillgängligt';
  }

  return DOMPurify.sanitize(rawContent, {
    ALLOWED_TAGS: ['p', 'br', 'a', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
  });
}

/** Get display name for the post author */
export function getActorName(post: FederatedPost): string {
  if (post.company) return post.company.name;

  if (post.source === 'local' && post.profile) {
    return post.profile.fullname || post.profile.username || post.actor_name || 'Okänd användare';
  }

  const actor = post.actor;
  return actor?.name || actor?.preferredUsername || post.actor_name || 'Okänd användare';
}

/** Get username for the post author */
export function getActorUsername(post: FederatedPost): string {
  if (post.company) return post.company.slug;
  if (post.source === 'local') {
    return post.profile?.username || post.actor?.preferredUsername || post.actor_name || '';
  }
  return post.actor?.preferredUsername || post.actor_name || '';
}

/** Get avatar URL, proxied for remote images */
export function getAvatarUrl(post: FederatedPost): string | null {
  if (post.company) return post.company.logo_url;

  if (post.source === 'local' && post.profile?.avatar_url) {
    return post.profile.avatar_url;
  }

  const iconUrl = post.actor?.icon?.url || post.actor_avatar;
  if (!iconUrl) return null;

  return post.source === 'remote' ? getProxiedMediaUrl(iconUrl) : iconUrl;
}

/** Get the profile link target */
export function getProfileLink(post: FederatedPost): string {
  if (post.company) return `/organisation/${post.company.slug}`;
  if (post.source === 'local') return `/profile/${post.profile?.username || post.user_id}`;
  return '#';
}

/** Get the full @user@instance handle suffix */
export function getInstanceSuffix(post: FederatedPost): string {
  if (post.company) return '';
  if (post.source === 'local') {
    const homeInstance = post.profile?.home_instance;
    return `@${homeInstance && homeInstance !== 'local' ? homeInstance : getSamverkanInstanceDomain()}`;
  }
  return post.instance ? `@${post.instance}` : '';
}

export interface MediaAttachment {
  url: string;
  mediaType?: string;
  type?: string;
  name?: string;
  altText: string;
  [key: string]: unknown;
}

/** Extract image attachments from the post */
export function getMediaAttachments(post: FederatedPost): MediaAttachment[] {
  const attachments = post.content.attachment || post.content.object?.attachment || [];
  if (!Array.isArray(attachments)) return [];

  return attachments
    .filter((att: Record<string, unknown>) => {
      const isImage =
        (typeof att.mediaType === 'string' && att.mediaType.startsWith('image/')) ||
        att.type === 'Image';
      return isImage && att.url;
    })
    .map((att: Record<string, unknown>) => ({
      ...att,
      url: att.url as string,
      altText: (att.name as string) || '',
    }));
}
