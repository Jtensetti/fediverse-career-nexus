import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const templates = [
  {
    id: "mutual",
    label: "Gemensam kontakt",
    text: "Hej! Jag såg att vi båda känner [namn]. Jag skulle gärna vilja knyta kontakt och prata om...",
  },
  {
    id: "post",
    label: "Om ett inlägg",
    text: "Hej! Jag läste ditt inlägg om [ämne] och tyckte det var väldigt intressant. Jag ville höra av mig för att...",
  },
  {
    id: "event",
    label: "Evenemangsträff",
    text: "Hej! Vi var båda på [evenemang]. Jag tyckte verkligen om [detalj] och tänkte att vi kanske har saker gemensamt...",
  },
  {
    id: "collaboration",
    label: "Samarbete",
    text: "Hej! Jag jobbar med [projekt/idé] och tror att din expertis inom [område] kan vara en bra match. Skulle du vara öppen för ett samtal?",
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
        Börja med en mall (du kan redigera den):
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
