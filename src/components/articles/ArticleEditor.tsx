import { useTranslation } from "react-i18next";
import { useState, useCallback, useRef, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { RichTextToolbar, ToolbarAction } from "@/components/editor/RichTextToolbar";
import { TipTapEditor, type TipTapEditorHandle } from "@/components/editor/TipTapEditor";
import { LinkInsertSheet } from "@/components/editor/LinkInsertSheet";
import { cn } from "@/lib/utils";
import { useArticleImageUpload } from "@/hooks/useArticleImageUpload";
import { toast } from "sonner";

interface ArticleEditorProps {
  readOnly?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  label?: string;
}

export function ArticleEditor({
  readOnly = false,
  value,
  onChange,
  placeholder,
  className,
  id = "article-content",
  label,
}: ArticleEditorProps) {
  const { t } = useTranslation();
  const [hasSelection, setHasSelection] = useState(false);
  const [showLinkSheet, setShowLinkSheet] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isMobile = useIsMobile();
  const { keyboardHeight, isKeyboardOpen } = useKeyboardHeight();
  const { uploadImage } = useArticleImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<TipTapEditorHandle>(null);

  // Get editor commands from ref
  const getEditor = useCallback(() => editorRef.current, []);

  // Handle toolbar actions
  const handleAction = useCallback(
    (action: ToolbarAction) => {
      const editor = getEditor();
      if (!editor || readOnly) return;

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
          const url = prompt(t("articleForm.imageUrl"));
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
    [getEditor, readOnly, t]
  );

  // Handle link insertion
  const handleLinkInsert = useCallback(
    (url: string, text?: string) => {
      const editor = getEditor();
      if (editor && !readOnly) {
        editor.setLink(url, text || editor.getSelectedText() || url);
      }
      setShowLinkSheet(false);
    },
    [getEditor, readOnly]
  );

  const blurTimerRef = useRef<number | null>(null);
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
    blurTimerRef.current = window.setTimeout(() => {
      setIsFocused(false);
    }, 150);
  }, []);

  // Cleanup pending blur timer on unmount
  useEffect(() => () => {
    if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
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
    if (!file || readOnly) return;

    const editor = getEditor();
    if (!editor) {
      toast.error(t("articleForm.editorNotReady"));
      return;
    }

    const url = await uploadImage(file);
    if (url) {
      editor.insertImage(url);
      toast.success(t("articleForm.imageInserted"));
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [readOnly, getEditor, uploadImage, t]);

  // Show toolbar when keyboard is open on mobile, or always on desktop
  const showToolbar = isMobile ? (isFocused || isKeyboardOpen) : true;

  return (
    <div className={cn(
      "flex flex-col border rounded-md overflow-hidden bg-background relative",
      className
    )}>
      {/* TipTap Rich Text Editor */}
      <TipTapEditor
        editable={!readOnly}
        id={id}
        label={label ?? t("articleForm.editorLabel")}
        ref={editorRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? t("articleForm.editorPlaceholder")}
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
