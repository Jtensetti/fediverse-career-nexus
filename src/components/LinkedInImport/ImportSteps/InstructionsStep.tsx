import { Button } from '@/components/ui/button';
import { ExternalLink, ArrowRight, Lock } from 'lucide-react';

import { tx } from "@/i18n/tx";
interface InstructionsStepProps {
  onSkipToUpload: () => void;
}

export default function InstructionsStep({ onSkipToUpload }: InstructionsStepProps) {
  const linkedInExportUrl = 'https://www.linkedin.com/mypreferences/d/download-my-data';

  const steps = [
    { title: tx("ui.instructionsStep.oppnaLinkedinsDataexport"), description: tx("ui.instructionsStep.klickaPaKnappenNedan") },
    { title: tx("ui.instructionsStep.begarDinData"), description: tx("ui.instructionsStep.valjDownloadLargerData") },
    { title: tx("ui.instructionsStep.vantaPaEPost"), description: tx("ui.instructionsStep.linkedinSkickarEttMejl") },
    { title: tx("ui.instructionsStep.laddaUppZipFilen"), description: tx("ui.instructionsStep.laddaNerZipFilen") },
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
            {tx("ui.instructionsStep.oppnaLinkedinsDataexport")}
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">{tx("ui.instructionsStep.eller")}</span></div>
        </div>
        
        <Button variant="outline" onClick={onSkipToUpload} className="w-full">
          {tx("ui.instructionsStep.jagHarRedanMin")}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-sm">
        <Lock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-foreground">{tx("ui.instructionsStep.dinIntegritetSkyddas")}</p>
          <p className="text-muted-foreground mt-0.5">{tx("ui.instructionsStep.dataBearbetasIDin")}</p>
        </div>
      </div>
    </div>
  );
}