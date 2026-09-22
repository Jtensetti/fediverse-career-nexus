import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowUpRight, Code2, Globe2, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicArtwork from "@/components/layout/PublicArtwork";
import "./homepage.css";

export default function UnauthenticatedHomepage() {
  const { i18n } = useTranslation();
  const sv = i18n.language.startsWith("sv");
  return <div className="nolto-home">
    <section className="home-hero">
      <div className="home-container home-hero-copy">
        <div className="home-intro">
          <p className="home-eyebrow">{sv ? "DITT PROFESSIONELLA NÄTVERK" : "YOUR PROFESSIONAL NETWORK"}</p>
          <h1>{sv ? <>Ett öppnare <span>arbetsliv.</span></> : <>A more open <span>working life.</span></>}</h1>
          <p className="home-lead">{sv ? "Möt människor, dela det du kan och hitta din nästa möjlighet. Ett nätverk som du är med och formar." : "Meet people, share what you know and find your next opportunity. A network you help shape."}</p>
          <div className="home-actions">
            <Button asChild size="lg" className="home-join"><Link to="/auth/signup">{sv ? "Gå med i Nolto" : "Join Nolto"}<ArrowUpRight className="ml-2 h-5 w-5" aria-hidden="true" /></Link></Button>
            <Link to="/feed" className="home-explore">{sv ? "Utforska flödet" : "Explore the feed"}<ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
          </div>
          <p className="home-footnote">{sv ? "Titta in. Du behöver inget konto för att läsa." : "Take a look. You don’t need an account to read."}</p>
        </div>
      </div>
      <PublicArtwork placement="header" />
    </section>

    <div className="home-values home-container" aria-label={sv ? "Det Nolto står för" : "What Nolto stands for"}>
      <span><HeartHandshake aria-hidden="true" />{sv ? "Människor i centrum" : "People come first"}</span>
      <span><Globe2 aria-hidden="true" />{sv ? "En del av den öppna webben" : "Part of the open web"}</span>
      <span><Code2 aria-hidden="true" />{sv ? "Öppen källkod" : "Open source"}</span>
    </div>

    <section className="home-container home-feature home-feature--feed">
      <div className="home-feature-copy">
        <p className="home-eyebrow">{sv ? "SAMTAL OCH NYA PERSPEKTIV" : "CONVERSATIONS AND NEW PERSPECTIVES"}</p>
        <h2>{sv ? "Börja med att titta in." : "Start by taking a look."}</h2>
        <p>{sv ? "Läs det som delas på Nolto och i det öppna nätverket. När du vill svara eller dela något själv skapar du ett konto." : "Read what people share on Nolto and across the open network. Create an account when you want to reply or share something yourself."}</p>
        <Link to="/feed" className="home-text-link">{sv ? "Utforska flödet" : "Explore the feed"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
      <div className="home-product">
        <div className="home-product-label"><span>Nolto</span><span>{sv ? "En plats för nya perspektiv" : "A place for fresh perspectives"}</span></div>
        <Link to="/feed" className="home-product-preview">
          <img
            src="/screenshots/feed.jpg"
            width="756"
            height="696"
            alt={sv ? "Noltos offentliga flöde med val mellan På Nolto och Hela nätverket. Öppna flödet." : "Nolto’s public feed, with local and network views. Open the feed."}
            loading="lazy"
            decoding="async"
          />
        </Link>
      </div>
    </section>

    <section className="home-container home-feature">
      <div className="home-feature-copy">
        <p className="home-eyebrow">{sv ? "MÄNNISKOR OCH MÖJLIGHETER" : "PEOPLE AND POSSIBILITIES"}</p>
        <h2>{sv ? "Nästa steg börjar med nyfikenhet." : "Your next step starts with curiosity."}</h2>
        <p>{sv ? "Hitta jobb och lär känna organisationerna bakom dem. Söker du ett nytt sammanhang, ett samarbete eller någon att utbyta idéer med? Börja här." : "Find jobs and get to know the organisations behind them. Looking for a new role, a collaboration or someone to exchange ideas with? Start here."}</p>
        <Link to="/jobs" className="home-text-link">{sv ? "Se lediga jobb" : "Browse jobs"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        <Link to="/organisationer" className="home-text-link">{sv ? "Upptäck organisationer" : "Discover organisations"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
      <div className="home-feature-visual">
        <img
          src="/screenshots/jobs.jpg"
          width="1328"
          height="699"
          alt={sv ? "Noltos jobbsökning med filter för jobbtyp, plats och distansarbete." : "Nolto’s job search with filters for job type, location and remote work."}
          loading="lazy"
          decoding="async"
        />
      </div>
    </section>

    <section className="home-network">
      <div className="home-container home-feature">
        <div className="home-address-visual" aria-hidden="true">
          <span className="home-address-caption">{sv ? "SAMMA WEBB. FLER KONTAKTER." : "ONE WEB. MORE CONNECTIONS."}</span>
          <div className="home-address">@{sv ? "dittnamn" : "yourname"}<br /><strong>@nolto.social</strong></div>
          <div className="home-network-names"><span>Nolto</span><span className="home-network-line" /><Globe2 /><span className="home-network-line" /><span>Mastodon</span></div>
        </div>
        <div className="home-feature-copy">
          <p className="home-eyebrow">{sv ? "DITT NÄTVERK KAN VÄXA VIDARE" : "YOUR NETWORK CAN GROW FURTHER"}</p>
          <h2>{sv ? "Bra kontakter finns överallt." : "Good connections are everywhere."}</h2>
          <p>{sv ? "Du och dina kontakter behöver inte välja samma plattform. Aktivera federation för att låta människor på exempelvis Mastodon hitta och följa din Nolto-profil." : "You and your contacts don’t have to choose the same platform. Enable federation so people on services such as Mastodon can find and follow your Nolto profile."}</p>
          <Link to="/federation" className="home-text-link">{sv ? "Lär känna det öppna nätverket" : "Meet the open network"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </div>
    </section>

    <section className="home-container home-closing">
      <div>
        <p className="home-eyebrow">{sv ? "VI SES PÅ NOLTO" : "SEE YOU ON NOLTO"}</p>
        <h2>{sv ? "Gör plats för nästa samtal." : "Make room for your next conversation."}</h2>
        <div className="home-actions"><Button asChild size="lg" className="rounded-full px-7"><Link to="/auth/signup">{sv ? "Skapa ditt konto" : "Create your account"}<ArrowUpRight className="ml-2 h-5 w-5" aria-hidden="true" /></Link></Button><Link to="/feed" className="home-text-link">{sv ? "Titta runt först" : "Look around first"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
      </div>
      <div className="home-open-source">
        <Code2 className="mb-4 h-7 w-7 text-primary" aria-hidden="true" />
        <h3>{sv ? "Öppet att bygga vidare på." : "Open to build upon."}</h3>
        <p>{sv ? "Läs koden, bidra till Nolto eller utforska vad som behövs för egen drift." : "Read the code, contribute to Nolto or explore what self-hosting involves."}</p>
        <Link to="/hosting" className="home-text-link">{sv ? "Om egen drift" : "About self-hosting"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
    </section>
  </div>;
}
