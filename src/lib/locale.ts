import { sv, enGB, fr, de, nl, es, ja, it, type Locale } from "date-fns/locale";
import i18n from "@/i18n";

export const SUPPORTED_LANGUAGES = ["sv", "en", "fr", "de", "nl", "es", "ja", "it"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Language self-names shown in the selector. */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  sv: "Svenska", en: "English", fr: "Français", de: "Deutsch", nl: "Nederlands", es: "Español", ja: "日本語", it: "Italiano",
};

const DATE_LOCALES: Record<SupportedLanguage, Locale> = { sv, en: enGB, fr, de, nl, es, ja, it };
const INTL_LOCALES: Record<SupportedLanguage, string> = {
  sv: "sv-SE", en: "en-GB", fr: "fr-FR", de: "de-DE", nl: "nl-NL", es: "es-ES", ja: "ja-JP", it: "it-IT",
};

export function normalizeLanguage(value?: string | null): SupportedLanguage | null {
  const base = value?.toLowerCase().split(/[-_]/)[0];
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base ?? "") ? (base as SupportedLanguage) : null;
}

export const currentLanguage = (language = i18n.language): SupportedLanguage => normalizeLanguage(language) ?? "sv";
/** date-fns locale for the active (or given) language. */
export const dateLocale = (language?: string): Locale => DATE_LOCALES[currentLanguage(language)];
/** BCP 47 tag for Intl / toLocale* APIs. */
export const intlLocale = (language?: string): string => INTL_LOCALES[currentLanguage(language)];
