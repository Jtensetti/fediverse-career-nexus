import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileArchive, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { validateLinkedInZip } from '@/services/linkedinImportService';

interface UploadStepProps {
  onFileSelected: (file: File) => void;
  onBack: () => void;
  isProcessing: boolean;
  error: string | null;
}

export default function UploadStep({
  onFileSelected,
  onBack,
  isProcessing,
  error,
}: UploadStepProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      const validation = validateLinkedInZip(file);
      if (!validation.valid) {
        setValidationError(validation.error || 'Invalid file');
        return;
      }
      setValidationError(null);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const displayError = error || validationError;

  return (
    <div className="space-y-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary/50 hover:bg-muted/30'}
        `}
      >
        <input
          type="file"
          accept=".zip"
          onChange={handleInputChange}
          className="hidden"
          id="linkedin-file-input"
          disabled={isProcessing}
        />
        <label
          htmlFor="linkedin-file-input"
          className="cursor-pointer flex flex-col items-center"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="font-medium text-foreground">Processing your data...</p>
              <p className="text-sm text-muted-foreground mt-1">
                This may take a moment
              </p>
            </>
          ) : (
            <>
              <div className="relative mb-4">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <FileArchive className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Upload className="h-3 w-3 text-primary-foreground" />
                </div>
              </div>
              <p className="font-medium text-foreground">
                Drop your LinkedIn ZIP here
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Max file size: 100MB
              </p>
            </>
          )}
        </label>
      </div>

      {displayError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} disabled={isProcessing}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="p-3 rounded-lg bg-muted/50 text-sm">
        <p className="font-medium text-foreground mb-2">Expected files in your export:</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>• Profile.csv – Basic profile info</li>
          <li>• Positions.csv – Work experience</li>
          <li>• Education.csv – Education history</li>
          <li>• Skills.csv – Skills and endorsements</li>
          <li>• Shares.csv – Posts and articles (optional)</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-muted">
          <strong>Tip:</strong> When exporting from LinkedIn, select "The larger data archive" for more complete data.
        </p>
      </div>
    </div>
  );
}
