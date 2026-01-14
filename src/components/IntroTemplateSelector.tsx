import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const templates = [
  {
    id: "mutual",
    label: "Mutual Connection",
    text: "Hi! I noticed we both know [name]. I'd love to connect and chat about...",
  },
  {
    id: "post",
    label: "About a Post",
    text: "Hi! I saw your post about [topic] and found it really insightful. I wanted to reach out because...",
  },
  {
    id: "event",
    label: "Event Connection",
    text: "Hi! We both attended [event]. I really enjoyed [aspect] and thought we might have things in common...",
  },
  {
    id: "collaboration",
    label: "Collaboration",
    text: "Hi! I'm working on [project/idea] and think your expertise in [area] could be a great fit. Would you be open to a chat?",
  },
];

interface IntroTemplateSelectorProps {
  onSelect: (template: string) => void;
  className?: string;
}

export default function IntroTemplateSelector({ onSelect, className }: IntroTemplateSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-medium text-muted-foreground">
        Start with a template (you can edit it):
      </p>
      <div className="grid gap-2">
        {templates.map((template) => (
          <Button
            key={template.id}
            variant="outline"
            size="sm"
            className="justify-start h-auto py-2 px-3 text-left"
            onClick={() => onSelect(template.text)}
          >
            <div>
              <p className="font-medium text-sm">{template.label}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                {template.text.slice(0, 50)}...
              </p>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
