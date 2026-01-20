import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  User,
  Briefcase,
  GraduationCap,
  Star,
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
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="profile" className="text-xs">
            <User className="h-3 w-3 mr-1" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="experience" className="text-xs">
            <Briefcase className="h-3 w-3 mr-1" />
            Work
          </TabsTrigger>
          <TabsTrigger value="education" className="text-xs">
            <GraduationCap className="h-3 w-3 mr-1" />
            Edu
          </TabsTrigger>
          <TabsTrigger value="skills" className="text-xs">
            <Star className="h-3 w-3 mr-1" />
            Skills
          </TabsTrigger>
          <TabsTrigger value="articles" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Posts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="include-profile"
                checked={options.includeProfile}
                onCheckedChange={() => toggleOption('includeProfile')}
              />
              <Label htmlFor="include-profile">Import profile info</Label>
            </div>
            {data.profile && (
              <Badge variant="secondary">
                <Check className="h-3 w-3 mr-1" />
                Found
              </Badge>
            )}
          </div>

          {data.profile ? (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="font-medium">{data.profile.fullname || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Headline</Label>
                  <p>{data.profile.headline || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Bio</Label>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {data.profile.bio || 'Not provided'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Location</Label>
                  <p>{data.profile.location || 'Not provided'}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No profile data found in the export
            </p>
          )}
        </TabsContent>

        <TabsContent value="experience" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="include-experiences"
                checked={options.includeExperiences}
                onCheckedChange={() => toggleOption('includeExperiences')}
              />
              <Label htmlFor="include-experiences">Import work experience</Label>
            </div>
            <Badge variant="secondary">{data.experiences.length} found</Badge>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {data.experiences.length > 0 ? (
              data.experiences.map((exp, i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <p className="font-medium">{exp.title}</p>
                    <p className="text-sm text-muted-foreground">{exp.company}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {exp.start_date || 'Unknown'} - {exp.is_current_role ? 'Present' : exp.end_date || 'Unknown'}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No work experience found in the export
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="education" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="include-education"
                checked={options.includeEducation}
                onCheckedChange={() => toggleOption('includeEducation')}
              />
              <Label htmlFor="include-education">Import education</Label>
            </div>
            <Badge variant="secondary">{data.education.length} found</Badge>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {data.education.length > 0 ? (
              data.education.map((edu, i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <p className="font-medium">{edu.institution}</p>
                    <p className="text-sm text-muted-foreground">
                      {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {edu.start_year || 'Unknown'} - {edu.end_year || 'Present'}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No education found in the export
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="skills" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="include-skills"
                checked={options.includeSkills}
                onCheckedChange={() => toggleOption('includeSkills')}
              />
              <Label htmlFor="include-skills">Import skills</Label>
            </div>
            <Badge variant="secondary">{data.skills.length} found</Badge>
          </div>

          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {data.skills.length > 0 ? (
              data.skills.map((skill, i) => (
                <Badge key={i} variant="outline">
                  {skill.name}
                </Badge>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4 w-full">
                No skills found in the export
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="articles" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="include-articles"
                checked={options.includeArticles}
                onCheckedChange={() => toggleOption('includeArticles')}
              />
              <Label htmlFor="include-articles">Import articles (as drafts)</Label>
            </div>
            <Badge variant="secondary">{data.articles.length} found</Badge>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {data.articles.length > 0 ? (
              data.articles.map((article, i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <p className="font-medium">{article.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {article.excerpt}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No articles found in the export
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

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack} disabled={isProcessing}>
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
