import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle2,
  AlertCircle,
  User,
  Briefcase,
  GraduationCap,
  Star,
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

  return (
    <div className="space-y-6">
      <div className="text-center">
        {success ? (
          <>
            <CheckCircle2 className="h-16 w-16 text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Import Successful!</h3>
            <p className="text-muted-foreground mt-1">
              {getTotalImported()} items have been imported to your profile
            </p>
          </>
        ) : (
          <>
            <AlertCircle className="h-16 w-16 text-accent mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Import Completed with Issues</h3>
            <p className="text-muted-foreground mt-1">
              Some items were imported, but there were some errors
            </p>
          </>
        )}
      </div>

      <Card>
        <CardContent className="pt-4">
          <h4 className="font-medium mb-3">Import Summary</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Profile
              </span>
              <span className={imported.profile ? 'text-primary font-medium' : 'text-muted-foreground'}>
                {imported.profile ? 'Updated' : 'Skipped'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Work Experience
              </span>
              <span className={imported.experiences > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}>
                {imported.experiences} added
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                Education
              </span>
              <span className={imported.education > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}>
                {imported.education} added
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                Skills
              </span>
              <span className={imported.skills > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}>
                {imported.skills} added
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Articles
              </span>
              <span className={imported.articles > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}>
                {imported.articles} added as drafts
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-1">Some errors occurred:</p>
            <ul className="list-disc list-inside text-sm">
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center">
        <Button onClick={onClose} className="min-w-32">
          View Profile
        </Button>
      </div>
    </div>
  );
}
