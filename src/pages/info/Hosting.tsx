import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Code2, Server } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { SEOHead } from "@/components/common/SEOHead";
import { Button } from "@/components/ui/button";

const repository = "https://github.com/Jtensetti/fediverse-career-nexus";

export default function Hosting() {
  const { t } = useTranslation();
  return <div className="min-h-screen">
    <SEOHead title={t("ui.hosting.selfhosting")} description={t("ui.hosting.sourceCodeAndDeployment")} />
    <Navbar />
    <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="mb-5 text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">{t("ui.hosting.openSource")}</p>
      <h1 className="max-w-3xl font-display text-4xl tracking-tight sm:text-6xl">{t("ui.hosting.aNetworkToBuild")}</h1>
      <p className="mb-12 mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t("ui.hosting.noltosCodeIsOpen")}</p>
      <div className="grid gap-8 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-8">
          <Server className="mb-5 h-7 w-7 text-primary" aria-hidden="true" />
          <h2 className="text-2xl">{t("ui.hosting.runTheWebApp")}</h2>
          <p className="my-5 leading-relaxed text-muted-foreground">{t("ui.hosting.buildAndServeThe")}</p>
          <Button asChild variant="outline"><a href={`${repository}/blob/main/docs/self-hosting.md`}>{t("ui.hosting.readTheInstallationGuide")}<ArrowRight className="ml-2 h-4 w-4" /></a></Button>
        </section>
        <section className="rounded-2xl border bg-card p-8">
          <Code2 className="mb-5 h-7 w-7 text-primary" aria-hidden="true" />
          <h2 className="text-2xl">{t("ui.hosting.contributeToNolto")}</h2>
          <p className="my-5 leading-relaxed text-muted-foreground">{t("ui.hosting.improveATranslationReport")}</p>
          <Button asChild variant="outline"><a href={repository}>{t("ui.hosting.viewTheSource")}<ArrowRight className="ml-2 h-4 w-4" /></a></Button>
        </section>
      </div>
      <section className="mt-8 rounded-2xl border bg-card p-8">
        <Code2 className="mb-5 h-7 w-7 text-primary" aria-hidden="true" />
        <h2 className="text-2xl">{t("ui.hosting.addANoltoButton")}</h2>
        <p className="my-5 max-w-2xl leading-relaxed text-muted-foreground">{t("ui.hosting.letCandidatesFillYour")}</p>
        <Button asChild variant="outline"><Link to="/integrations">{t("ui.hosting.getTheButtonAnd")}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </section>
      <section className="my-12 max-w-3xl border-l-4 border-secondary pl-6">
        <h2 className="text-xl">{t("ui.hosting.whatDoesYourOwn")}</h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">{t("ui.hosting.theDockerPackageContains")}</p>
      </section>
      <Link to="/feed" className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4">{t("ui.hosting.justCuriousExploreNolto")}<ArrowRight className="h-4 w-4" /></Link>
    </div>
    <Footer />
  </div>;
}
