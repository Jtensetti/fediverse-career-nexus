import i18n from "@/i18n";

/**
 * Translate outside hook scope (toasts, validation messages, event handlers).
 * Values are resolved when called: call tx() inside render or handlers, never at module
 * scope. The root subscribes via useTranslation and re-renders (without remounting) on
 * language change; memoized components must subscribe themselves with useTranslation().
 */
export const tx = (key: string, options?: Record<string, unknown>): string => i18n.t(key, options) as string;
