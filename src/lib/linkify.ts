import DOMPurify from 'dompurify';

const URL_REGEX = /https?:\/\/[^\s<>\[\]"'`]+/gi;
const MENTION_REGEX = /@([a-zA-Z0-9_]+)(?:@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))?/g;
const HASHTAG_REGEX = /#([a-zA-Z0-9_]+)/g;
const INLINE_TAGS = ['a', 'strong', 'em', 'b', 'i', 'code', 'br'];
const BLOCK_TAGS = [...INLINE_TAGS, 'p', 'pre', 'blockquote', 'ul', 'ol', 'li'];
const TOKEN = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|(?<![\w*])\*([^*\n]+)\*(?!\w)|(?<![\w_])_([^_\n]+)_(?!\w)|https?:\/\/[^\s<>\[\]"'`]+|(?<![\w@])@([a-zA-Z0-9_]+)(?:@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))?|(?<![\w&])#([\p{L}\p{N}_]+)/gu;

function render(text: string, markdown: boolean, inline = false): string {
  const rules = { ALLOWED_TAGS: inline ? INLINE_TAGS : BLOCK_TAGS,
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ADD_URI_SAFE_ATTR: ['rel', 'target'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[/?#]|$)/i };
  const template = document.createElement('template');
  template.innerHTML = DOMPurify.sanitize(text, rules);
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!node.parentElement?.closest('a,code,pre')) nodes.push(node);
  }
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    let offset = 0;
    for (const match of node.data.matchAll(TOKEN)) {
      fragment.append(node.data.slice(offset, match.index));
      offset = match.index + match[0].length;
      const [, label, href, boldStars, boldUnderscores, italicStars, italicUnderscores, user, instance, tag] = match;
      let element: HTMLElement | null = null;
      let suffix = '';
      if (markdown && (boldStars || boldUnderscores || italicStars || italicUnderscores)) {
        element = document.createElement(boldStars || boldUnderscores ? 'strong' : 'em');
        element.textContent = boldStars || boldUnderscores || italicStars || italicUnderscores;
      } else if ((markdown && label) || user || tag || /^https?:/i.test(match[0])) {
        const link = document.createElement('a');
        element = link;
        let url = href;
        let value = label;
        if (user) { url = `/profile/${user}${instance ? '@' + instance : ''}`; value = match[0]; }
        else if (tag) { url = `/search?q=${encodeURIComponent('#' + tag)}`; value = match[0]; }
        else if (!label) {
          suffix = match[0].match(/[.,;:!?)}\]]+$/)?.[0] || '';
          url = suffix ? match[0].slice(0, -suffix.length) : match[0];
          value = url;
        }
        link.setAttribute('href', url);
        link.textContent = value;
        link.className = 'text-primary hover:underline break-all';
        if (/^https?:/i.test(url)) link.target = '_blank';
      }
      fragment.append(element || document.createTextNode(match[0]));
      if (suffix) fragment.append(suffix);
    }
    fragment.append(node.data.slice(offset));
    node.replaceWith(fragment);
  }
  for (const link of template.content.querySelectorAll('a')) link.rel = 'noopener noreferrer ugc';
  // Sanitize after transformation as well: Markdown may introduce a new URL.
  return DOMPurify.sanitize(template.innerHTML, rules);
}

export const linkifyText = (text: string): string => render(text, false);
export const linkifyWithMarkdown = (text: string, inline = false): string => render(text, true, inline);

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
 * Represents a mention with optional remote instance
 */
export interface ParsedMention {
  username: string;
  instance?: string;
  isRemote: boolean;
  full: string; // e.g., "user" or "user@mastodon.social"
}

/**
 * Extracts all @mentions from text content with full details
 * Returns array of ParsedMention objects including remote instances
 */
export function extractMentionsWithInstances(text: string): ParsedMention[] {
  // Remove HTML tags first for cleaner extraction
  const plainText = text.replace(/<[^>]+>/g, ' ');
  const matches = [...plainText.matchAll(MENTION_REGEX)];
  
  if (!matches.length) return [];

  const mentions: ParsedMention[] = matches.map(m => ({
    username: m[1].toLowerCase(),
    instance: m[2]?.toLowerCase(),
    isRemote: !!m[2],
    full: m[2] ? `${m[1].toLowerCase()}@${m[2].toLowerCase()}` : m[1].toLowerCase()
  }));

  // Deduplicate by full mention string
  const seen = new Set<string>();
  return mentions.filter(m => {
    if (seen.has(m.full)) return false;
    seen.add(m.full);
    return true;
  });
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
  const element = document.createElement('div');
  element.innerHTML = DOMPurify.sanitize(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n'), {
    ALLOWED_TAGS: [], ALLOWED_ATTR: [],
  });
  return (element.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}
