import { Button } from '@/components/ui/button';
import { ExternalLink, Download, Clock, FileArchive, ArrowRight } from 'lucide-react';

interface InstructionsStepProps {
  onNext: () => void;
  onSkipToUpload: () => void;
}

export default function InstructionsStep({ onNext, onSkipToUpload }: InstructionsStepProps) {
  const linkedInExportUrl = 'https://www.linkedin.com/mypreferences/d/download-my-data';

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-lg p-4 border">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          How to export your LinkedIn data
        </h3>
        
        <ol className="space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
              1
            </span>
            <div>
              <p className="font-medium">Go to LinkedIn's data export page</p>
              <p className="text-muted-foreground mt-1">
                Click the button below to open LinkedIn's data download settings.
              </p>
            </div>
          </li>
          
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
              2
            </span>
            <div>
              <p className="font-medium">Request your data</p>
              <p className="text-muted-foreground mt-1">
                Select "Download larger data archive" and check the boxes for the data you want to export (Profile, Positions, Education, Skills, etc.)
              </p>
            </div>
          </li>
          
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
              3
            </span>
            <div className="flex items-start gap-2">
              <div>
                <p className="font-medium">Wait for the email</p>
                <p className="text-muted-foreground mt-1">
                  LinkedIn will send you an email when your data is ready. This usually takes a few minutes but can take up to 24 hours.
                </p>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
            </div>
          </li>
          
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
              4
            </span>
            <div className="flex items-start gap-2">
              <div>
                <p className="font-medium">Download the ZIP file</p>
                <p className="text-muted-foreground mt-1">
                  Once ready, download the ZIP file from LinkedIn and upload it here.
                </p>
              </div>
              <FileArchive className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
            </div>
          </li>
        </ol>
      </div>
      
      <div className="flex flex-col gap-3">
        <Button
          asChild
          className="w-full"
        >
          <a
            href={linkedInExportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2"
          >
            Open LinkedIn Data Export
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>
        
        <Button
          variant="outline"
          onClick={onSkipToUpload}
          className="w-full"
        >
          I already have my LinkedIn export
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      
      <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3">
        <p className="font-medium mb-1">🔒 Your privacy is protected</p>
        <p>
          Your LinkedIn data is processed entirely in your browser. We never store or send your export file to any server.
        </p>
      </div>
    </div>
  );
}
