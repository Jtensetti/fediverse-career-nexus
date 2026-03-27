/**
 * Federation utilities for consistent Fediverse identity display
 */

// The canonical domain for local Samverkan users
const SAMVERKAN_DOMAIN = 'samverkan.se';

/**
 * Get the Samverkan instance domain for federation identity.
 * For local users, this should always be samverkan.se in production.
 */
export const getSamverkanInstanceDomain = (): string => {
  // Check if we're on the official domain
  const hostname = typeof window !== 'undefined' ? window.location.hostname : SAMVERKAN_DOMAIN;
  
  // If on samverkan.se or a subdomain, use samverkan.se
  if (hostname === 'samverkan.se' || hostname.endsWith('.samverkan.se')) {
    return 'samverkan.se';
  }
  
  // For preview/development URLs, still show samverkan.se for consistency
  // Users should see their "real" handle even in preview
  if (hostname.includes('lovable.app') || hostname.includes('localhost')) {
    return 'samverkan.se';
  }
  
  // Fallback to actual hostname for custom domains
  return hostname;
};

/**
 * Format a Fediverse handle for display
 * @param username - The user's username
 * @param homeInstance - The user's home instance (for federated users)
 * @param isLocal - Whether the user is a local Samverkan user
 * @returns Formatted handle like @username@samverkan.se
 */
export const formatFederatedHandle = (
  username: string,
  homeInstance?: string | null,
  isLocal: boolean = true
): string => {
  if (!username) return '';
  
  // For remote/federated users, use their home instance
  if (!isLocal && homeInstance) {
    return `@${username}@${homeInstance}`;
  }
  
  // For local users, always use the Samverkan domain
  return `@${username}@${getSamverkanInstanceDomain()}`;
};

/**
 * Get the instance part of a user's identity for display
 * @param homeInstance - The user's home instance (from profile)
 * @param isLocal - Whether the user is a local Samverkan user
 * @returns Instance domain like "samverkan.se" or "mastodon.social"
 */
export const getInstanceDomain = (
  homeInstance?: string | null,
  isLocal: boolean = true
): string => {
  if (!isLocal && homeInstance) {
    return homeInstance;
  }
  return getSamverkanInstanceDomain();
};
