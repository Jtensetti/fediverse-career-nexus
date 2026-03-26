import { Button } from '@/components/ui/button';
import { ExternalLink, ArrowRight, Lock } from 'lucide-react';

interface InstructionsStepProps {
  onNext: () => void;
  onSkipToUpload: () => void;
}

export default function InstructionsStep({ onNext, onSkipToUpload }: InstructionsStepProps) {
  const linkedInExportUrl = 'https://www.linkedin.com/mypreferences/d/download-my-data';

  const steps = [
    { title: "Öppna LinkedIns dataexport", description: "Klicka på knappen nedan för att gå till LinkedIns nedladdningsinställningar." },
    { title: "Begär din data", description: 'Välj "Download larger data archive" och markera den data du vill exportera.' },
    { title: "Vänta på e-post", description: "LinkedIn skickar ett mejl när din data är klar. Vanligtvis några minuter, upp till 24 timmar." },
    { title: "Ladda upp ZIP-filen", description: "Ladda ner ZIP-filen från LinkedIn och ladda upp den här." },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">{index + 1}</div>
            <div className="flex-1 pt-1">
              <p className="font-medium text-foreground">{step.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="space-y-3 pt-2">
        <Button asChild className="w-full">
          <a href={linkedInExportUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
            Öppna LinkedIns dataexport
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">eller</span></div>
        </div>
        
        <Button variant="outline" onClick={onSkipToUpload} className="w-full">
          Jag har redan min export
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-sm">
        <Lock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-foreground">Din integritet skyddas</p>
          <p className="text-muted-foreground mt-0.5">Data bearbetas i din webbläsare. Vi lagrar eller skickar aldrig din fil till någon server.</p>
        </div>
      </div>
    </div>
  );
}