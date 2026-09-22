import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { needsMFAVerification } from "@/services/auth/mfaService";
import MFAVerifyDialog from "@/components/auth/MFAVerifyDialog";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { lockInbox, subscribeInbox } from '@/services/messaging/inboxKeysService';

import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  mfaPending: boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const previousUser = useRef<string | null>(null);
  const { t } = useTranslation();
  const location = useLocation();
  const recoveringMfa = location.pathname === "/aterstall-mfa";
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaPending, setMfaPending] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const verifiedUser = useRef<string | null>(null);
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };
  const verifySession = async (nextSession: Session | null, version: number) => {
    try {
      const result = nextSession ? await needsMFAVerification() : { needed: false };
      if (version !== generation.current) return;
      verifiedUser.current = !result.needed ? nextSession?.user.id || null : null;
      setSession(nextSession);
      setFactorId(result.factorId || null);
      setMfaPending(result.needed);
      setError(false);
    } catch {
      if (version !== generation.current) return;
      setMfaPending(true);
      setError(true);
    } finally { if (version === generation.current) setLoading(false); }
  };
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    // Auth callbacks must be synchronous: calling auth APIs while its lock is held can deadlock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const nextUser = nextSession?.user.id || null;
      if (nextUser !== previousUser.current) {
        lockInbox();
        queryClient.clear();
        previousUser.current = nextUser;
      }
      const version = ++generation.current;
      const refresh = event === "TOKEN_REFRESHED" && nextUser !== null && verifiedUser.current === nextUser;
      if (!refresh) { setLoading(true); setMfaPending(!!nextSession); }
      setSession(nextSession);
      clearTimeout(timer);
      timer = setTimeout(() => { void verifySession(nextSession, version); }, 0);
    });
    return () => { generation.current++; clearTimeout(timer); subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    let idle: ReturnType<typeof setTimeout>;
    const unsubscribeInbox = subscribeInbox(() => { queryClient.removeQueries({ queryKey: ['conversation'] }); });
    const resetIdle = () => { clearTimeout(idle); idle = setTimeout(lockInbox, 15 * 60 * 1000); };
    window.addEventListener('pagehide', lockInbox);
    window.addEventListener('pointerdown', resetIdle);
    window.addEventListener('keydown', resetIdle);
    resetIdle();
    return () => { unsubscribeInbox(); clearTimeout(idle); window.removeEventListener('pagehide', lockInbox); window.removeEventListener('pointerdown', resetIdle); window.removeEventListener('keydown', resetIdle); lockInbox(); };
  }, []);
  return <AuthContext.Provider value={{ user: !loading && !mfaPending ? session?.user || null : null, session, loading, mfaPending, signOut }}>
    {children}
    {error && <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background p-6" role="alert">
      <p>{t("auth.sessionVerificationFailed")}</p>
      <button className="underline" onClick={() => { setLoading(true); void verifySession(session, ++generation.current); }}>{t("common.retry")}</button>
      {session && <button className="underline" onClick={() => void signOut()}>{t("auth.signOut")}</button>}
    </div>}

    {factorId && !recoveringMfa && <MFAVerifyDialog open={mfaPending} onOpenChange={open => { if (!open) void signOut(); }} factorId={factorId}
      onSuccess={() => { setLoading(true); void verifySession(session, ++generation.current); }} onCancel={signOut} />}
  </AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
