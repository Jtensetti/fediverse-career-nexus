import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BriefcaseBusiness, Building2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PublicFeed from "@/components/federation/PublicFeed";
import { SEOHead } from "@/components/common/SEOHead";
import { Button } from "@/components/ui/button";

export default function Explore() {
  const { i18n } = useTranslation();
  const sv = i18n.language.startsWith("sv");
  return <div className="min-h-screen">
    <SEOHead title={sv ? "Utforska Nolto" : "Explore Nolto"} description={sv ? "Läs offentliga samtal på Nolto. Inget konto behövs för att titta in." : "Read public conversations on Nolto. No account needed to explore."} />
    <Navbar />
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
      <div className="min-w-0">
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{sv ? "EN INBLICK I NOLTO" : "A LOOK INSIDE NOLTO"}</p>
          <h1 className="font-display text-3xl sm:text-4xl">{sv ? "Samtal om arbetslivet." : "Conversations about working life."}</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">{sv ? "Läs i lugn och ro. Gå med när du vill vara med i samtalet." : "Take a look around. Join when you want to be part of the conversation."}</p>
        </div>
        <PublicFeed />
      </div>
      <aside className="space-y-7 lg:sticky lg:top-8 lg:self-start">
        <div className="rounded-2xl bg-primary p-7 text-primary-foreground">
          <h2 className="font-display text-2xl">{sv ? "Det börjar med ett hej." : "It starts with hello."}</h2>
          <p className="mb-6 mt-4 text-sm leading-relaxed opacity-90">{sv ? "Hitta människor att lära av, arbeta med och hålla kontakten med." : "Find people to learn from, work with and stay in touch with."}</p>
          <Button asChild className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/auth/signup" state={{ returnTo: "/feed" }}>{sv ? "Skapa ditt konto" : "Create your account"}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          <Link to="/auth" state={{ returnTo: "/feed" }} className="mt-4 block text-center text-sm underline underline-offset-4">{sv ? "Har du redan ett konto? Logga in" : "Already a member? Sign in"}</Link>
        </div>
        <nav aria-label={sv ? "Upptäck mer" : "Discover more"} className="space-y-1">
          <Link to="/jobs" className="flex items-center gap-3 rounded-lg p-3 text-sm hover:bg-muted"><BriefcaseBusiness className="h-5 w-5 text-primary" />{sv ? "Se lediga jobb" : "Browse jobs"}<ArrowRight className="ml-auto h-4 w-4" /></Link>
          <Link to="/organisationer" className="flex items-center gap-3 rounded-lg p-3 text-sm hover:bg-muted"><Building2 className="h-5 w-5 text-primary" />{sv ? "Lär känna organisationer" : "Meet organisations"}<ArrowRight className="ml-auto h-4 w-4" /></Link>
        </nav>
        <p className="px-3 text-sm leading-relaxed text-muted-foreground">{sv ? "Nolto är ett professionellt nätverk med öppen källkod. Du väljer vad du delar och vem du följer." : "Nolto is an open source professional network. You choose what to share and who to follow."}</p>
      </aside>
    </div>
    <Footer />
  </div>;
}
