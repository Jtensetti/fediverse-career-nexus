import { useCallback, useContext, useEffect, useRef } from "react";
import { UnsavedChangesContext } from "@/contexts/UnsavedChangesContext";

interface UnsavedChangesOptions {
  dirty: boolean;
  ignoreQueryChanges?: boolean;
  message: string;
}

type DiscardGuard = ((action: () => void) => void) & { afterSave: (action: () => void) => void };

/** Protects route changes, reloads and explicit closes without storing draft contents. */
export function useUnsavedChanges({ dirty, message, ignoreQueryChanges }: UnsavedChangesOptions): DiscardGuard {
  const registry = useContext(UnsavedChangesContext);
  const current = useRef({ dirty, message, ignoreQueryChanges });
  current.current = { dirty, message, ignoreQueryChanges };
  useEffect(() => {
    if (registry) return registry.register(Symbol("editor"), () => current.current);
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!current.current.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [registry]);
  const run = useCallback((action: () => void) => {
    if (registry) registry.run(action);
    else action();
  }, [registry]);
  const guard = useCallback((action: () => void) => {
    if (!current.current.dirty || window.confirm(current.current.message)) run(action);
  }, [run]) as DiscardGuard;
  // Bypass only this synchronous, server-confirmed completion action, never later edits.
  guard.afterSave = run;
  return guard;
}
