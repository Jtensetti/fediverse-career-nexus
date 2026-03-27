import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileArchive, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { validateLinkedInZip } from '@/services/content/linkedinImportService';

interface UploadStepProps {
  onFileSelected: (file: File) => void;
  onBack: () => void;
  isProcessing: boolean;
  error: string | null;
}

export default function UploadStep({ onFileSelected, onBack, isProcessing, error }: UploadStepProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    const validation = validateLinkedInZip(file);
    if (!validation.valid) { setValidationError(validation.error || 'Ogiltig fil'); return; }
    setValidationError(null); onFileSelected(file);
  }, [onFileSelected]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragOver(false); }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFile(e.target.files[0]);
  }, [handleFile]);

  const displayError = error || validationError;

  return (
    <div className="space-y-6">
      <div
        onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary/50 hover:bg-muted/30'}`}
      >
        <input type="file" accept=".zip" onChange={handleInputChange} className="hidden" id="linkedin-file-input" disabled={isProcessing} />
        <label htmlFor="linkedin-file-input" className="cursor-pointer flex flex-col items-center">
          {isProcessing ? (
            <>
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="font-medium text-foreground">Bearbetar din data...</p>
              <p className="text-sm text-muted-foreground mt-1">Detta kan ta en stund</p>
            </>
          ) : (
            <>
              <div className="relative mb-4">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center"><FileArchive className="h-6 w-6 text-muted-foreground" /></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center"><Upload className="h-3 w-3 text-primary-foreground" /></div>
              </div>
              <p className="font-medium text-foreground">Släpp din LinkedIn ZIP-fil här</p>
              <p className="text-sm text-muted-foreground mt-1">eller klicka för att bläddra</p>
              <p className="text-xs text-muted-foreground mt-3">Max filstorlek: 100MB</p>
            </>
          )}
        </label>
      </div>

      {displayError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{displayError}</AlertDescription></Alert>}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} disabled={isProcessing}><ArrowLeft className="h-4 w-4 mr-2" />Tillbaka</Button>
      </div>

      <div className="p-3 rounded-lg bg-muted/50 text-sm">
        <p className="font-medium text-foreground mb-2">Förväntade filer i din export:</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>• Profile.csv – Grundläggande profilinfo</li>
          <li>• Positions.csv – Arbetslivserfarenhet</li>
          <li>• Education.csv – Utbildningshistorik</li>
          <li>• Skills.csv – Kompetenser</li>
          <li>• Shares.csv – Inlägg och artiklar (valfritt)</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-muted">
          <strong>Tips:</strong> När du exporterar från LinkedIn, välj "The larger data archive" för mer komplett data.
        </p>
      </div>
    </div>
  );
}