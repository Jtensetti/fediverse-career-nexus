import i18n from "@/i18n";

/**
 * Translate outside hook scope (extracted UI copy, toasts, validation messages).
 * The app root remounts when the language changes, so rendered values stay in sync.
 */
export const tx = (key: string, options?: Record<string, unknown>): string => i18n.t(key, options) as string;
