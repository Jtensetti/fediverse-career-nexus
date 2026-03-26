import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "lucide-react";

interface LinkInsertSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (url: string, text?: string) => void;
  selectedText?: string;
  trigger?: React.ReactNode;
}

export function LinkInsertSheet({
  open,
  onOpenChange,
  onInsert,
  selectedText = "",
  trigger,
}: LinkInsertSheetProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [url, setUrl] = useState("");
  const [text, setText] = useState(selectedText);

  const handleInsert = () => {
    if (!url) return;
    onInsert(url, text || undefined);
    setUrl("");
    setText("");
    onOpenChange(false);
  };

  const content = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="link-url">{t("linkInsert.urlLabel")}</Label>
        <Input
          id="link-url"
          type="url"
          placeholder={t("linkInsert.urlPlaceholder")}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="link-text">{t("linkInsert.textLabel")}</Label>
        <Input
          id="link-text"
          type="text"
          placeholder={t("linkInsert.textPlaceholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <Button onClick={handleInsert} disabled={!url} className="w-full">
        {t("linkInsert.insert")}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        {trigger}
        <SheetContent side="bottom" className="pb-safe">
          <SheetHeader>
            <SheetTitle>{t("linkInsert.title")}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {trigger}
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Link className="h-4 w-4" />
            {t("linkInsert.title")}
          </h4>
          {content}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default LinkInsertSheet;
