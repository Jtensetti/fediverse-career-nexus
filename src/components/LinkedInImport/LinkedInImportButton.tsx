import { lazy, Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Linkedin } from 'lucide-react';

// Lazy: the modal pulls in jszip (~100kB). Only load when the user clicks.
const LinkedInImportModal = lazy(() => import('./LinkedInImportModal'));

interface LinkedInImportButtonProps {
  onImportComplete?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export default function LinkedInImportButton({
  onImportComplete,
  variant = 'outline',
  size = 'default',
  className = '',
}: LinkedInImportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);

  const handleOpen = () => {
    setHasOpenedOnce(true);
    setIsModalOpen(true);
  };

  const handleImportComplete = () => {
    setIsModalOpen(false);
    onImportComplete?.();
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpen}
        className={`gap-2 ${className}`}
      >
        <Linkedin className="h-4 w-4" />
        Importera från LinkedIn
      </Button>

      {hasOpenedOnce && (
        <Suspense fallback={null}>
          <LinkedInImportModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            onImportComplete={handleImportComplete}
          />
        </Suspense>
      )}
    </>
  );
}
