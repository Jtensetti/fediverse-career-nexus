import { Globe2, MessageCircle, Briefcase, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
interface Props { variant?: "feed" | "profile" | "jobs" | "messages"; className?: string; }
/** A feature illustration, with no fabricated profiles, jobs, messages or activity counts. */
export default function AppScreenshot({ variant = "feed", className = "" }: Props) {
  const { i18n } = useTranslation();
  const sv = i18n.language.startsWith("sv");
  const content = {
    feed: [Globe2, sv ? "Ditt nätverk börjar här" : "Your network starts here", sv ? "Följ människor, dela kunskap och upptäck samtal i fediversum." : "Follow people, share knowledge and discover conversations across the fediverse."],
    profile: [UserRound, sv ? "Din erfarenhet, på din profil" : "Your experience, on your profile", sv ? "Samla det du kan, det du gjort och det du vill göra härnäst." : "Share your skills, your experience and what you want to do next."],
    jobs: [Briefcase, sv ? "Plats för nästa steg" : "Room for your next step", sv ? "Utforska publicerade möjligheter eller berätta vad du söker." : "Explore published opportunities or share what you are looking for."],
    messages: [MessageCircle, sv ? "Fortsätt samtalet" : "Keep the conversation going", sv ? "Ta kontakt med andra medlemmar i Nolto." : "Connect with other Nolto members."],
  } as const;
  const [Icon, title, description] = content[variant];
  return <div className={`rounded-2xl border bg-card p-8 sm:p-12 shadow-xl ${className}`}>
    <Icon className="h-12 w-12 text-primary mb-8" aria-hidden="true" />
    <p className="text-sm text-muted-foreground mb-2">Nolto.social</p>
    <h3 className="text-2xl font-semibold mb-4">{title}</h3>
    <p className="text-muted-foreground leading-relaxed">{description}</p>
  </div>;
}
