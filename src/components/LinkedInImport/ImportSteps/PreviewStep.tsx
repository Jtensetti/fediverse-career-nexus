import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ArrowLeft, Loader2, AlertCircle, User, Briefcase, GraduationCap, Sparkles, FileText, Check, ChevronDown, Info,
} from 'lucide-react';
import { LinkedInImportData, ImportOptions } from '@/services/content/linkedinImportService';
import { useState } from 'react';

import { tx } from "@/i18n/tx";
interface PreviewStepProps {
  data: LinkedInImportData;
  options: ImportOptions;
  onOptionsChange: (options: ImportOptions) => void;
  onConfirm: () => void;
  onBack: () => void;
  isProcessing: boolean;
  error: string | null;
}

export default function PreviewStep({ data, options, onOptionsChange, onConfirm, onBack, isProcessing, error }: PreviewStepProps) {
  const [showDebug, setShowDebug] = useState(false);

  const toggleOption = (key: keyof ImportOptions) => { onOptionsChange({ ...options, [key]: !options[key] }); };

  const getImportCount = () => {
    let count = 0;
    if (options.includeProfile && data.profile) count++;
    if (options.includeExperiences) count += data.experiences.length;
    if (options.includeEducation) count += data.education.length;
    if (options.includeSkills) count += data.skills.length;
    if (options.includeArticles) count += data.articles.length;
    return count;
  };

  const hasNoData = !data.profile && data.experiences.length === 0 && data.education.length === 0 && data.skills.length === 0 && data.articles.length === 0;

  return (
    <div className="space-y-6">
      {hasNoData && (
        <Alert><Info className="h-4 w-4" /><AlertDescription>
          {tx("ui.previewStep.ingenDataHittadesI")}
        </AlertDescription></Alert>
      )}

      <Collapsible open={showDebug} onOpenChange={setShowDebug}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
            <span className="flex items-center gap-2"><Info className="h-4 w-4" />{showDebug ? tx("ui.previewStep.doljDetaljer") : tx("ui.previewStep.visaDetaljer")}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showDebug ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-3">
            <div>
              <p className="font-medium text-foreground mb-1">{tx("ui.previewStep.csvFilerHittade", { total: data.debug?.filesFound?.length || 0 })}</p>
              {data.debug?.filesFound?.length > 0 ? (
                <ul className="text-muted-foreground space-y-0.5">{data.debug.filesFound.map((file, i) => <li key={i} className="font-mono text-xs">{file}</li>)}</ul>
              ) : <p className="text-muted-foreground italic">{tx("ui.previewStep.ingaCsvFilerHittades")}</p>}
            </div>
            {data.debug?.profileColumns?.length > 0 && <div><p className="font-medium text-foreground mb-1">{tx("ui.previewStep.profilkolumner")}</p><p className="text-xs text-muted-foreground font-mono">{data.debug.profileColumns.join(', ')}</p></div>}
            {data.debug?.positionsColumns?.length > 0 && <div><p className="font-medium text-foreground mb-1">{tx("ui.previewStep.positionskolumner")}</p><p className="text-xs text-muted-foreground font-mono">{data.debug.positionsColumns.join(', ')}</p></div>}
            {data.debug?.educationColumns?.length > 0 && <div><p className="font-medium text-foreground mb-1">{tx("ui.previewStep.utbildningskolumner")}</p><p className="text-xs text-muted-foreground font-mono">{data.debug.educationColumns.join(', ')}</p></div>}
            {data.debug?.skillsColumns?.length > 0 && <div><p className="font-medium text-foreground mb-1">{tx("ui.previewStep.kompetenskolumner")}</p><p className="text-xs text-muted-foreground font-mono">{data.debug.skillsColumns.join(', ')}</p></div>}
            {data.debug?.sharesColumns?.length > 0 && <div><p className="font-medium text-foreground mb-1">{tx("ui.previewStep.inlaggsDelningskolumner")}</p><p className="text-xs text-muted-foreground font-mono">{data.debug.sharesColumns.join(', ')}</p></div>}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground"><strong>{tx("ui.previewStep.tips")}</strong>{' '}{tx("ui.previewStep.seTillAttDu")}</p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto p-1">
          <TabsTrigger value="profile" className="text-xs py-2 px-1 flex flex-col gap-1"><User className="h-4 w-4" /><span className="hidden sm:inline">{tx("ui.previewStep.profil")}</span></TabsTrigger>
          <TabsTrigger value="experience" className="text-xs py-2 px-1 flex flex-col gap-1"><Briefcase className="h-4 w-4" /><span className="hidden sm:inline">{tx("ui.previewStep.arbete")}</span></TabsTrigger>
          <TabsTrigger value="education" className="text-xs py-2 px-1 flex flex-col gap-1"><GraduationCap className="h-4 w-4" /><span className="hidden sm:inline">{tx("ui.previewStep.utbildning")}</span></TabsTrigger>
          <TabsTrigger value="skills" className="text-xs py-2 px-1 flex flex-col gap-1"><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">{tx("ui.previewStep.kompetenser")}</span></TabsTrigger>
          <TabsTrigger value="articles" className="text-xs py-2 px-1 flex flex-col gap-1"><FileText className="h-4 w-4" /><span className="hidden sm:inline">{tx("ui.previewStep.inlagg")}</span></TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Switch id="include-profile" checked={options.includeProfile} onCheckedChange={() => toggleOption('includeProfile')} />
              <Label htmlFor="include-profile" className="font-medium">{tx("ui.previewStep.importeraProfilinfo")}</Label>
            </div>
            {data.profile && <Badge variant="secondary" className="gap-1"><Check className="h-3 w-3" />{tx("ui.previewStep.hittad")}</Badge>}
          </div>
          {data.profile ? (
            <div className="space-y-3 p-4 rounded-lg bg-muted/50">
              <div><p className="text-xs text-muted-foreground">{tx("ui.previewStep.namn")}</p><p className="font-medium">{data.profile.fullname || tx("ui.previewStep.ejAngivet")}</p></div>
              <div><p className="text-xs text-muted-foreground">{tx("ui.previewStep.rubrik")}</p><p className="text-sm">{data.profile.headline || tx("ui.previewStep.ejAngivet")}</p></div>
              <div><p className="text-xs text-muted-foreground">{tx("ui.previewStep.bio")}</p><p className="text-sm text-muted-foreground line-clamp-2">{data.profile.bio || tx("ui.previewStep.ejAngivet")}</p></div>
              <div><p className="text-xs text-muted-foreground">{tx("ui.previewStep.plats")}</p><p className="text-sm">{data.profile.location || tx("ui.previewStep.ejAngivet")}</p></div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground"><p>{tx("ui.previewStep.ingenProfildataHittadesI")}</p><p className="text-xs mt-1">{tx("ui.previewStep.forvantadFilProfileCsv")}</p></div>
          )}
        </TabsContent>

        <TabsContent value="experience" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Switch id="include-experiences" checked={options.includeExperiences} onCheckedChange={() => toggleOption('includeExperiences')} />
              <Label htmlFor="include-experiences" className="font-medium">{tx("ui.previewStep.importeraArbetslivserfarenhet")}</Label>
            </div>
            <Badge variant="secondary">{tx("ui.previewStep.foundTotal", { total: data.experiences.length })}</Badge>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {data.experiences.length > 0 ? data.experiences.map((exp, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium text-sm">{exp.title}</p>
                <p className="text-sm text-muted-foreground">{exp.company}</p>
                <p className="text-xs text-muted-foreground mt-1">{exp.start_date || tx("ui.previewStep.okant")} – {exp.is_current_role ? tx("ui.previewStep.nuvarande") : exp.end_date || tx("ui.previewStep.okant")}</p>
              </div>
            )) : (
              <div className="text-center py-6 text-muted-foreground"><p>{tx("ui.previewStep.ingenArbetslivserfarenhetHittades")}</p><p className="text-xs mt-1">{tx("ui.previewStep.forvantadFilPositionsCsv")}</p></div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="education" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Switch id="include-education" checked={options.includeEducation} onCheckedChange={() => toggleOption('includeEducation')} />
              <Label htmlFor="include-education" className="font-medium">{tx("ui.previewStep.importeraUtbildning")}</Label>
            </div>
            <Badge variant="secondary">{tx("ui.previewStep.foundTotal", { total: data.education.length })}</Badge>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {data.education.length > 0 ? data.education.map((edu, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium text-sm">{edu.institution}</p>
                <p className="text-sm text-muted-foreground">{edu.degree}{edu.field ? ` i ${edu.field}` : ''}</p>
                <p className="text-xs text-muted-foreground mt-1">{edu.start_year || tx("ui.previewStep.okant")} – {edu.end_year || tx("ui.previewStep.nuvarande")}</p>
              </div>
            )) : (
              <div className="text-center py-6 text-muted-foreground"><p>{tx("ui.previewStep.ingenUtbildningHittades")}</p><p className="text-xs mt-1">{tx("ui.previewStep.forvantadFilEducationCsv")}</p></div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="skills" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Switch id="include-skills" checked={options.includeSkills} onCheckedChange={() => toggleOption('includeSkills')} />
              <Label htmlFor="include-skills" className="font-medium">{tx("ui.previewStep.importeraKompetenser")}</Label>
            </div>
            <Badge variant="secondary">{tx("ui.previewStep.foundTotal", { total: data.skills.length })}</Badge>
          </div>
          <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto">
            {data.skills.length > 0 ? data.skills.map((skill, i) => (
              <Badge key={i} variant="outline" className="font-normal">{skill.name}</Badge>
            )) : (
              <div className="text-center py-6 text-muted-foreground w-full"><p>{tx("ui.previewStep.ingaKompetenserHittades")}</p><p className="text-xs mt-1">{tx("ui.previewStep.forvantadFilSkillsCsv")}</p></div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="articles" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Switch id="include-articles" checked={options.includeArticles} onCheckedChange={() => toggleOption('includeArticles')} />
              <Label htmlFor="include-articles" className="font-medium">{tx("ui.previewStep.importeraSomUtkast")}</Label>
            </div>
            <Badge variant="secondary">{tx("ui.previewStep.foundTotal", { total: data.articles.length })}</Badge>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {data.articles.length > 0 ? data.articles.map((article, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium text-sm">{article.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
              </div>
            )) : (
              <div className="text-center py-6 text-muted-foreground"><p>{tx("ui.previewStep.ingaInlaggEllerArtiklar")}</p><p className="text-xs mt-1">{tx("ui.previewStep.forvantadFilSharesCsv")}</p></div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="flex justify-between items-center pt-2">
        <Button variant="ghost" onClick={onBack} disabled={isProcessing}><ArrowLeft className="h-4 w-4 mr-2" />{tx("ui.previewStep.tillbaka")}</Button>
        <Button onClick={onConfirm} disabled={isProcessing || getImportCount() === 0}>
          {isProcessing ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{tx("ui.previewStep.importerar")}</>) : `Importera ${getImportCount()} objekt`}
        </Button>
      </div>
    </div>
  );
}