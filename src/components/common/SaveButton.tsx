import { useTranslation } from 'react-i18next';
import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toggleSaveItem, isItemSaved, SavedItemType } from "@/services/content/savedItemsService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { tx } from "@/i18n/tx";
interface SaveButtonProps {
  itemId: string;
  itemType: SavedItemType;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "ghost" | "outline" | "default";
  showLabel?: boolean;
  className?: string;
}

export function SaveButton({ 
  itemId, 
  itemType, 
  size = "sm", 
  variant = "ghost",
  showLabel = false,
  className 
}: SaveButtonProps) {
  const { t } = useTranslation();
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkSaved = async () => {
      if (!user) return;
      const saved = await isItemSaved(itemType, itemId);
      setIsSaved(saved);
    };
    checkSaved();
  }, [itemId, itemType, user]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error(tx("ui.saveButton.loggaInForAtt"));
      return;
    }

    setIsLoading(true);
    
    setIsSaved(!isSaved);
    
    const result = await toggleSaveItem(itemType, itemId);
    
    if (result.success) {
      setIsSaved(result.saved);
      toast.success(tx(result.saved ? 'common.saved' : 'savedItems.removed'));
    } else {
      setIsSaved(isSaved);
      toast.error(tx("ui.saveButton.kundeInteSparaObjektet"));
    }
    
    setIsLoading(false);
  };

  const label = t(isSaved ? 'savedItems.saved' : 'common.save');
  const ariaLabel = t(isSaved ? 'reviewUI.removeSaved' : 'common.save');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn(
              "gap-1.5 transition-all",
              isSaved && "text-primary",
              className
            )}
            onClick={handleSave}
            disabled={isLoading}
            aria-label={ariaLabel}
            aria-pressed={isSaved}
          >
            <Bookmark 
              className={cn(
                "h-4 w-4 transition-transform",
                isSaved && "fill-current"
              )} 
            />
            {showLabel && <span className="text-xs">{label}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{ariaLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
