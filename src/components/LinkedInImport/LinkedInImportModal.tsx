import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import InstructionsStep from './ImportSteps/InstructionsStep';
import UploadStep from './ImportSteps/UploadStep';
import PreviewStep from './ImportSteps/PreviewStep';
import ConfirmStep from './ImportSteps/ConfirmStep';
import {
  LinkedInImportData,
  ImportOptions,
  ImportResult,
  parseLinkedInExport,
  submitLinkedInImport,
} from '@/services/linkedinImportService';

interface LinkedInImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

type Step = 'instructions' | 'upload' | 'preview' | 'confirm';

const STEPS: Step[] = ['instructions', 'upload', 'preview', 'confirm'];

export default function LinkedInImportModal({
  open,
  onOpenChange,
  onImportComplete,
}: LinkedInImportModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('instructions');
  const [importData, setImportData] = useState<LinkedInImportData | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    includeProfile: true,
    includeExperiences: true,
    includeEducation: true,
    includeSkills: true,
    includeArticles: true,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleFileSelected = async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const data = await parseLinkedInExport(file);
      setImportData(data);
      setCurrentStep('preview');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to parse the LinkedIn export file'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importData) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await submitLinkedInImport(importData, importOptions);
      setImportResult(result);
      setCurrentStep('confirm');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to import data'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setCurrentStep('instructions');
    setImportData(null);
    setImportResult(null);
    setError(null);
    setIsProcessing(false);
    onOpenChange(false);
  };

  const handleComplete = () => {
    handleClose();
    onImportComplete?.();
  };

  const goToStep = (step: Step) => {
    setCurrentStep(step);
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'instructions':
        return 'Import from LinkedIn';
      case 'upload':
        return 'Upload Your Export';
      case 'preview':
        return 'Review Your Data';
      case 'confirm':
        return 'Import Complete';
      default:
        return 'Import from LinkedIn';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStepTitle()}
          </DialogTitle>
        </DialogHeader>

        <Progress value={progress} className="h-1 mb-4" />

        {currentStep === 'instructions' && (
          <InstructionsStep
            onNext={() => goToStep('upload')}
            onSkipToUpload={() => goToStep('upload')}
          />
        )}

        {currentStep === 'upload' && (
          <UploadStep
            onFileSelected={handleFileSelected}
            onBack={() => goToStep('instructions')}
            isProcessing={isProcessing}
            error={error}
          />
        )}

        {currentStep === 'preview' && importData && (
          <PreviewStep
            data={importData}
            options={importOptions}
            onOptionsChange={setImportOptions}
            onConfirm={handleConfirmImport}
            onBack={() => goToStep('upload')}
            isProcessing={isProcessing}
            error={error}
          />
        )}

        {currentStep === 'confirm' && importResult && (
          <ConfirmStep
            result={importResult}
            onClose={handleComplete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
