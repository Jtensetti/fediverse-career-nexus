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

// Simple undo stack
interface UndoState {
  value: string;
  cursorPos: number;
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
  const [undoStack, setUndoStack] = useState<UndoState[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  // Save state for undo
  const saveUndoState = useCallback(() => {
    if (textareaRef.current) {
      setUndoStack(prev => [...prev.slice(-20), { 
        value, 
        cursorPos: textareaRef.current?.selectionStart || 0 
      }]);
    }
  }, [value]);

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
    (before: string, after: string = "", placeholderText: string = "") => {
      saveUndoState();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd } = textarea;
      const selected = value.substring(selectionStart, selectionEnd);
      const textToInsert = selected || placeholderText;
      
      const newText =
        value.substring(0, selectionStart) +
        before +
        textToInsert +
        after +
        value.substring(selectionEnd);

      onChange(newText);

      setTimeout(() => {
        textarea.focus();
        const newCursorPos = selectionStart + before.length + textToInsert.length + after.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        setHasSelection(false);
      }, 0);
    },
    [value, onChange, saveUndoState]
  );

  // Wrap selection with markdown
  const wrapSelection = useCallback(
    (before: string, after: string = before) => {
      saveUndoState();
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
        textarea.setSelectionRange(
          selectionStart + before.length,
          selectionStart + before.length + selected.length
        );
      }, 0);
    },
    [value, onChange, saveUndoState]
  );

  // Insert block markdown at line start
  const insertBlockMarkdown = useCallback(
    (prefix: string) => {
      saveUndoState();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart } = textarea;
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
    [value, onChange, saveUndoState]
  );

  // Undo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const prevState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    onChange(prevState.value);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(prevState.cursorPos, prevState.cursorPos);
      }
    }, 0);
  }, [undoStack, onChange]);

  // Hide keyboard
  const handleHideKeyboard = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.blur();
    }
  }, []);

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
        case "normal":
          // Remove heading prefix from current line
          if (textareaRef.current) {
            saveUndoState();
            const { selectionStart } = textareaRef.current;
            const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
            const lineEnd = value.indexOf("\n", selectionStart);
            const line = value.substring(lineStart, lineEnd === -1 ? undefined : lineEnd);
            const cleanedLine = line.replace(/^#{1,6}\s*/, "");
            const newText = value.substring(0, lineStart) + cleanedLine + value.substring(lineEnd === -1 ? value.length : lineEnd);
            onChange(newText);
          }
          break;
        case "heading":
        case "heading-2":
          insertBlockMarkdown("## ");
          break;
        case "heading-1":
          insertBlockMarkdown("# ");
          break;
        case "heading-3":
          insertBlockMarkdown("### ");
          break;
        case "heading-4":
          insertBlockMarkdown("#### ");
          break;
        case "heading-5":
          insertBlockMarkdown("##### ");
          break;
        case "link":
          setShowLinkSheet(true);
          break;
        case "code":
          wrapSelection("`");
          break;
        case "quote":
          insertBlockMarkdown("> ");
          break;
        case "bullet-list":
          insertBlockMarkdown("- ");
          break;
        case "numbered-list":
          insertBlockMarkdown("1. ");
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
        case "undo":
          handleUndo();
          break;
        case "hide-keyboard":
          handleHideKeyboard();
          break;
      }
    },
    [wrapSelection, insertBlockMarkdown, insertMarkdown, value, onChange, handleUndo, handleHideKeyboard, saveUndoState]
  );

  // Handle link insertion
  const handleLinkInsert = useCallback(
    (url: string, text?: string) => {
      saveUndoState();
      const displayText = text || selectedText || url;
      const textarea = textareaRef.current;
      
      if (textarea && hasSelection) {
        const { selectionStart, selectionEnd } = textarea;
        const newText =
          value.substring(0, selectionStart) +
          `[${displayText}](${url})` +
          value.substring(selectionEnd);
        onChange(newText);
      } else {
        insertMarkdown(`[${displayText}](`, ")", "");
      }
      
      setShowLinkSheet(false);
    },
    [selectedText, hasSelection, value, onChange, insertMarkdown, saveUndoState]
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
          case "z":
            e.preventDefault();
            handleAction("undo");
            break;
        }
      }
    },
    [handleAction]
  );

  // Save undo state on significant changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // Save undo state periodically (when space or newline is typed)
    if (newValue.endsWith(" ") || newValue.endsWith("\n")) {
      saveUndoState();
    }
    onChange(newValue);
  }, [onChange, saveUndoState]);

  return (
    <div className={cn(
      "flex flex-col border rounded-md overflow-hidden bg-background",
      isMobile && "fixed inset-0 z-50 rounded-none border-0",
      className
    )}>
      {/* Editor textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "flex-1 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none text-base leading-relaxed",
          isMobile ? "min-h-[calc(100vh-60px)] p-4 text-[16px]" : "min-h-[400px]"
        )}
      />

      {/* Toolbar - always at bottom */}
      <EditorToolbar
        hasSelection={hasSelection}
        onAction={handleAction}
        isMobile={isMobile}
        onHideKeyboard={handleHideKeyboard}
      />

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
