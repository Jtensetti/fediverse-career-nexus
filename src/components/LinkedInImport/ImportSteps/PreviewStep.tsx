import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  ChevronDown,
  Info,
} from 'lucide-react';
import {
  LinkedInImportData,
  ImportOptions,
} from '@/services/linkedinImportService';
import { useState } from 'react';

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
  const [showDebug, setShowDebug] = useState(false);

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

  const hasNoData = !data.profile && 
    data.experiences.length === 0 && 
    data.education.length === 0 && 
    data.skills.length === 0 && 
    data.articles.length === 0;

  return (
    <div className="space-y-6">
      {/* Debug/Troubleshooting Section */}
      {hasNoData && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No data was found in your export. This could mean the ZIP file structure is different than expected. 
            Click "Show details" below to see which files were detected.
          </AlertDescription>
        </Alert>
      )}

      <Collapsible open={showDebug} onOpenChange={setShowDebug}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
            <span className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              {showDebug ? 'Hide details' : 'Show details'}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showDebug ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-3">
            <div>
              <p className="font-medium text-foreground mb-1">CSV files found ({data.debug?.filesFound?.length || 0}):</p>
              {data.debug?.filesFound?.length > 0 ? (
                <ul className="text-muted-foreground space-y-0.5">
                  {data.debug.filesFound.map((file, i) => (
                    <li key={i} className="font-mono text-xs">{file}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground italic">No CSV files detected</p>
              )}
            </div>
            
            {data.debug?.profileColumns?.length > 0 && (
              <div>
                <p className="font-medium text-foreground mb-1">Profile columns:</p>
                <p className="text-xs text-muted-foreground font-mono">{data.debug.profileColumns.join(', ')}</p>
              </div>
            )}
            
            {data.debug?.positionsColumns?.length > 0 && (
              <div>
                <p className="font-medium text-foreground mb-1">Positions columns:</p>
                <p className="text-xs text-muted-foreground font-mono">{data.debug.positionsColumns.join(', ')}</p>
              </div>
            )}

            {data.debug?.educationColumns?.length > 0 && (
              <div>
                <p className="font-medium text-foreground mb-1">Education columns:</p>
                <p className="text-xs text-muted-foreground font-mono">{data.debug.educationColumns.join(', ')}</p>
              </div>
            )}

            {data.debug?.skillsColumns?.length > 0 && (
              <div>
                <p className="font-medium text-foreground mb-1">Skills columns:</p>
                <p className="text-xs text-muted-foreground font-mono">{data.debug.skillsColumns.join(', ')}</p>
              </div>
            )}

            {data.debug?.sharesColumns?.length > 0 && (
              <div>
                <p className="font-medium text-foreground mb-1">Shares/Posts columns:</p>
                <p className="text-xs text-muted-foreground font-mono">{data.debug.sharesColumns.join(', ')}</p>
              </div>
            )}

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> Make sure you're using the "Get a copy of your data" export from LinkedIn Settings. 
                Select "The larger data archive" for more complete data.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

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
            <div className="text-center py-6 text-muted-foreground">
              <p>No profile data found in the export</p>
              <p className="text-xs mt-1">Expected file: Profile.csv</p>
            </div>
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
              <div className="text-center py-6 text-muted-foreground">
                <p>No work experience found</p>
                <p className="text-xs mt-1">Expected file: Positions.csv</p>
              </div>
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
              <div className="text-center py-6 text-muted-foreground">
                <p>No education found</p>
                <p className="text-xs mt-1">Expected file: Education.csv</p>
              </div>
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
              <div className="text-center py-6 text-muted-foreground w-full">
                <p>No skills found</p>
                <p className="text-xs mt-1">Expected file: Skills.csv</p>
              </div>
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
              <div className="text-center py-6 text-muted-foreground">
                <p>No posts or articles found</p>
                <p className="text-xs mt-1">Expected file: Shares.csv</p>
              </div>
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
