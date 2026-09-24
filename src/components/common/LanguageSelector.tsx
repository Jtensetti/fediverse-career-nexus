import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeLanguage } from "@/i18n";
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, currentLanguage } from "@/lib/locale";
import { cn } from "@/lib/utils";

/** Accessible language picker; options use each language's own name and lang attribute. */
export default function LanguageSelector({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const value = currentLanguage(i18n.language);
  return (
    <Select value={value} onValueChange={language => { void changeLanguage(language); }}>
      <SelectTrigger aria-label={t("language.label")} className={cn("h-9 gap-2", compact ? "w-auto px-2" : "w-[10.5rem]", className)}>
        <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
        {compact ? <span lang={value} className="text-sm uppercase">{value}</span> : <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LANGUAGES.map(language => (
          <SelectItem key={language} value={language} lang={language}>{LANGUAGE_NAMES[language]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
