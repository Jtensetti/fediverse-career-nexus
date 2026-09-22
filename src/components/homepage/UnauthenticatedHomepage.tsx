import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BriefcaseBusiness, Network, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthenticatedHomepage() {
  const { i18n } = useTranslation();
  const sv = i18n.language.startsWith("sv");
  const features = sv ? [
    { icon: UserRound, title: "En profil för ditt arbetsliv", text: "Samla erfarenhet, kompetenser och projekt. Du väljer vad du vill dela.", href: "/auth/signup", link: "Skapa din profil" },
    { icon: BriefcaseBusiness, title: "Jobb och organisationer", text: "Läs jobbannonser och lär känna organisationerna bakom dem.", href: "/jobs", link: "Se lediga jobb" },
    { icon: Network, title: "Kontakter över servergränser", text: "Aktivera federation för att göra din Nolto-profil sökbar och följa konton på andra ActivityPub-servrar.", href: "/federation", link: "Läs om federation" },
  ] : [
    { icon: UserRound, title: "A profile for your working life", text: "Bring together your experience, skills and projects. Choose what to share.", href: "/auth/signup", link: "Create your profile" },
    { icon: BriefcaseBusiness, title: "Jobs and organisations", text: "Browse job listings and get to know the organisations behind them.", href: "/jobs", link: "Browse jobs" },
    { icon: Network, title: "Connect across servers", text: "Enable federation to make your Nolto profile discoverable and follow accounts on other ActivityPub servers.", href: "/federation", link: "Read about federation" },
  ];
  return <div>
    <section className="border-b bg-muted/30">
      <div className="container mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-[1.4fr_1fr] md:py-28 items-center">
        <div className="space-y-6">
          <p className="text-sm font-semibold tracking-wide text-primary">NOLTO · {sv ? "DITT PROFESSIONELLA NÄTVERK" : "YOUR PROFESSIONAL NETWORK"}</p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{sv ? "Arbetslivet bygger på människor." : "Working life is built on people."}</h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">{sv ? "Dela det du kan, hitta nästa möjlighet och håll kontakten. Nolto är ett professionellt nätverk med öppen källkod och stöd för ActivityPub." : "Share what you know, find your next opportunity and stay in touch. Nolto is an open source professional network with ActivityPub support."}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/auth/signup">{sv ? "Skapa konto" : "Create account"}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild variant="outline" size="lg"><Link to="/auth">{sv ? "Logga in" : "Sign in"}</Link></Button>
          </div>
        </div>
        <div className="rounded-2xl border bg-background p-7 sm:p-9 space-y-5">
          <p className="text-sm font-medium text-muted-foreground">{sv ? "Din adress i fediversum" : "Your address in the fediverse"}</p>
          <p className="break-all font-mono text-xl sm:text-2xl text-primary">{sv ? "dittnamn" : "yourname"}@nolto.social</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{sv ? "Välj ett ledigt användarnamn när du registrerar dig. När du aktiverar federation kan andra söka efter dig med den här typen av adress, till exempel från Mastodon. Adressen är en social identitet, inte en e-postadress." : "Choose an available username when you register. After you enable federation, others can look you up with an address like this, including from Mastodon. This is a social identity, not an email address."}</p>
          <Link to="/federation" className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4">{sv ? "Så hänger Nolto och Mastodon ihop" : "How Nolto connects with Mastodon"}<ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
    <section aria-label={sv ? "Det här kan du göra" : "What you can do"} className="container mx-auto max-w-6xl grid gap-10 px-6 py-16 md:grid-cols-3">
      {features.map(feature => <article key={feature.href} className="space-y-4">
        <feature.icon className="h-6 w-6 text-primary" aria-hidden="true" />
        <h2 className="text-xl font-semibold">{feature.title}</h2>
        <p className="text-muted-foreground leading-relaxed">{feature.text}</p>
        <Link to={feature.href} className="inline-block text-sm font-medium underline underline-offset-4">{feature.link}</Link>
      </article>)}
    </section>
    <section className="border-t bg-muted/20">
      <div className="container mx-auto max-w-6xl px-6 py-12 space-y-4">
        <h2 className="text-xl font-semibold">{sv ? "Har du redan ett Mastodon-konto?" : "Already have a Mastodon account?"}</h2>
        <p className="max-w-2xl text-muted-foreground leading-relaxed">{sv ? "Du kan använda Mastodon för att logga in eller koppla det till ditt Nolto-konto. Kontona har varsin profil. Historik och privata meddelanden synkroniseras inte automatiskt." : "Use Mastodon to sign in or link it to your Nolto account. Each account has its own profile. History and private messages are not automatically synchronised."}</p>
        <Link to="/auth" className="inline-block text-sm font-medium underline underline-offset-4">{sv ? "Logga in med Mastodon" : "Sign in with Mastodon"}</Link>
      </div>
    </section>
  </div>;
}
