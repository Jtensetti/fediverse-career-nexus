import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Link,
  Code,
  RemoveFormatting,
  List,
  ListOrdered,
  Quote,
  Minus,
  Image,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolbarAction =
  | "bold"
  | "italic"
  | "strikethrough"
  | "heading"
  | "link"
  | "code"
  | "clear"
  | "bullet-list"
  | "numbered-list"
  | "quote"
  | "code-block"
  | "divider"
  | "image";

interface EditorToolbarProps {
  hasSelection: boolean;
  onAction: (action: ToolbarAction) => void;
  isMobile: boolean;
  className?: string;
}

const selectionActions = [
  { action: "bold" as const, icon: Bold, label: "Bold" },
  { action: "italic" as const, icon: Italic, label: "Italic" },
  { action: "strikethrough" as const, icon: Strikethrough, label: "Strikethrough" },
  { action: "heading" as const, icon: Heading2, label: "Heading" },
  { action: "link" as const, icon: Link, label: "Link" },
  { action: "code" as const, icon: Code, label: "Inline code" },
  { action: "clear" as const, icon: RemoveFormatting, label: "Clear formatting" },
];

const defaultActions = [
  { action: "heading" as const, icon: Heading2, label: "Heading" },
  { action: "link" as const, icon: Link, label: "Link" },
  { action: "bullet-list" as const, icon: List, label: "Bullet list" },
  { action: "numbered-list" as const, icon: ListOrdered, label: "Numbered list" },
  { action: "quote" as const, icon: Quote, label: "Quote" },
  { action: "code-block" as const, icon: Code, label: "Code block" },
  { action: "divider" as const, icon: Minus, label: "Divider" },
  { action: "image" as const, icon: Image, label: "Image" },
];

export function EditorToolbar({
  hasSelection,
  onAction,
  isMobile,
  className,
}: EditorToolbarProps) {
  const actions = hasSelection ? selectionActions : defaultActions;

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 p-1.5 bg-muted/50 border-b border-border overflow-x-auto",
        isMobile && "fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-b-0 pb-safe",
        className
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={hasSelection ? "selection" : "default"}
          initial={{ opacity: 0, y: hasSelection ? -8 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: hasSelection ? 8 : -8 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-0.5"
        >
          {actions.map(({ action, icon: Icon, label }) => (
            <Button
              key={action}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAction(action)}
              className={cn(
                "h-8 w-8 p-0 shrink-0",
                isMobile && "h-10 w-10"
              )}
              aria-label={label}
              title={label}
            >
              <Icon className={cn("h-4 w-4", isMobile && "h-5 w-5")} />
            </Button>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default EditorToolbar;
