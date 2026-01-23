import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { INTEREST_CATEGORIES } from "@/services/onboardingRecommendationService";

interface InterestSelectorProps {
  selectedInterests: string[];
  onToggle: (interestId: string) => void;
  maxSelections?: number;
}

export const InterestSelector = ({ 
  selectedInterests, 
  onToggle,
  maxSelections = 5 
}: InterestSelectorProps) => {
  const isSelected = (id: string) => selectedInterests.includes(id);
  const canSelectMore = selectedInterests.length < maxSelections;

  return (
    <div className="flex flex-wrap gap-2">
      {INTEREST_CATEGORIES.map((category) => {
        const selected = isSelected(category.id);
        const disabled = !selected && !canSelectMore;
        
        return (
          <Badge
            key={category.id}
            variant={selected ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-all text-sm py-2 px-4",
              selected && "bg-primary text-primary-foreground",
              !selected && !disabled && "hover:bg-primary/10 hover:border-primary/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !disabled && onToggle(category.id)}
          >
            {category.label}
          </Badge>
        );
      })}
    </div>
  );
};

export default InterestSelector;
