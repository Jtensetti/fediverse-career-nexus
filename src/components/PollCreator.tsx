import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, BarChart3 } from "lucide-react";
import { pollDurationOptions } from "@/services/pollService";

interface PollCreatorProps {
  onPollChange: (poll: PollCreatorData | null) => void;
  onRemove: () => void;
}

export interface PollCreatorData {
  options: string[];
  durationMinutes: number;
  multipleChoice: boolean;
}

export function PollCreator({ onPollChange, onRemove }: PollCreatorProps) {
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [durationMinutes, setDurationMinutes] = useState(1440); // 1 day default
  const [multipleChoice, setMultipleChoice] = useState(false);

  const updateOptions = (newOptions: string[]) => {
    setOptions(newOptions);
    onPollChange({
      options: newOptions,
      durationMinutes,
      multipleChoice
    });
  };

  const addOption = () => {
    if (options.length < 4) {
      updateOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      updateOptions(newOptions);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    updateOptions(newOptions);
  };

  const handleDurationChange = (value: string) => {
    const mins = parseInt(value);
    setDurationMinutes(mins);
    onPollChange({ options, durationMinutes: mins, multipleChoice });
  };

  const handleMultipleChoiceChange = (checked: boolean) => {
    setMultipleChoice(checked);
    onPollChange({ options, durationMinutes, multipleChoice: checked });
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="h-4 w-4" />
          Poll Options
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              className="flex-1"
              maxLength={50}
            />
            {options.length > 2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeOption(index)}
                className="h-8 w-8 p-0 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        
        {options.length < 4 && (
          <Button
            variant="outline"
            size="sm"
            onClick={addOption}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add option
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 space-y-2">
          <Label className="text-xs text-muted-foreground">Duration</Label>
          <Select
            value={durationMinutes.toString()}
            onValueChange={handleDurationChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pollDurationOptions.map((opt) => (
                <SelectItem key={opt.minutes} value={opt.minutes.toString()}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 pt-6">
          <Switch
            id="multiple-choice"
            checked={multipleChoice}
            onCheckedChange={handleMultipleChoiceChange}
          />
          <Label htmlFor="multiple-choice" className="text-sm cursor-pointer">
            Multiple choice
          </Label>
        </div>
      </div>
    </div>
  );
}
