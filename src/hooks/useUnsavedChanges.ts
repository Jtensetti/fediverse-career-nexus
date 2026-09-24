import { useCallback, useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";

interface UnsavedChangesOptions {
  dirty: boolean;
  message: string;
}

/**
 * Keeps drafts in React memory and protects reloads plus explicit cancel actions.
 * It intentionally does not persist form contents in browser storage.
 */
export function useUnsavedChanges({ dirty, message }: UnsavedChangesOptions) {
  const explicitNavigationApproved = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !explicitNavigationApproved.current && dirty &&
    (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search)
  );

  useEffect(() => {
    if (!dirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm(message)) blocker.proceed();
    else blocker.reset();
  }, [blocker, message]);

  return useCallback((action: () => void) => {
    if (!dirty || window.confirm(message)) {
      explicitNavigationApproved.current = true;
      action();
    }
  }, [dirty, message]);
}
