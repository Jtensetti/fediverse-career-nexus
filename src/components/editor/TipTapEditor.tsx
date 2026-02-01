import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onSelectionChange?: (hasSelection: boolean) => void;
}

export function TipTapEditor({
  value,
  onChange,
  placeholder = "Write your article...",
  className,
  onFocus,
  onBlur,
  onSelectionChange,
}: TipTapEditorProps) {
  const isUpdatingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
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
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
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

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      isUpdatingRef.current = true;
      editor.commands.setContent(value, { emitUpdate: false });
      isUpdatingRef.current = false;
    }
  }, [value, editor]);

  // Expose editor commands
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

  const setLink = useCallback((url: string) => {
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
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

  // Attach commands to window for toolbar access
  useEffect(() => {
    if (editor) {
      (window as any).__tiptapEditor = {
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
          const { from, to } = editor.state.selection;
          return editor.state.doc.textBetween(from, to, " ");
        },
      };
    }
    return () => {
      delete (window as any).__tiptapEditor;
    };
  }, [
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
  ]);

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
}

export default TipTapEditor;
