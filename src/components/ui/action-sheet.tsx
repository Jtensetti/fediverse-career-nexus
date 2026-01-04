import * as React from "react";
import { cn } from "@/lib/utils";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
  BottomSheetClose,
} from "@/components/ui/bottom-sheet";

interface ActionSheetOption {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ActionSheetProps {
  trigger: React.ReactNode;
  title?: string;
  options: ActionSheetOption[];
  cancelLabel?: string;
}

const ActionSheet = ({
  trigger,
  title,
  options,
  cancelLabel = "Cancel",
}: ActionSheetProps) => {
  const [open, setOpen] = React.useState(false);

  const handleOptionClick = (option: ActionSheetOption) => {
    if (!option.disabled) {
      option.onClick();
      setOpen(false);
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      <BottomSheetTrigger asChild>{trigger}</BottomSheetTrigger>
      <BottomSheetContent>
        {title && (
          <BottomSheetHeader>
            <BottomSheetTitle>{title}</BottomSheetTitle>
          </BottomSheetHeader>
        )}
        <div className="flex flex-col p-2">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionClick(option)}
              disabled={option.disabled}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors",
                "hover:bg-accent focus:bg-accent focus:outline-none",
                option.destructive && "text-destructive hover:bg-destructive/10",
                option.disabled && "cursor-not-allowed opacity-50"
              )}
            >
              {option.icon && (
                <span className="flex h-5 w-5 items-center justify-center">
                  {option.icon}
                </span>
              )}
              <span className="font-medium">{option.label}</span>
            </button>
          ))}
        </div>
        <div className="border-t p-2">
          <BottomSheetClose asChild>
            <button className="w-full rounded-lg px-4 py-3 text-center font-medium text-muted-foreground transition-colors hover:bg-accent focus:bg-accent focus:outline-none">
              {cancelLabel}
            </button>
          </BottomSheetClose>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
};

export { ActionSheet };
export type { ActionSheetOption, ActionSheetProps };
