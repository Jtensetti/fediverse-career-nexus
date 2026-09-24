import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BriefcaseBusiness, Building2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PublicFeed from "@/components/federation/PublicFeed";
import { SEOHead } from "@/components/common/SEOHead";
import { Button } from "@/components/ui/button";

export default function Explore() {
  const { t } = useTranslation();
  return <div className="min-h-screen">
    <SEOHead title={t("ui.explore.exploreNolto")} description={t("ui.explore.readPublicConversationsOn")} />
    <Navbar />
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
      <div className="min-w-0">
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("ui.explore.aLookInsideNolto")}</p>
          <h1 className="font-display text-3xl sm:text-4xl">{t("ui.explore.conversationsAboutWorkingLife")}</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">{t("ui.explore.takeALookAround")}</p>
        </div>
        <PublicFeed />
      </div>
      <aside className="space-y-7 lg:sticky lg:top-8 lg:self-start">
        <div className="rounded-2xl bg-primary p-7 text-primary-foreground">
          <h2 className="font-display text-2xl">{t("ui.explore.itStartsWithHello")}</h2>
          <p className="mb-6 mt-4 text-sm leading-relaxed opacity-90">{t("ui.explore.findPeopleToLearn")}</p>
          <Button asChild className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/auth/signup" state={{ returnTo: "/feed" }}>{t("ui.explore.createYourAccount")}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          <Link to="/auth" state={{ returnTo: "/feed" }} className="mt-4 block text-center text-sm underline underline-offset-4">{t("ui.explore.alreadyAMemberSign")}</Link>
        </div>
        <nav aria-label={t("ui.explore.discoverMore")} className="space-y-1">
          <Link to="/jobs" className="flex items-center gap-3 rounded-lg p-3 text-sm hover:bg-muted"><BriefcaseBusiness className="h-5 w-5 text-primary" />{t("ui.explore.browseJobs")}<ArrowRight className="ml-auto h-4 w-4" /></Link>
          <Link to="/organisationer" className="flex items-center gap-3 rounded-lg p-3 text-sm hover:bg-muted"><Building2 className="h-5 w-5 text-primary" />{t("ui.explore.meetOrganisations")}<ArrowRight className="ml-auto h-4 w-4" /></Link>
        </nav>
        <p className="px-3 text-sm leading-relaxed text-muted-foreground">{t("ui.explore.noltoIsAnOpen")}</p>
      </aside>
    </div>
    <Footer />
  </div>;
}
