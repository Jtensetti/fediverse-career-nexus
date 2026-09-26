import { MediaImage } from "@/components/content/MediaImage";
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const PrivatePreviewImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(({ node }: NodeViewProps) => (
      <NodeViewWrapper><MediaImage src={node.attrs.src} alt={node.attrs.alt || ''} /></NodeViewWrapper>
    ));
  },
});

export interface TipTapEditorHandle {
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleStrike: () => void;
  setHeading: (level: 1 | 2 | 3 | 4 | 5) => void;
  clearHeading: () => void;
  toggleBlockquote: () => void;
  toggleCodeBlock: () => void;
  toggleBulletList: () => void;
  toggleOrderedList: () => void;
  setLink: (url: string, text?: string) => void;
  insertImage: (url: string, alt?: string) => void;
  insertHorizontalRule: () => void;
  undo: () => void;
  hideKeyboard: () => void;
  getSelectedText: () => string;
}

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onSelectionChange?: (hasSelection: boolean) => void;
  id?: string;
  label?: string;
}

export const TipTapEditor = forwardRef<TipTapEditorHandle, TipTapEditorProps>(function TipTapEditor(
  {
    value,
    onChange,
    placeholder,
    className,
    onFocus,
    onBlur,
    onSelectionChange,
    id,
    label,
  },
  ref
) {
  const { t } = useTranslation();
  const isUpdatingRef = useRef(false);
  const editorPlaceholder = placeholder ?? t("articleForm.editorPlaceholder");
  const placeholderRef = useRef(editorPlaceholder);
  placeholderRef.current = editorPlaceholder;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        heading: {
          levels: [1, 2, 3, 4, 5],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      Placeholder.configure({
        placeholder: () => placeholderRef.current,
        emptyEditorClass: "is-editor-empty",
      }),
      PrivatePreviewImage.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: "textbox",
        "aria-label": label || t("articleForm.editorLabel"),
        "aria-multiline": "true",
        class: cn(
          "prose prose-sm sm:prose dark:prose-invert max-w-none",
          "focus:outline-none min-h-[300px] sm:min-h-[400px]",
          "p-4 text-base leading-relaxed"
        ),
      },
    },
    onUpdate: ({ editor }) => {
      if (!isUpdatingRef.current) {
        const html = editor.getHTML();
        onChange(html);
      }
    },
    onFocus: () => {
      onFocus?.();
    },
    onBlur: () => {
      onBlur?.();
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      onSelectionChange?.(from !== to);
    },
  });

  // Refresh placeholder decorations on language changes without replacing the editor or its draft.
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr);
  }, [editor, editorPlaceholder]);

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      isUpdatingRef.current = true;
      editor.commands.setContent(value);
      isUpdatingRef.current = false;
    }
  }, [value, editor]);

  // Expose editor commands via ref
  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleStrike = useCallback(() => {
    editor?.chain().focus().toggleStrike().run();
  }, [editor]);

  const setHeading = useCallback((level: 1 | 2 | 3 | 4 | 5) => {
    editor?.chain().focus().toggleHeading({ level }).run();
  }, [editor]);

  const clearHeading = useCallback(() => {
    editor?.chain().focus().setParagraph().run();
  }, [editor]);

  const toggleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run();
  }, [editor]);

  const toggleCodeBlock = useCallback(() => {
    editor?.chain().focus().toggleCodeBlock().run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const setLink = useCallback((url: string, text?: string) => {
    if (url) {
      if (text) {
        editor?.chain().focus().insertContent({
          type: "text",
          text,
          marks: [{ type: "link", attrs: { href: url } }],
        }).run();
      } else {
        editor?.chain().focus().setLink({ href: url }).run();
      }
    } else {
      editor?.chain().focus().unsetLink().run();
    }
  }, [editor]);

  const insertImage = useCallback((url: string, alt?: string) => {
    editor?.chain().focus().setImage({ src: url, alt: alt || "" }).run();
  }, [editor]);

  const insertHorizontalRule = useCallback(() => {
    editor?.chain().focus().setHorizontalRule().run();
  }, [editor]);

  const undo = useCallback(() => {
    editor?.chain().focus().undo().run();
  }, [editor]);

  const hideKeyboard = useCallback(() => {
    editor?.commands.blur();
  }, [editor]);

  useImperativeHandle(
    ref,
    () => ({
      toggleBold,
      toggleItalic,
      toggleStrike,
      setHeading,
      clearHeading,
      toggleBlockquote,
      toggleCodeBlock,
      toggleBulletList,
      toggleOrderedList,
      setLink,
      insertImage,
      insertHorizontalRule,
      undo,
      hideKeyboard,
      getSelectedText: () => {
        if (!editor) return "";
        const { from, to } = editor.state.selection;
        return editor.state.doc.textBetween(from, to, " ");
      },
    }),
    [
      editor,
      toggleBold,
      toggleItalic,
      toggleStrike,
      setHeading,
      clearHeading,
      toggleBlockquote,
      toggleCodeBlock,
      toggleBulletList,
      toggleOrderedList,
      setLink,
      insertImage,
      insertHorizontalRule,
      undo,
      hideKeyboard,
    ]
  );

  return (
    <EditorContent
      editor={editor}
      className={cn(
        "flex-1 overflow-auto",
        "[&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
        "[&_.is-editor-empty:first-child]:before:text-muted-foreground/50",
        "[&_.is-editor-empty:first-child]:before:float-left",
        "[&_.is-editor-empty:first-child]:before:h-0",
        "[&_.is-editor-empty:first-child]:before:pointer-events-none",
        className
      )}
    />
  );
});

export default TipTapEditor;
