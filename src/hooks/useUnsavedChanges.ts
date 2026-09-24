import { useCallback, useEffect } from "react";

interface UnsavedChangesOptions {
  dirty: boolean;
  message: string;
}

/**
 * Keeps drafts in React memory and protects reloads plus explicit cancel actions.
 * It intentionally does not persist form contents in browser storage.
 */
export function useUnsavedChanges({ dirty, message }: UnsavedChangesOptions) {
  useEffect(() => {
    if (!dirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  return useCallback((action: () => void) => {
    if (!dirty || window.confirm(message)) action();
  }, [dirty, message]);
}