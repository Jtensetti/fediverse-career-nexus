import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  User,
  Briefcase,
  GraduationCap,
  Sparkles,
  FileText,
  Check,
} from 'lucide-react';
import {
  LinkedInImportData,
  ImportOptions,
} from '@/services/linkedinImportService';

interface PreviewStepProps {
  data: LinkedInImportData;
  options: ImportOptions;
  onOptionsChange: (options: ImportOptions) => void;
  onConfirm: () => void;
  onBack: () => void;
  isProcessing: boolean;
  error: string | null;
}

export default function PreviewStep({
  data,
  options,
  onOptionsChange,
  onConfirm,
  onBack,
  isProcessing,
  error,
}: PreviewStepProps) {
  const toggleOption = (key: keyof ImportOptions) => {
    onOptionsChange({
      ...options,
      [key]: !options[key],
    });
  };

  const getImportCount = () => {
    let count = 0;
    if (options.includeProfile && data.profile) count++;
    if (options.includeExperiences) count += data.experiences.length;
    if (options.includeEducation) count += data.education.length;
    if (options.includeSkills) count += data.skills.length;
    if (options.includeArticles) count += data.articles.length;
    return count;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto p-1">
          <TabsTrigger value="profile" className="text-xs py-2 px-1 flex flex-col gap-1">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="experience" className="text-xs py-2 px-1 flex flex-col gap-1">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Work</span>
          </TabsTrigger>
          <TabsTrigger value="education" className="text-xs py-2 px-1 flex flex-col gap-1">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Education</span>
          </TabsTrigger>
          <TabsTrigger value="skills" className="text-xs py-2 px-1 flex flex-col gap-1">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Skills</span>
          </TabsTrigger>
          <TabsTrigger value="articles" className="text-xs py-2 px-1 flex flex-col gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Posts</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Switch
                id="include-profile"
                checked={options.includeProfile}
                onCheckedChange={() => toggleOption('includeProfile')}
              />
              <Label htmlFor="include-profile" className="font-medium">Import profile info</Label>
            </div>
            {data.profile && (
              <Badge variant="secondary" className="gap-1">
                <Check className="h-3 w-3" />
                Found
              </Badge>
            )}
          </div>

          {data.profile ? (
            <div className="space-y-3 p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{data.profile.fullname || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Headline</p>
                <p className="text-sm">{data.profile.headline || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bio</p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {data.profile.bio || 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm">{data.profile.location || 'Not provided'}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">
              No profile data found in the export
            </p>
          )}
        </TabsContent>

        <TabsContent value="experience" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Switch
                id="include-experiences"
                checked={options.includeExperiences}
                onCheckedChange={() => toggleOption('includeExperiences')}
              />
              <Label htmlFor="include-experiences" className="font-medium">Import work experience</Label>
            </div>
            <Badge variant="secondary">{data.experiences.length} found</Badge>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {data.experiences.length > 0 ? (
              data.experiences.map((exp, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">{exp.title}</p>
                  <p className="text-sm text-muted-foreground">{exp.company}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {exp.start_date || 'Unknown'} – {exp.is_current_role ? 'Present' : exp.end_date || 'Unknown'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-6">
                No work experience found
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="education" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Switch
                id="include-education"
                checked={options.includeEducation}
                onCheckedChange={() => toggleOption('includeEducation')}
              />
              <Label htmlFor="include-education" className="font-medium">Import education</Label>
            </div>
            <Badge variant="secondary">{data.education.length} found</Badge>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {data.education.length > 0 ? (
              data.education.map((edu, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">{edu.institution}</p>
                  <p className="text-sm text-muted-foreground">
                    {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {edu.start_year || 'Unknown'} – {edu.end_year || 'Present'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-6">
                No education found
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="skills" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Switch
                id="include-skills"
                checked={options.includeSkills}
                onCheckedChange={() => toggleOption('includeSkills')}
              />
              <Label htmlFor="include-skills" className="font-medium">Import skills</Label>
            </div>
            <Badge variant="secondary">{data.skills.length} found</Badge>
          </div>

          <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto">
            {data.skills.length > 0 ? (
              data.skills.map((skill, i) => (
                <Badge key={i} variant="outline" className="font-normal">
                  {skill.name}
                </Badge>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-6 w-full">
                No skills found
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="articles" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Switch
                id="include-articles"
                checked={options.includeArticles}
                onCheckedChange={() => toggleOption('includeArticles')}
              />
              <Label htmlFor="include-articles" className="font-medium">Import as drafts</Label>
            </div>
            <Badge variant="secondary">{data.articles.length} found</Badge>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {data.articles.length > 0 ? (
              data.articles.map((article, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">{article.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {article.excerpt}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-6">
                No articles found
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center pt-2">
        <Button variant="ghost" onClick={onBack} disabled={isProcessing}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Button onClick={onConfirm} disabled={isProcessing || getImportCount() === 0}>
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            `Import ${getImportCount()} items`
          )}
        </Button>
      </div>
    </div>
  );
}
