import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Strikethrough,
  Link,
  Quote,
  Code,
  Plus,
  List,
  ListOrdered,
  Undo2,
  ChevronDown,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ToolbarAction =
  | "bold"
  | "italic"
  | "strikethrough"
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "heading-4"
  | "heading-5"
  | "normal"
  | "link"
  | "code-block"
  | "bullet-list"
  | "numbered-list"
  | "quote"
  | "divider"
  | "image"
  | "image-url"
  | "undo"
  | "hide-keyboard";

interface RichTextToolbarProps {
  hasSelection: boolean;
  onAction: (action: ToolbarAction) => void;
  isMobile: boolean;
  className?: string;
  onHideKeyboard?: () => void;
}

// Selection mode: B, I, S | aA | Link | Quote | Code
const SelectionToolbar = ({ 
  onAction, 
  isMobile 
}: { 
  onAction: (action: ToolbarAction) => void;
  isMobile: boolean;
}) => {
  const [headingOpen, setHeadingOpen] = useState(false);
  const iconSize = isMobile ? "h-5 w-5" : "h-4 w-4";
  const buttonSize = isMobile ? "h-11 w-11" : "h-9 w-9";

  const headingOptions = [
    { label: "Normal", action: "normal" as const },
    { label: "H1", action: "heading-1" as const },
    { label: "H2", action: "heading-2" as const },
    { label: "H3", action: "heading-3" as const },
    { label: "H4", action: "heading-4" as const },
    { label: "H5", action: "heading-5" as const },
  ];

  const preventBlur = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex items-center justify-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={preventBlur}
        onTouchStart={preventBlur}
        onClick={() => onAction("bold")}
        className={cn(buttonSize, "p-0 shrink-0")}
        aria-label="Bold"
      >
        <Bold className={iconSize} strokeWidth={2.5} />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={preventBlur}
        onTouchStart={preventBlur}
        onClick={() => onAction("italic")}
        className={cn(buttonSize, "p-0 shrink-0")}
        aria-label="Italic"
      >
        <Italic className={iconSize} />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={preventBlur}
        onTouchStart={preventBlur}
        onClick={() => onAction("strikethrough")}
        className={cn(buttonSize, "p-0 shrink-0")}
        aria-label="Strikethrough"
      >
        <Strikethrough className={iconSize} />
      </Button>

      <div className="w-px h-5 bg-border/60 mx-1.5" />

      <Popover open={headingOpen} onOpenChange={setHeadingOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={preventBlur}
            onTouchStart={preventBlur}
            className={cn(buttonSize, "p-0 shrink-0")}
            aria-label="Text style"
          >
            <Type className={iconSize} />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-28 p-1" 
          align="center" 
          side="top"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col">
            {headingOptions.map(({ label, action }) => (
              <Button
                key={action}
                type="button"
                variant="ghost"
                size="sm"
                onMouseDown={preventBlur}
                onTouchStart={preventBlur}
                onClick={() => {
                  onAction(action);
                  setHeadingOpen(false);
                }}
                className="justify-start h-8 text-sm"
              >
                {label}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-5 bg-border/60 mx-1.5" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={preventBlur}
        onTouchStart={preventBlur}
        onClick={() => onAction("link")}
        className={cn(buttonSize, "p-0 shrink-0")}
        aria-label="Insert link"
      >
        <Link className={iconSize} />
      </Button>

      <div className="w-px h-5 bg-border/60 mx-1.5" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={preventBlur}
        onTouchStart={preventBlur}
        onClick={() => onAction("quote")}
        className={cn(buttonSize, "p-0 shrink-0")}
        aria-label="Block quote"
      >
        <Quote className={iconSize} />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={preventBlur}
        onTouchStart={preventBlur}
        onClick={() => onAction("code-block")}
        className={cn(buttonSize, "p-0 shrink-0")}
        aria-label="Code block"
      >
        <Code className={iconSize} />
      </Button>
    </div>
  );
};

// Default mode: + | Link | Lists | Quote | Undo | Keyboard
const DefaultToolbar = ({ 
  onAction,
  onHideKeyboard,
  isMobile 
}: { 
  onAction: (action: ToolbarAction) => void;
  onHideKeyboard?: () => void;
  isMobile: boolean;
}) => {
  const [insertOpen, setInsertOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const iconSize = isMobile ? "h-5 w-5" : "h-4 w-4";
  const buttonSize = isMobile ? "h-11 w-11" : "h-9 w-9";

  const preventBlur = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex items-center justify-center gap-0.5">
      <Popover open={insertOpen} onOpenChange={setInsertOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={preventBlur}
            onTouchStart={preventBlur}
            className={cn(buttonSize, "p-0 shrink-0")}
            aria-label="Insert"
          >
            <Plus className={iconSize} />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-36 p-1" 
          align="start" 
          side="top"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={preventBlur}
              onTouchStart={preventBlur}
              onClick={() => {
                onAction("image");
                setInsertOpen(false);
              }}
              className="justify-start h-8 text-sm"
            >
              Upload from device
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={preventBlur}
              onTouchStart={preventBlur}
              onClick={() => {
                onAction("image-url");
                setInsertOpen(false);
              }}
              className="justify-start h-8 text-sm"
            >
              Image from URL
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={preventBlur}
              onTouchStart={preventBlur}
              onClick={() => {
                onAction("divider");
                setInsertOpen(false);
              }}
              className="justify-start h-8 text-sm"
            >
              Divider
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={preventBlur}
        onTouchStart={preventBlur}
        onClick={() => onAction("link")}
        className={cn(buttonSize, "p-0 shrink-0")}
        aria-label="Insert link"
      >
        <Link className={iconSize} />
      </Button>

      <Popover open={listOpen} onOpenChange={setListOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={preventBlur}
            onTouchStart={preventBlur}
            className={cn(buttonSize, "p-0 shrink-0")}
            aria-label="Lists"
          >
            <List className={iconSize} />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-36 p-1" 
          align="center" 
          side="top"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={preventBlur}
              onTouchStart={preventBlur}
              onClick={() => {
                onAction("bullet-list");
                setListOpen(false);
              }}
              className="justify-start h-8 text-sm gap-2"
            >
              <List className="h-4 w-4" />
              Bullet list
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={preventBlur}
              onTouchStart={preventBlur}
              onClick={() => {
                onAction("numbered-list");
                setListOpen(false);
              }}
              className="justify-start h-8 text-sm gap-2"
            >
              <ListOrdered className="h-4 w-4" />
              Numbered list
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={preventBlur}
        onTouchStart={preventBlur}
        onClick={() => onAction("quote")}
        className={cn(buttonSize, "p-0 shrink-0")}
        aria-label="Block quote"
      >
        <Quote className={iconSize} />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={preventBlur}
        onTouchStart={preventBlur}
        onClick={() => onAction("undo")}
        className={cn(buttonSize, "p-0 shrink-0")}
        aria-label="Undo"
      >
        <Undo2 className={iconSize} />
      </Button>

      {isMobile && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onHideKeyboard}
          className={cn(buttonSize, "p-0 shrink-0")}
          aria-label="Hide keyboard"
        >
          <ChevronDown className={iconSize} />
        </Button>
      )}
    </div>
  );
};

export function RichTextToolbar({
  hasSelection,
  onAction,
  isMobile,
  className,
  onHideKeyboard,
}: RichTextToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center py-2 px-3",
        !isMobile && "bg-muted/50 border-t border-border",
        className
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={hasSelection ? "selection" : "default"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.1 }}
        >
          {hasSelection ? (
            <SelectionToolbar onAction={onAction} isMobile={isMobile} />
          ) : (
            <DefaultToolbar 
              onAction={onAction} 
              onHideKeyboard={onHideKeyboard}
              isMobile={isMobile} 
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default RichTextToolbar;
