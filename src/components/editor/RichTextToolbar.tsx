import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [headingOpen, setHeadingOpen] = useState(false);
  const iconSize = isMobile ? "h-5 w-5" : "h-4 w-4";
  const buttonSize = isMobile ? "h-11 w-11" : "h-9 w-9";

  const headingOptions = [
    { label: t("articleEditor.paragraph", "Brödtext"), action: "normal" as const },
    { label: t("articleEditor.heading", { level: 1, defaultValue: "Rubrik {{level}}" }), action: "heading-1" as const },
    { label: t("articleEditor.heading", { level: 2, defaultValue: "Rubrik {{level}}" }), action: "heading-2" as const },
    { label: t("articleEditor.heading", { level: 3, defaultValue: "Rubrik {{level}}" }), action: "heading-3" as const },
    { label: t("articleEditor.heading", { level: 4, defaultValue: "Rubrik {{level}}" }), action: "heading-4" as const },
    { label: t("articleEditor.heading", { level: 5, defaultValue: "Rubrik {{level}}" }), action: "heading-5" as const },
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
        aria-label={t("articleEditor.bold", "Fetstil")} title={t("articleEditor.bold", "Fetstil")}
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
        aria-label={t("articleEditor.italic", "Kursiv")} title={t("articleEditor.italic", "Kursiv")}
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
        aria-label={t("articleEditor.strikethrough", "Genomstruken")} title={t("articleEditor.strikethrough", "Genomstruken")}
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
            aria-label={t("articleEditor.textStyle", "Textformat")} title={t("articleEditor.textStyle", "Textformat")}
          >
            <Type className={iconSize} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-40 p-1"
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
        aria-label={t("articleEditor.insertLink", "Infoga länk")} title={t("articleEditor.insertLink", "Infoga länk")}
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
        aria-label={t("articleEditor.quote", "Citat")} title={t("articleEditor.quote", "Citat")}
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
        aria-label={t("articleEditor.codeBlock", "Kodblock")} title={t("articleEditor.codeBlock", "Kodblock")}
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
  const { t } = useTranslation();
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
            aria-label={t("articleEditor.insert", "Infoga innehåll")} title={t("articleEditor.insert", "Infoga innehåll")}
          >
            <Plus className={iconSize} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-52 p-1"
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
              {t("articleEditor.uploadImage", "Ladda upp bild")}
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
              {t("articleEditor.imageUrl", "Bild från webbadress")}
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
              {t("articleEditor.divider", "Avdelare")}
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
        aria-label={t("articleEditor.insertLink", "Infoga länk")} title={t("articleEditor.insertLink", "Infoga länk")}
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
            aria-label={t("articleEditor.lists", "Listor")} title={t("articleEditor.lists", "Listor")}
          >
            <List className={iconSize} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-52 p-1"
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
              {t("articleEditor.bulletList", "Punktlista")}
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
              {t("articleEditor.numberedList", "Numrerad lista")}
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
        aria-label={t("articleEditor.quote", "Citat")} title={t("articleEditor.quote", "Citat")}
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
        aria-label={t("articleEditor.undo", "Ångra")} title={t("articleEditor.undo", "Ångra")}
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
          aria-label={t("articleEditor.hideKeyboard", "Dölj tangentbord")} title={t("articleEditor.hideKeyboard", "Dölj tangentbord")}
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
