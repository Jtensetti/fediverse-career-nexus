import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { EditorToolbar, ToolbarAction } from "@/components/editor/EditorToolbar";
import { LinkInsertSheet } from "@/components/editor/LinkInsertSheet";
import { cn } from "@/lib/utils";

interface ArticleEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ArticleEditor({
  value,
  onChange,
  placeholder = "Write your article...",
  className,
}: ArticleEditorProps) {
  const [hasSelection, setHasSelection] = useState(false);
  const [showLinkSheet, setShowLinkSheet] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  // Track selection state
  const checkSelection = useCallback(() => {
    if (textareaRef.current) {
      const { selectionStart, selectionEnd } = textareaRef.current;
      const hasText = selectionStart !== selectionEnd;
      setHasSelection(hasText);
      if (hasText) {
        setSelectedText(value.substring(selectionStart, selectionEnd));
      }
    }
  }, [value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleSelectionChange = () => {
      // Only check if our textarea is focused
      if (document.activeElement === textarea) {
        checkSelection();
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    textarea.addEventListener("mouseup", checkSelection);
    textarea.addEventListener("keyup", checkSelection);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      textarea.removeEventListener("mouseup", checkSelection);
      textarea.removeEventListener("keyup", checkSelection);
    };
  }, [checkSelection]);

  // Insert markdown at cursor or wrap selection
  const insertMarkdown = useCallback(
    (before: string, after: string = "", placeholder: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd } = textarea;
      const selected = value.substring(selectionStart, selectionEnd);
      const textToInsert = selected || placeholder;
      
      const newText =
        value.substring(0, selectionStart) +
        before +
        textToInsert +
        after +
        value.substring(selectionEnd);

      onChange(newText);

      // Restore focus and set cursor position
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = selectionStart + before.length + textToInsert.length + after.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        setHasSelection(false);
      }, 0);
    },
    [value, onChange]
  );

  // Wrap selection with markdown
  const wrapSelection = useCallback(
    (before: string, after: string = before) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd } = textarea;
      const selected = value.substring(selectionStart, selectionEnd);

      const newText =
        value.substring(0, selectionStart) +
        before +
        selected +
        after +
        value.substring(selectionEnd);

      onChange(newText);

      setTimeout(() => {
        textarea.focus();
        // Select the wrapped text
        textarea.setSelectionRange(
          selectionStart + before.length,
          selectionStart + before.length + selected.length
        );
      }, 0);
    },
    [value, onChange]
  );

  // Insert block markdown at line start
  const insertBlockMarkdown = useCallback(
    (prefix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart } = textarea;
      // Find the start of the current line
      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      
      const newText =
        value.substring(0, lineStart) + prefix + value.substring(lineStart);

      onChange(newText);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          selectionStart + prefix.length,
          selectionStart + prefix.length
        );
      }, 0);
    },
    [value, onChange]
  );

  // Handle toolbar actions
  const handleAction = useCallback(
    (action: ToolbarAction) => {
      switch (action) {
        case "bold":
          wrapSelection("**");
          break;
        case "italic":
          wrapSelection("*");
          break;
        case "strikethrough":
          wrapSelection("~~");
          break;
        case "heading":
          insertBlockMarkdown("## ");
          break;
        case "link":
          setShowLinkSheet(true);
          break;
        case "code":
          wrapSelection("`");
          break;
        case "clear":
          // Remove common markdown formatting from selection
          if (textareaRef.current) {
            const { selectionStart, selectionEnd } = textareaRef.current;
            let selected = value.substring(selectionStart, selectionEnd);
            // Remove bold, italic, strikethrough, code
            selected = selected
              .replace(/\*\*([^*]+)\*\*/g, "$1")
              .replace(/\*([^*]+)\*/g, "$1")
              .replace(/~~([^~]+)~~/g, "$1")
              .replace(/`([^`]+)`/g, "$1");
            
            const newText =
              value.substring(0, selectionStart) +
              selected +
              value.substring(selectionEnd);
            onChange(newText);
          }
          break;
        case "bullet-list":
          insertBlockMarkdown("- ");
          break;
        case "numbered-list":
          insertBlockMarkdown("1. ");
          break;
        case "quote":
          insertBlockMarkdown("> ");
          break;
        case "code-block":
          insertMarkdown("\n```\n", "\n```\n", "code here");
          break;
        case "divider":
          insertMarkdown("\n---\n");
          break;
        case "image":
          insertMarkdown("![", "](url)", "alt text");
          break;
      }
    },
    [wrapSelection, insertBlockMarkdown, insertMarkdown, value, onChange]
  );

  // Handle link insertion
  const handleLinkInsert = useCallback(
    (url: string, text?: string) => {
      const displayText = text || selectedText || url;
      const textarea = textareaRef.current;
      
      if (textarea && hasSelection) {
        // Wrap selected text in link
        const { selectionStart, selectionEnd } = textarea;
        const newText =
          value.substring(0, selectionStart) +
          `[${displayText}](${url})` +
          value.substring(selectionEnd);
        onChange(newText);
      } else {
        // Insert new link at cursor
        insertMarkdown(`[${displayText}](`, ")", "");
      }
      
      setShowLinkSheet(false);
    },
    [selectedText, hasSelection, value, onChange, insertMarkdown]
  );

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            handleAction("bold");
            break;
          case "i":
            e.preventDefault();
            handleAction("italic");
            break;
          case "k":
            e.preventDefault();
            handleAction("link");
            break;
        }
      }
    },
    [handleAction]
  );

  return (
    <div className={cn("flex flex-col border rounded-md overflow-hidden", className)}>
      {/* Desktop toolbar at top */}
      {!isMobile && (
        <EditorToolbar
          hasSelection={hasSelection}
          onAction={handleAction}
          isMobile={false}
        />
      )}

      {/* Editor textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "min-h-[400px] border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none text-base leading-relaxed",
          isMobile && "pb-16" // Space for mobile toolbar
        )}
      />

      {/* Mobile toolbar at bottom */}
      {isMobile && (
        <EditorToolbar
          hasSelection={hasSelection}
          onAction={handleAction}
          isMobile={true}
        />
      )}

      {/* Link insertion sheet/popover */}
      <LinkInsertSheet
        open={showLinkSheet}
        onOpenChange={setShowLinkSheet}
        onInsert={handleLinkInsert}
        selectedText={selectedText}
      />
    </div>
  );
}

export default ArticleEditor;
