import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { createUserActor } from "@/services/federation/actorService";
import { formatFederatedHandle } from "@/lib/federation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props { open: boolean; onComplete: () => Promise<void> | void; }
export default function OnboardingFlow({ open, onComplete }: Props) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [federate, setFederate] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState({ username: "", fullname: "", headline: "", bio: "" });

  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    setReady(false);
    setStep(1);
    Promise.all([
      supabase.from("profiles").select("username, fullname, headline, bio").eq("id", user.id).single(),
      supabase.from("public_actors").select("public_key, status").eq("user_id", user.id).eq("is_remote", false).maybeSingle(),
    ]).then(([result, actor]) => {
      if (!active) return;
      if (result.error || actor.error) { setError(t("onboardingFlow.loadError")); return; }
      setProfile({ username: result.data.username || "", fullname: result.data.fullname || "", headline: result.data.headline || "", bio: result.data.bio || "" });
      setLocked(!!actor.data?.public_key);
      setFederate(actor.data ? actor.data.status === "active" : false);
      setReady(true);
    }).catch(() => { if (active) setError(t("onboardingFlow.loadError")); });
    return () => { active = false; };
  }, [open, user?.id, t]);

  const finish = async (enable: boolean) => {
    setBusy(true); setError("");
    try {
      if (!await createUserActor(user!.id, enable)) throw new Error(t("onboardingFlow.federationError"));
      await onComplete();
    } catch (e) { setError(e instanceof Error ? e.message : t("onboardingFlow.saveError")); }
    finally { setBusy(false); }
  };
  const next = async () => {
    if (!user) return;
    if (step === 3) { await finish(federate); return; }
    setBusy(true); setError("");
    try {
      const username = profile.username.trim().toLowerCase();
      if (step === 1 && (!/^[a-z0-9_]{3,30}$/.test(username) || ["admin","administrator","support","security","nolto","root","system","moderator"].includes(username))) {
        throw new Error(t("onboardingFlow.usernameHelp"));
      }
      const changes = step === 1 ? { username } : { fullname: profile.fullname.trim(), headline: profile.headline.trim(), bio: profile.bio.trim() };
      const { error: saveError } = await supabase.from("profiles").update(changes).eq("id", user.id);
      if (saveError) throw new Error(saveError.code === "23505" ? t("auth.usernameTaken") : t("onboardingFlow.saveError"));
      setProfile(p => ({ ...p, username }));
      setStep(s => s + 1);
    } catch (e) { setError(e instanceof Error ? e.message : t("onboardingFlow.saveError")); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(formatFederatedHandle(profile.username)); toast.success(t("onboardingFlow.copied")); }
    catch { toast.error(t("onboardingFlow.copyError")); }
  };

  return <Dialog open={open} onOpenChange={() => {}}>
    <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto" hideCloseButton>
      <DialogHeader>
        <p className="text-sm text-muted-foreground">{t("onboardingFlow.step", { step })}</p>
        <DialogTitle>{t(`onboardingFlow.title${step}`)}</DialogTitle>
        <DialogDescription>{t(`onboardingFlow.description${step}`)}</DialogDescription>
      </DialogHeader>
      <Progress value={step / 3 * 100} aria-label={t("onboardingFlow.progress")} />
      {!ready ? <p role="status">{error || t("common.loading")}</p> : <>
        {step === 1 && <div className="space-y-3">
          <Label htmlFor="onboarding-username">{t("auth.username")}</Label>
          <Input id="onboarding-username" value={profile.username} disabled={locked} maxLength={30} autoCapitalize="none" autoComplete="username" spellCheck={false}
            onChange={e => setProfile(p => ({ ...p, username: e.target.value.toLowerCase() }))} aria-describedby="onboarding-username-help" />
          <p id="onboarding-username-help" className="text-sm text-muted-foreground">{t(locked ? "onboardingFlow.usernameLocked" : "onboardingFlow.usernameHelp")}</p>
          <p className="rounded-lg bg-muted p-4 font-mono text-sm break-all">{formatFederatedHandle(profile.username)}</p>
          <p className="text-sm text-muted-foreground">{t("onboardingFlow.notEmail")}</p>
        </div>}
        {step === 2 && <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="onboarding-name">{t("onboardingFlow.name")}</Label><Input id="onboarding-name" maxLength={100} value={profile.fullname} onChange={e => setProfile(p => ({ ...p, fullname: e.target.value }))} /></div>
          <div className="space-y-2"><Label htmlFor="onboarding-headline">{t("onboardingFlow.headline")}</Label><Input id="onboarding-headline" maxLength={160} value={profile.headline} onChange={e => setProfile(p => ({ ...p, headline: e.target.value }))} /></div>
          <div className="space-y-2"><Label htmlFor="onboarding-bio">{t("onboardingFlow.bio")}</Label><Textarea id="onboarding-bio" maxLength={2000} rows={4} value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} /></div>
          <p className="text-sm text-muted-foreground">{t("onboardingFlow.optionalProfile")}</p>
        </div>}
        {step === 3 && <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4"><p className="font-mono text-sm break-all">{formatFederatedHandle(profile.username)}</p><Button variant="link" onClick={copy}>{t("onboardingFlow.copy")}</Button></div>
          <div className="flex items-start gap-3"><Checkbox id="onboarding-federation" checked={federate} disabled={locked} onCheckedChange={checked => setFederate(checked === true)} /><Label htmlFor="onboarding-federation" className="leading-relaxed">{t("onboardingFlow.share")}</Label></div>
          <p className="text-sm text-muted-foreground">{t("onboardingFlow.limits")}</p>
          <Link className="text-sm underline" to="/federation" target="_blank" rel="noopener noreferrer">{t("onboardingFlow.learnMore")}</Link>
        </div>}
      </>}
      {ready && error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-between gap-3 pt-2">
        {step > 1 ? <Button variant="ghost" disabled={busy} onClick={() => setStep(s => s - 1)}><ArrowLeft className="h-4 w-4 mr-2" />{t("onboardingFlow.back")}</Button> : <Button variant="ghost" disabled={busy} onClick={() => finish(false)}>{t("onboardingFlow.later")}</Button>}
        <Button disabled={busy || !ready} onClick={next}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t(step === 3 ? "onboardingFlow.finish" : "onboardingFlow.next")}<ArrowRight className="h-4 w-4 ml-2" /></>}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
