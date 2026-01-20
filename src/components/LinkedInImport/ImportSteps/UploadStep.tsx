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
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary/50'}
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
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="font-medium">Processing your LinkedIn data...</p>
              <p className="text-sm text-muted-foreground mt-1">
                This may take a moment depending on the file size
              </p>
            </>
          ) : (
            <>
              <div className="relative mb-4">
                <FileArchive className="h-12 w-12 text-muted-foreground" />
                <Upload className="h-5 w-5 text-primary absolute -bottom-1 -right-1 bg-background rounded-full p-0.5" />
              </div>
              <p className="font-medium">
                Drop your LinkedIn ZIP file here
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Maximum file size: 100MB
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
        <Button variant="outline" onClick={onBack} disabled={isProcessing}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3">
        <p className="font-medium mb-1">Expected files in your LinkedIn export:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Profile.csv - Your basic profile information</li>
          <li>Positions.csv - Your work experience</li>
          <li>Education.csv - Your education history</li>
          <li>Skills.csv - Your skills and endorsements</li>
        </ul>
      </div>
    </div>
  );
}
