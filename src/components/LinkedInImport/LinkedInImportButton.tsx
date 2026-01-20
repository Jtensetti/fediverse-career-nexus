import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Linkedin } from 'lucide-react';
import LinkedInImportModal from './LinkedInImportModal';

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

  const handleImportComplete = () => {
    setIsModalOpen(false);
    onImportComplete?.();
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsModalOpen(true)}
        className={`gap-2 ${className}`}
      >
        <Linkedin className="h-4 w-4" />
        Import from LinkedIn
      </Button>

      <LinkedInImportModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
