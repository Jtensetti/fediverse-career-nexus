/**
 * Latest-wins language switching. Resources are loaded before the active language
 * changes; a failed load keeps the previous language, and a slower earlier request
 * can never override a newer selection. Dependency-free so it can be unit tested.
 */
export type SwitchResult = "applied" | "superseded" | "failed";

export interface LanguageSwitcherDeps {
  load: (language: string) => Promise<void>;
  apply: (language: string) => Promise<unknown>;
  persist?: (language: string) => void;
  onError?: (language: string, error: unknown) => void;
}

export function createLanguageSwitcher(deps: LanguageSwitcherDeps) {
  let latest = 0;
  return async function switchLanguage(language: string, persist = true): Promise<SwitchResult> {
    const ticket = ++latest;
    try {
      await deps.load(language);
    } catch (error) {
      if (ticket !== latest) return "superseded";
      deps.onError?.(language, error);
      return "failed";
    }
    if (ticket !== latest) return "superseded";
    if (persist) deps.persist?.(language);
    await deps.apply(language);
    return "applied";
  };
}
