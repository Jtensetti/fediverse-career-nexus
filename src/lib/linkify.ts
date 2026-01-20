/**
 * Utility to make URLs in text/HTML clickable
 */

// URL regex that matches http/https URLs
const URL_REGEX = /(?<!["'=])(https?:\/\/[^\s<>\[\]"'`\)]+)/gi;

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

  // Now linkify remaining URLs
  const linkedText = protectedText.replace(URL_REGEX, (url) => {
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

  // Restore original anchor tags
  return linkedText.replace(/__ANCHOR_(\d+)__/g, (_, index) => anchors[parseInt(index)]);
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
