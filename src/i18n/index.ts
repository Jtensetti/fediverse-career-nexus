import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { toast } from "sonner";
import { createLanguageSwitcher, type SwitchResult } from "./switcher";

// Only the active language (plus the English fallback) is fetched; each locale is its own lazy chunk.
const loaders = import.meta.glob<{ default: Record<string, unknown> }>("./locales/*.json");
const SUPPORTED = ["sv", "en", "fr", "de", "nl", "es", "ja", "it"];
export const LANGUAGE_STORAGE_KEY = "nolto.language";

function pick(value?: string | null) {
  const base = value?.toLowerCase().split(/[-_]/)[0];
  return base && SUPPORTED.includes(base) ? base : null;
}

function readStored() {
  try { return pick(localStorage.getItem(LANGUAGE_STORAGE_KEY)); } catch { return null; }
}

/** Explicit preference first, then the first supported browser language; Swedish otherwise. */
export function detectInitialLanguage() {
  const stored = readStored();
  if (stored) return stored;
  const browser = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const candidate of browser) { const match = pick(candidate); if (match) return match; }
  return "sv";
}

async function ensureResources(language: string) {
  if (i18n.hasResourceBundle(language, "translation")) return;
  const loader = loaders[`./locales/${language}.json`];
  if (!loader) return;
  const module = await loader();
  i18n.addResourceBundle(language, "translation", module.default, true, true);
}

function syncDocument(language: string) {
  if (typeof document !== "undefined") document.documentElement.lang = language;
}

const switchLanguage = createLanguageSwitcher({
  load: async language => { await Promise.all([ensureResources(language), language === "en" ? null : ensureResources("en")]); },
  apply: language => i18n.changeLanguage(language),
  persist: language => { try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); } catch { /* storage unavailable */ } },
  // Shown in the still-active previous language; the selection is not changed.
  onError: (language, error) => {
    console.error(`Failed to load language resources for ${language}`, error);
    if (i18n.isInitialized) toast.error(i18n.t("language.loadFailed"));
  },
});

/** Switch language in place (no remount). Returns "failed" and keeps the current language if loading fails. */
export function changeLanguage(language: string, persist = true): Promise<SwitchResult> {
  return switchLanguage(pick(language) ?? "sv", persist);
}

i18n.on("languageChanged", syncDocument);

export async function initI18n() {
  const initial = detectInitialLanguage();
  await i18n.use(initReactI18next).init({
    resources: {},
    lng: initial,
    fallbackLng: "en",
    supportedLngs: SUPPORTED,
    partialBundledLanguages: true,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  const result = await changeLanguage(initial, false);
  // A missing locale chunk at startup falls back to Swedish rather than blank keys.
  if (result === "failed" && initial !== "sv") await changeLanguage("sv", false);
  syncDocument(i18n.language);
}

export default i18n;
