import { createContext, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useBlocker, type BlockerFunction } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Entry = { dirty: boolean; message: string; ignoreQueryChanges?: boolean };
type Registry = {
  register: (id: symbol, read: () => Entry) => () => void;
  run: (action: () => void) => void;
  hasChanges: () => boolean;
};
export const UnsavedChangesContext = createContext<Registry | null>(null);

/** One router blocker for all mounted editors. Draft contents never leave React memory. */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const entries = useRef(new Map<symbol, () => Entry>());
  const bypass = useRef(false);
  const previousFocus = useRef<HTMLElement | null>(null);
  const dirtyEntry = useCallback(() => [...entries.current.values()].map(read => read()).find(entry => entry.dirty), []);
  const blocker = useBlocker(useCallback<BlockerFunction>(({ currentLocation, nextLocation }) => {
    const blocked = !bypass.current && [...entries.current.values()].some(read => {
      const entry = read();
      return entry.dirty && (!entry.ignoreQueryChanges || currentLocation.pathname !== nextLocation.pathname);
    });
    if (blocked) previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return blocked;
  }, []));
  const registry = useRef<Registry>({
    hasChanges: () => !!dirtyEntry(),
    register(id, read) {
      entries.current.set(id, read);
      return () => { entries.current.delete(id); };
    },
    run(action) {
      bypass.current = true;
      try { action(); } finally { bypass.current = false; }
    },
  });

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyEntry()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyEntry]);

  return <UnsavedChangesContext.Provider value={registry.current}>
    {children}
    <AlertDialog open={blocker.state === "blocked"} onOpenChange={open => { if (!open && blocker.state === "blocked") blocker.reset(); }}>
      <AlertDialogContent onCloseAutoFocus={event => {
        event.preventDefault();
        if (previousFocus.current?.isConnected) previousFocus.current.focus();
      }}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("ux.leaveTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("ux.leaveDescription")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("ux.keepEditing")}</AlertDialogCancel>
          <AlertDialogAction onClick={event => { event.preventDefault(); previousFocus.current = null; if (blocker.state === "blocked") blocker.proceed(); }}>{t("ux.discardAndLeave")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </UnsavedChangesContext.Provider>;
}
