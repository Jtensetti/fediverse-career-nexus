import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface ContentWarningInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const COMMON_CWS = [
  'politics',
  'job loss',
  'mental health',
  'violence',
  'spoilers',
  'food',
  'alcohol'
];

export default function ContentWarningInput({
  value,
  onChange,
  className
}: ContentWarningInputProps) {
  const [isOpen, setIsOpen] = useState(!!value);

  const handleSuggestionClick = (suggestion: string) => {
    if (value) {
      onChange(`${value}, ${suggestion}`);
    } else {
      onChange(suggestion);
    }
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen}
      className={cn("w-full", className)}
    >
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant={value ? "secondary" : "ghost"}
          size="sm"
          className={cn(
            "gap-2 text-muted-foreground hover:text-foreground",
            value && "text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          {value ? 'CW: ' + value.substring(0, 20) + (value.length > 20 ? '...' : '') : 'Add content warning'}
          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-2">
        <div className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g., politics, spoilers, food..."
            className="flex-1"
          />
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {COMMON_CWS.filter(cw => !value.toLowerCase().includes(cw)).map((suggestion) => (
            <Badge
              key={suggestion}
              variant="outline"
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              + {suggestion}
            </Badge>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Content warnings help others choose what they want to see. Posts with CW will be collapsed by default.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
