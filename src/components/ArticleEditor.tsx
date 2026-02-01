import { useState, useCallback, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { RichTextToolbar, ToolbarAction } from "@/components/editor/RichTextToolbar";
import { TipTapEditor } from "@/components/editor/TipTapEditor";
import { LinkInsertSheet } from "@/components/editor/LinkInsertSheet";
import { cn } from "@/lib/utils";
import { useArticleImageUpload } from "@/hooks/useArticleImageUpload";
import { toast } from "sonner";

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
  const [isFocused, setIsFocused] = useState(false);
  const isMobile = useIsMobile();
  const { keyboardHeight, isKeyboardOpen } = useKeyboardHeight();
  const { uploadImage, isUploading } = useArticleImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get editor commands from window
  const getEditor = useCallback(() => {
    return (window as any).__tiptapEditor;
  }, []);

  // Handle toolbar actions
  const handleAction = useCallback(
    (action: ToolbarAction) => {
      const editor = getEditor();
      if (!editor) return;

      switch (action) {
        case "bold":
          editor.toggleBold();
          break;
        case "italic":
          editor.toggleItalic();
          break;
        case "strikethrough":
          editor.toggleStrike();
          break;
        case "normal":
          editor.clearHeading();
          break;
        case "heading-1":
          editor.setHeading(1);
          break;
        case "heading-2":
          editor.setHeading(2);
          break;
        case "heading-3":
          editor.setHeading(3);
          break;
        case "heading-4":
          editor.setHeading(4);
          break;
        case "heading-5":
          editor.setHeading(5);
          break;
        case "link":
          setShowLinkSheet(true);
          break;
        case "quote":
          editor.toggleBlockquote();
          break;
        case "bullet-list":
          editor.toggleBulletList();
          break;
        case "numbered-list":
          editor.toggleOrderedList();
          break;
        case "code-block":
          editor.toggleCodeBlock();
          break;
        case "divider":
          editor.insertHorizontalRule();
          break;
        case "image":
          // Open file picker for device upload
          fileInputRef.current?.click();
          break;
        case "image-url":
          // Prompt for URL as fallback
          const url = prompt("Enter image URL:");
          if (url) {
            editor.insertImage(url);
          }
          break;
        case "undo":
          editor.undo();
          break;
        case "hide-keyboard":
          editor.hideKeyboard();
          break;
      }
    },
    [getEditor]
  );

  // Handle link insertion
  const handleLinkInsert = useCallback(
    (url: string, _text?: string) => {
      const editor = getEditor();
      if (editor) {
        editor.setLink(url);
      }
      setShowLinkSheet(false);
    },
    [getEditor]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setIsFocused(false);
    }, 150);
  }, []);

  const handleSelectionChange = useCallback((selected: boolean) => {
    setHasSelection(selected);
  }, []);

  const handleHideKeyboard = useCallback(() => {
    const editor = getEditor();
    if (editor) {
      editor.hideKeyboard();
    }
  }, [getEditor]);

  // Get selected text for link dialog
  const getSelectedText = useCallback(() => {
    const editor = getEditor();
    return editor?.getSelectedText?.() || "";
  }, [getEditor]);

  // Handle file selection for image upload
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const editor = getEditor();
    if (!editor) {
      toast.error("Editor not ready");
      return;
    }

    const url = await uploadImage(file);
    if (url) {
      editor.insertImage(url);
      toast.success("Image inserted");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [getEditor, uploadImage]);

  // Show toolbar when keyboard is open on mobile, or always on desktop
  const showToolbar = isMobile ? (isFocused || isKeyboardOpen) : true;

  return (
    <div className={cn(
      "flex flex-col border rounded-md overflow-hidden bg-background relative",
      className
    )}>
      {/* TipTap Rich Text Editor */}
      <TipTapEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSelectionChange={handleSelectionChange}
        className={cn(
          isMobile && showToolbar && "pb-16"
        )}
      />

      {/* Hidden file input for image upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />

      {/* Keyboard-attached toolbar for mobile */}
      {isMobile && showToolbar && (
        <div
          className="fixed left-0 right-0 z-50 bg-background/98 backdrop-blur-md border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.15)]"
          style={{
            bottom: isKeyboardOpen ? keyboardHeight : 0,
            transition: 'bottom 0.1s ease-out',
          }}
        >
          <RichTextToolbar
            hasSelection={hasSelection}
            onAction={handleAction}
            isMobile={isMobile}
            onHideKeyboard={handleHideKeyboard}
          />
        </div>
      )}

      {/* Desktop toolbar - static at bottom */}
      {!isMobile && (
        <RichTextToolbar
          hasSelection={hasSelection}
          onAction={handleAction}
          isMobile={false}
          onHideKeyboard={handleHideKeyboard}
        />
      )}

      {/* Link insertion sheet/popover */}
      <LinkInsertSheet
        open={showLinkSheet}
        onOpenChange={setShowLinkSheet}
        onInsert={handleLinkInsert}
        selectedText={getSelectedText()}
      />
    </div>
  );
}

export default ArticleEditor;
