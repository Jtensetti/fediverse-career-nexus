import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Check,
  AlertCircle,
  User,
  Briefcase,
  GraduationCap,
  Sparkles,
  FileText,
} from 'lucide-react';
import { ImportResult } from '@/services/linkedinImportService';

interface ConfirmStepProps {
  result: ImportResult;
  onClose: () => void;
}

export default function ConfirmStep({ result, onClose }: ConfirmStepProps) {
  const { imported, errors, success } = result;

  const getTotalImported = () => {
    return (
      (imported.profile ? 1 : 0) +
      imported.experiences +
      imported.education +
      imported.skills +
      imported.articles
    );
  };

  const summaryItems = [
    {
      icon: User,
      label: 'Profile',
      value: imported.profile ? 'Updated' : 'Skipped',
      active: imported.profile,
    },
    {
      icon: Briefcase,
      label: 'Work Experience',
      value: `${imported.experiences} added`,
      active: imported.experiences > 0,
    },
    {
      icon: GraduationCap,
      label: 'Education',
      value: `${imported.education} added`,
      active: imported.education > 0,
    },
    {
      icon: Sparkles,
      label: 'Skills',
      value: `${imported.skills} added`,
      active: imported.skills > 0,
    },
    {
      icon: FileText,
      label: 'Articles',
      value: `${imported.articles} drafts`,
      active: imported.articles > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        {success ? (
          <>
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Import Successful</h3>
            <p className="text-muted-foreground mt-1">
              {getTotalImported()} items imported to your profile
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-lg font-semibold">Completed with Issues</h3>
            <p className="text-muted-foreground mt-1">
              Some items were imported, but there were errors
            </p>
          </>
        )}
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="font-medium text-sm mb-3">Import Summary</p>
        <div className="space-y-2">
          {summaryItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <item.icon className="h-4 w-4" />
                {item.label}
              </span>
              <span className={item.active ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-1">Some errors occurred:</p>
            <ul className="list-disc list-inside text-sm space-y-0.5">
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center pt-2">
        <Button onClick={onClose} className="min-w-32">
          View Profile
        </Button>
      </div>
    </div>
  );
}
