
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import ModerationActionDialog from "@/components/ModerationActionDialog";
import { useState } from 'react';

interface ModerationHeaderProps {
  isAdmin: boolean;
  isModerator: boolean;
}

const ModerationHeader = ({ isAdmin, isModerator }: ModerationHeaderProps) => {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <h1 className="text-3xl font-bold tracking-tight">
        {t('moderation.title')}
      </h1>
      
      {(isAdmin || isModerator) && (
        <>
          <Button variant="default" onClick={() => setIsDialogOpen(true)}>
            {t('moderation.newAction')}
          </Button>
          
          <ModerationActionDialog 
            isOpen={isDialogOpen} 
            onOpenChange={setIsDialogOpen} 
          />
        </>
      )}
    </div>
  );
};

export default ModerationHeader;
