import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toggleSaveItem, isItemSaved, SavedItemType } from "@/services/savedItemsService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
      toast.error("Please sign in to save items");
      return;
    }

    setIsLoading(true);
    
    // Optimistic update
    setIsSaved(!isSaved);
    
    const result = await toggleSaveItem(itemType, itemId);
    
    if (result.success) {
      toast.success(result.saved ? "Saved!" : "Removed from saved");
    } else {
      // Revert on failure
      setIsSaved(isSaved);
      toast.error("Failed to save item");
    }
    
    setIsLoading(false);
  };

  const label = isSaved ? "Saved" : "Save";
  const ariaLabel = isSaved ? `Remove ${itemType} from saved` : `Save ${itemType}`;

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