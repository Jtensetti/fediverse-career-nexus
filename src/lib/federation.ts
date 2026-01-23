/**
 * Federation utilities for consistent Fediverse identity display
 */

// The canonical domain for local Nolto users
const NOLTO_DOMAIN = 'nolto.social';

/**
 * Get the Nolto instance domain for federation identity.
 * For local users, this should always be nolto.social in production.
 */
export const getNoltoInstanceDomain = (): string => {
  // Check if we're on the official domain
  const hostname = typeof window !== 'undefined' ? window.location.hostname : NOLTO_DOMAIN;
  
  // If on nolto.social or a subdomain, use nolto.social
  if (hostname === 'nolto.social' || hostname.endsWith('.nolto.social')) {
    return 'nolto.social';
  }
  
  // For preview/development URLs, still show nolto.social for consistency
  // Users should see their "real" handle even in preview
  if (hostname.includes('lovable.app') || hostname.includes('localhost')) {
    return 'nolto.social';
  }
  
  // Fallback to actual hostname for custom domains
  return hostname;
};

/**
 * Format a Fediverse handle for display
 * @param username - The user's username
 * @param homeInstance - The user's home instance (for federated users)
 * @param isLocal - Whether the user is a local Nolto user
 * @returns Formatted handle like @username@nolto.social
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
  
  // For local users, always use the Nolto domain
  return `@${username}@${getNoltoInstanceDomain()}`;
};

/**
 * Get the instance part of a user's identity for display
 * @param homeInstance - The user's home instance (from profile)
 * @param isLocal - Whether the user is a local Nolto user
 * @returns Instance domain like "nolto.social" or "mastodon.social"
 */
export const getInstanceDomain = (
  homeInstance?: string | null,
  isLocal: boolean = true
): string => {
  if (!isLocal && homeInstance) {
    return homeInstance;
  }
  return getNoltoInstanceDomain();
};
