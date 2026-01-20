import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BarChart3, Clock, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPollResults, votePoll, PollResults } from "@/services/pollService";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface PollDisplayProps {
  pollId: string;
  content: Record<string, unknown>;
  className?: string;
}

export function PollDisplay({ pollId, content, className }: PollDisplayProps) {
  const { user } = useAuth();
  const [results, setResults] = useState<PollResults | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Normalize content: extract Question from Create activity if nested
  const pollContent = useMemo(() => {
    if (content?.type === 'Create' && 
        content?.object && 
        typeof content.object === 'object' &&
        (content.object as Record<string, unknown>).type === 'Question') {
      return content.object as Record<string, unknown>;
    }
    return content;
  }, [content]);

  const isMultipleChoice = Array.isArray(pollContent?.anyOf);
  const rawOptions = pollContent?.oneOf || pollContent?.anyOf || [];
  const options = (Array.isArray(rawOptions) ? rawOptions : []) as Array<{ name: string }>;
  const endTime = pollContent?.endTime as string | undefined;
  const isClosed = endTime ? new Date(endTime) < new Date() : false;
  
  // Check if poll has valid options
  const hasValidOptions = options && options.length > 0;

  useEffect(() => {
    if (hasValidOptions) {
      loadResults();
    }
  }, [pollId, hasValidOptions]);

  const loadResults = async () => {
    const data = await getPollResults(pollId, pollContent);
    if (data) {
      setResults(data);
      setHasVoted(data.userVotes.length > 0);
      setShowResults(data.userVotes.length > 0 || data.isClosed);
    }
  };
  
  // If no valid options, don't render the poll (after all hooks)
  if (!hasValidOptions) {
    return (
      <div className={cn("p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground", className)}>
        Poll data unavailable
      </div>
    );
  }

  const handleVote = async () => {
    if (!user || selectedOptions.length === 0) return;
    
    setIsVoting(true);
    const success = await votePoll(pollId, selectedOptions);
    if (success) {
      setHasVoted(true);
      setShowResults(true);
      await loadResults();
    }
    setIsVoting(false);
  };

  const toggleOption = (index: number) => {
    if (isMultipleChoice) {
      setSelectedOptions(prev =>
        prev.includes(index)
          ? prev.filter(i => i !== index)
          : [...prev, index]
      );
    } else {
      setSelectedOptions([index]);
    }
  };

  const getPercentage = (voteCount: number) => {
    if (!results || results.totalVotes === 0) return 0;
    return Math.round((voteCount / results.totalVotes) * 100);
  };

  const getTimeRemaining = () => {
    if (!endTime) return null;
    const end = new Date(endTime);
    if (end < new Date()) return "Closed";
    return formatDistanceToNow(end, { addSuffix: true });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Poll question (from post content) */}
      
      {/* Options */}
      <div className="space-y-2">
        {showResults ? (
          // Results view
          options.map((option, index) => {
            const voteCount = results?.options.find(o => o.index === index)?.voteCount || 0;
            const percentage = getPercentage(voteCount);
            const isUserVote = results?.userVotes.includes(index);
            
            // Fun themed colors that work in both light and dark modes
            const barColors = [
              "bg-primary",
              "bg-success", 
              "bg-info",
              "bg-warning",
            ];
            const barColor = barColors[index % barColors.length];

            return (
              <div key={index} className="relative overflow-hidden rounded-lg">
                {/* Colored background bar */}
                <div 
                  className={cn(
                    "absolute inset-0 h-full transition-all duration-500 ease-out opacity-20 dark:opacity-30",
                    barColor
                  )}
                  style={{ width: `${percentage}%` }}
                />
                <div className="relative z-10 flex items-center justify-between py-2 px-3 border border-border bg-background/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {isUserVote && (
                      <Check className={cn("h-4 w-4 shrink-0", barColor.replace("bg-", "text-"))} />
                    )}
                    <span className={cn(
                      "text-sm",
                      isUserVote && "font-medium"
                    )}>
                      {option.name}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          // Voting view
          isMultipleChoice ? (
            <div className="space-y-2">
              {options.map((option, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-3 py-2 px-3 rounded-lg border cursor-pointer transition-colors",
                    selectedOptions.includes(index)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                  onClick={() => toggleOption(index)}
                >
                  <Checkbox
                    checked={selectedOptions.includes(index)}
                    onCheckedChange={() => toggleOption(index)}
                  />
                  <span className="text-sm">{option.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <RadioGroup
              value={selectedOptions[0]?.toString()}
              onValueChange={(value) => setSelectedOptions([parseInt(value)])}
            >
              {options.map((option, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-3 py-2 px-3 rounded-lg border cursor-pointer transition-colors",
                    selectedOptions.includes(index)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                  onClick={() => setSelectedOptions([index])}
                >
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="text-sm cursor-pointer flex-1">
                    {option.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {results && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {results.totalVotes} vote{results.totalVotes !== 1 ? "s" : ""}
            </span>
          )}
          {endTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {getTimeRemaining()}
            </span>
          )}
        </div>

        {!showResults && !isClosed && user && (
          <Button
            size="sm"
            onClick={handleVote}
            disabled={selectedOptions.length === 0 || isVoting}
          >
            {isVoting ? "Voting..." : "Vote"}
          </Button>
        )}

        {!showResults && !isClosed && !user && (
          <span className="text-xs text-muted-foreground">Log in to vote</span>
        )}

        {hasVoted && !isClosed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowResults(false);
              setSelectedOptions([]);
            }}
            className="text-xs h-7"
          >
            Change vote
          </Button>
        )}
      </div>
    </div>
  );
}
