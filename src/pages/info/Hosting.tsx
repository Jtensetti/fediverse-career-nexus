import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Code2, Server } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { SEOHead } from "@/components/common/SEOHead";
import { Button } from "@/components/ui/button";

const repository = "https://github.com/Jtensetti/fediverse-career-nexus";

export default function Hosting() {
  const { i18n } = useTranslation();
  const sv = i18n.language.startsWith("sv");
  return <div className="min-h-screen">
    <SEOHead title={sv ? "Egen drift" : "Self-hosting"} description={sv ? "Källkod och installationsunderlag för att driva Nolto själv." : "Source code and deployment instructions for running Nolto yourself."} />
    <Navbar />
    <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="mb-5 text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">{sv ? "ÖPPEN KÄLLKOD" : "OPEN SOURCE"}</p>
      <h1 className="max-w-3xl font-display text-4xl tracking-tight sm:text-6xl">{sv ? "Ett nätverk att bygga vidare på." : "A network to build upon."}</h1>
      <p className="mb-12 mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">{sv ? "Noltos kod är öppen. Du kan granska den, bidra och anpassa den till ett eget sammanhang." : "Nolto’s code is open. You can review it, contribute and adapt it to your own community."}</p>
      <div className="grid gap-8 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-8">
          <Server className="mb-5 h-7 w-7 text-primary" aria-hidden="true" />
          <h2 className="text-2xl">{sv ? "Kör webbappen med Docker" : "Run the web app with Docker"}</h2>
          <p className="my-5 leading-relaxed text-muted-foreground">{sv ? "Bygg webbappen och servera den med den medföljande Docker-konfigurationen. Du ansluter den till en redan konfigurerad backend." : "Build and serve the web app with the included Docker configuration. Connect it to an already configured backend."}</p>
          <Button asChild variant="outline"><a href={`${repository}/blob/main/docs/self-hosting.md`}>{sv ? "Läs installationsguiden" : "Read the installation guide"}<ArrowRight className="ml-2 h-4 w-4" /></a></Button>
        </section>
        <section className="rounded-2xl border bg-card p-8">
          <Code2 className="mb-5 h-7 w-7 text-primary" aria-hidden="true" />
          <h2 className="text-2xl">{sv ? "Bidra till Nolto" : "Contribute to Nolto"}</h2>
          <p className="my-5 leading-relaxed text-muted-foreground">{sv ? "Förbättra en översättning, rapportera ett fel eller arbeta vidare med en funktion. Källkoden och utvecklingsguiden finns på GitHub." : "Improve a translation, report a bug or work on a feature. The source code and development guide are on GitHub."}</p>
          <Button asChild variant="outline"><a href={repository}>{sv ? "Öppna källkoden" : "View the source"}<ArrowRight className="ml-2 h-4 w-4" /></a></Button>
        </section>
      </div>
      <section className="mt-8 rounded-2xl border bg-card p-8">
        <Code2 className="mb-5 h-7 w-7 text-primary" aria-hidden="true" />
        <h2 className="text-2xl">{sv ? 'Lägg till en Nolto-knapp' : 'Add a Nolto button'}</h2>
        <p className="my-5 max-w-2xl leading-relaxed text-muted-foreground">{sv ? 'Låt kandidater fylla ert ansökningsformulär med sin Nolto-profil. De väljer själva vilka uppgifter som delas. Kopiera några rader kod för att komma igång.' : 'Let candidates fill your application form from their Nolto profile. They choose which details to share. Copy a few lines of code to get started.'}</p>
        <Button asChild variant="outline"><Link to="/integrations">{sv ? 'Hämta knapp och instruktioner' : 'Get the button and instructions'}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </section>
      <section className="my-12 max-w-3xl border-l-4 border-secondary pl-6">
        <h2 className="text-xl">{sv ? "Vad behövs för en egen server?" : "What does your own server need?"}</h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">{sv ? "Docker-paketet innehåller webbappen och dess proxy. Databas, inloggning, lagring, e-post och bakgrundsjobb behöver sättas upp separat. En komplett nyinstallation av hela Nolto är ännu inte verifierad. Guiden beskriver vad som återstår." : "The Docker package contains the web app and its proxy. Database, authentication, storage, email and background jobs need separate setup. A complete fresh installation of Nolto has not yet been verified. The guide explains the remaining steps."}</p>
      </section>
      <Link to="/feed" className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4">{sv ? "Vill du bara titta in? Utforska Nolto" : "Just curious? Explore Nolto"}<ArrowRight className="h-4 w-4" /></Link>
    </div>
    <Footer />
  </div>;
}
