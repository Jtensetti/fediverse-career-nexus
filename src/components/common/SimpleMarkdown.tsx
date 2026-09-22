import { linkifyWithMarkdown } from '@/lib/linkify';

interface SimpleMarkdownProps {
  content: string;
  className?: string;
}

export function SimpleMarkdown({ content, className = '' }: SimpleMarkdownProps) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: linkifyWithMarkdown(content, true) }} />;
}

export default SimpleMarkdown;
