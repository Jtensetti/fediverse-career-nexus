/**
 * Utility to make URLs, @mentions, and #hashtags in text/HTML clickable
 */

// URL regex that matches http/https URLs
const URL_REGEX = /(?<!["'=])(https?:\/\/[^\s<>\[\]"'`\)]+)/gi;

// Regex for @mentions - handles @username and @username@instance.com
const MENTION_REGEX = /@([a-zA-Z0-9_]+)(?:@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))?/g;

// Regex for #hashtags
const HASHTAG_REGEX = /#([a-zA-Z0-9_]+)/g;

/**
 * Converts @mentions to clickable profile links.
 * Handles both local (@username) and remote (@username@instance) mentions.
 */
export function linkifyMentions(text: string): string {
  return text.replace(MENTION_REGEX, (match, username, instance) => {
    // If instance is provided, it's a remote user
    const profilePath = instance 
      ? `/profile/${username}@${instance}` // Remote user (future: federation lookup)
      : `/profile/${username}`;
    
    return `<a href="${profilePath}" class="text-primary hover:underline font-medium">@${username}${instance ? '@' + instance : ''}</a>`;
  });
}

/**
 * Converts #hashtags to clickable search links.
 * Links to the search page with the hashtag as query.
 */
export function linkifyHashtags(text: string): string {
  return text.replace(HASHTAG_REGEX, (match, tag) => {
    // Link to search page with hashtag query
    return `<a href="/search?q=%23${encodeURIComponent(tag)}" class="text-primary hover:underline font-medium">#${tag}</a>`;
  });
}

/**
 * Converts plain URLs in text to clickable anchor tags.
 * Avoids double-wrapping URLs that are already inside anchor tags.
 */
export function linkifyText(text: string): string {
  // First, temporarily replace existing anchor tags to protect them
  const anchors: string[] = [];
  const protectedText = text.replace(/<a[^>]*>.*?<\/a>/gi, (match) => {
    anchors.push(match);
    return `__ANCHOR_${anchors.length - 1}__`;
  });

  // Linkify URLs first
  let linkedText = protectedText.replace(URL_REGEX, (url) => {
    // Clean up trailing punctuation that's likely not part of the URL
    let cleanUrl = url;
    const trailingPunctuation = /[.,;:!?\)\]]+$/;
    const match = cleanUrl.match(trailingPunctuation);
    let suffix = '';
    if (match) {
      suffix = match[0];
      cleanUrl = cleanUrl.slice(0, -suffix.length);
    }
    
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">${cleanUrl}</a>${suffix}`;
  });

  // Now linkify mentions (avoid matching inside URLs we just created)
  linkedText = linkifyMentions(linkedText);
  
  // Now linkify hashtags (avoid matching inside URLs we just created)
  linkedText = linkifyHashtags(linkedText);

  // Restore original anchor tags
  return linkedText.replace(/__ANCHOR_(\d+)__/g, (_, index) => anchors[parseInt(index)]);
}

/**
 * Parse simple inline markdown (bold, italic) within text.
 * Should be called after linkifyText to avoid interfering with URLs.
 */
export function parseInlineMarkdown(text: string): string {
  if (!text) return "";

  let result = text;

  // Protect existing HTML elements
  const elements: string[] = [];
  result = result.replace(/<[^>]+>.*?<\/[^>]+>|<[^>]+\/>/gi, (match) => {
    elements.push(match);
    return `__ELEM_${elements.length - 1}__`;
  });

  // Parse markdown links: [text](url)
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>'
  );

  // Parse bold: **text** or __text__
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Parse italic: *text* or _text_ (not inside words)
  result = result.replace(/(?<![*\w])\*([^*]+)\*(?![*\w])/g, "<em>$1</em>");
  result = result.replace(/(?<![_\w])_([^_]+)_(?![_\w])/g, "<em>$1</em>");

  // Restore protected elements
  result = result.replace(/__ELEM_(\d+)__/g, (_, index) => elements[parseInt(index)]);

  return result;
}

/**
 * Full linkify with inline markdown support.
 * Combines URL linking, mentions, hashtags, and basic markdown.
 */
export function linkifyWithMarkdown(text: string): string {
  // First linkify URLs, mentions, hashtags
  let result = linkifyText(text);
  // Then parse inline markdown
  result = parseInlineMarkdown(result);
  return result;
}

/**
 * Extracts all URLs from text content
 */
export function extractUrls(text: string): string[] {
  // Remove HTML tags first for cleaner extraction
  const plainText = text.replace(/<[^>]+>/g, ' ');
  const matches = plainText.match(URL_REGEX);
  
  if (!matches) return [];

  // Clean and deduplicate
  const cleaned = matches.map(url => {
    // Remove trailing punctuation
    return url.replace(/[.,;:!?\)\]]+$/, '');
  });

  return [...new Set(cleaned)];
}

/**
 * Extracts all @mentions from text content
 * Returns array of usernames (without the @ symbol)
 */
export function extractMentions(text: string): string[] {
  // Remove HTML tags first for cleaner extraction
  const plainText = text.replace(/<[^>]+>/g, ' ');
  const matches = [...plainText.matchAll(MENTION_REGEX)];
  
  if (!matches.length) return [];

  // Return unique usernames (first capture group)
  const usernames = matches.map(m => m[1].toLowerCase());
  return [...new Set(usernames)];
}

/**
 * Extracts all #hashtags from text content
 * Returns array of hashtags (without the # symbol)
 */
export function extractHashtags(text: string): string[] {
  // Remove HTML tags first for cleaner extraction
  const plainText = text.replace(/<[^>]+>/g, ' ');
  const matches = [...plainText.matchAll(HASHTAG_REGEX)];
  
  if (!matches.length) return [];

  // Return unique hashtags (first capture group)
  const hashtags = matches.map(m => m[1].toLowerCase());
  return [...new Set(hashtags)];
}

/**
 * Truncates text while preserving word boundaries and accounting for URLs
 * URLs are counted as a fixed length to avoid penalizing long URLs
 */
export function smartTruncate(text: string, maxLength: number, urlCountLength = 25): string {
  // Remove HTML for length calculation
  const plainText = text.replace(/<[^>]+>/g, '');
  
  // Replace URLs with placeholder for length calculation
  const urlPlaceholder = 'X'.repeat(urlCountLength);
  const textForCounting = plainText.replace(URL_REGEX, urlPlaceholder);
  
  if (textForCounting.length <= maxLength) {
    return text;
  }

  // Find where to cut in the original text
  let countedLength = 0;
  let cutIndex = 0;
  let i = 0;
  
  while (i < plainText.length && countedLength < maxLength) {
    // Check if we're at the start of a URL
    const remaining = plainText.slice(i);
    const urlMatch = remaining.match(/^https?:\/\/[^\s<>\[\]"'`\)]+/);
    
    if (urlMatch) {
      countedLength += urlCountLength;
      i += urlMatch[0].length;
    } else {
      countedLength++;
      i++;
    }
    cutIndex = i;
  }

  // Find word boundary
  let truncated = plainText.slice(0, cutIndex);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > cutIndex - 20 && lastSpace > 0) {
    truncated = truncated.slice(0, lastSpace);
  }

  return truncated.trim() + '…';
}

/**
 * Strips HTML tags from content for plain text display
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
