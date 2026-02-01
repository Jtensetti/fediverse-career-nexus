import DOMPurify from "dompurify";
import { linkifyText } from "@/lib/linkify";

interface SimpleMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Lightweight inline markdown renderer for bio and posts.
 * Supports: **bold**, *italic*, [link](url)
 */
export function SimpleMarkdown({ content, className = "" }: SimpleMarkdownProps) {
  const rendered = parseSimpleMarkdown(content);
  
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

/**
 * Parse simple inline markdown and return sanitized HTML.
 * Order matters: process bold before italic to avoid conflicts.
 */
export function parseSimpleMarkdown(text: string): string {
  if (!text) return "";

  let result = text;

  // First, protect existing HTML anchor tags
  const anchors: string[] = [];
  result = result.replace(/<a[^>]*>.*?<\/a>/gi, (match) => {
    anchors.push(match);
    return `__ANCHOR_${anchors.length - 1}__`;
  });

  // Parse markdown links: [text](url) - do this before bold/italic
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>'
  );

  // Parse bold: **text** or __text__
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Parse italic: *text* or _text_ (using simpler patterns without lookbehind)
  // Match *text* that's not part of **text** (already handled above)
  result = result.replace(/(?:^|[^*])\*([^*]+)\*(?:[^*]|$)/g, (match, content) => {
    // Preserve the surrounding characters
    const before = match.startsWith('*') ? '' : match[0];
    const after = match.endsWith('*') ? '' : match[match.length - 1];
    return `${before}<em>${content}</em>${after}`;
  });
  
  // Match _text_ that's not part of __text__ and not in URLs
  result = result.replace(/(?:^|[^_\w])_([^_]+)_(?:[^_\w]|$)/g, (match, content) => {
    const before = match.startsWith('_') ? '' : match[0];
    const after = match.endsWith('_') ? '' : match[match.length - 1];
    return `${before}<em>${content}</em>${after}`;
  });

  // Restore protected anchor tags
  result = result.replace(/__ANCHOR_(\d+)__/g, (_, index) => anchors[parseInt(index)]);

  // Run through linkifyText to catch any plain URLs
  result = linkifyText(result);

  // Sanitize the final output
  return DOMPurify.sanitize(result, {
    ALLOWED_TAGS: ["a", "strong", "em", "b", "i"],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });
}

export default SimpleMarkdown;
