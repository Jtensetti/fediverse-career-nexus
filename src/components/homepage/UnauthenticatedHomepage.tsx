import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowUpRight, Code2, Globe2, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicArtwork from "@/components/layout/PublicArtwork";
import "./homepage.css";

export default function UnauthenticatedHomepage() {
  const { t } = useTranslation();
  return <div className="nolto-home">
    <section className="home-hero">
      <div className="home-hero-landscape" aria-hidden="true">
        <PublicArtwork placement="header" />
      </div>
      <div className="home-container home-hero-copy">
        <div className="home-intro">
          <p className="home-eyebrow">{t("ui.unauthenticatedHomepage.yourProfessionalNetwork")}</p>
          <h1>{t("ui.unauthenticatedHomepage.heroTitleStart")} <span>{t("ui.unauthenticatedHomepage.heroTitleEmphasis")}</span></h1>
          <p className="home-lead">{t("ui.unauthenticatedHomepage.meetPeopleShareWhat")}</p>
          <div className="home-actions">
            <Button asChild size="lg" className="home-join"><Link to="/auth/signup">{t("ui.unauthenticatedHomepage.joinNolto")}<ArrowUpRight className="ml-2 h-5 w-5" aria-hidden="true" /></Link></Button>
            <Link to="/feed" className="home-explore">{t("ui.unauthenticatedHomepage.exploreTheFeed")}<ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
          </div>
          <p className="home-footnote">{t("ui.unauthenticatedHomepage.takeALookYou")}</p>
        </div>
      </div>
    </section>

    <div className="home-values home-container" aria-label={t("ui.unauthenticatedHomepage.whatNoltoStandsFor")}>
      <span><HeartHandshake aria-hidden="true" />{t("ui.unauthenticatedHomepage.peopleComeFirst")}</span>
      <span><Globe2 aria-hidden="true" />{t("ui.unauthenticatedHomepage.partOfTheOpen")}</span>
      <span><Code2 aria-hidden="true" />{t("ui.unauthenticatedHomepage.openSource")}</span>
    </div>

    <section className="home-container home-feature home-feature--feed">
      <div className="home-feature-copy">
        <p className="home-eyebrow">{t("ui.unauthenticatedHomepage.conversationsAndNewPerspectives")}</p>
        <h2>{t("ui.unauthenticatedHomepage.startByTakingA")}</h2>
        <p>{t("ui.unauthenticatedHomepage.readWhatPeopleShare")}</p>
        <Link to="/feed" className="home-text-link">{t("ui.unauthenticatedHomepage.exploreTheFeed")}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
      <div className="home-product">
        <div className="home-product-label"><span>Nolto</span><span>{t("ui.unauthenticatedHomepage.aPlaceForFresh")}</span></div>
        <Link to="/feed" className="home-product-preview">
          <img
            src="/screenshots/feed.jpg"
            width="756"
            height="696"
            alt={t("ui.unauthenticatedHomepage.noltosPublicFeedWith")}
            loading="lazy"
            decoding="async"
          />
        </Link>
      </div>
    </section>

    <section className="home-container home-feature">
      <div className="home-feature-copy">
        <p className="home-eyebrow">{t("ui.unauthenticatedHomepage.peopleAndPossibilities")}</p>
        <h2>{t("ui.unauthenticatedHomepage.yourNextStepStarts")}</h2>
        <p>{t("ui.unauthenticatedHomepage.findJobsAndGet")}</p>
        <Link to="/jobs" className="home-text-link">{t("ui.unauthenticatedHomepage.browseJobs")}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        <Link to="/organisationer" className="home-text-link">{t("ui.unauthenticatedHomepage.discoverOrganisations")}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
      <div className="home-feature-visual">
        <img
          src="/screenshots/jobs.jpg"
          width="1328"
          height="699"
          alt={t("ui.unauthenticatedHomepage.noltosJobSearchWith")}
          loading="lazy"
          decoding="async"
        />
      </div>
    </section>

    <section className="home-network">
      <div className="home-container home-feature">
        <div className="home-address-visual" aria-hidden="true">
          <span className="home-address-caption">{t("ui.unauthenticatedHomepage.oneWebMoreConnections")}</span>
          <div className="home-address">@{t("ui.unauthenticatedHomepage.yourname")}<br /><strong>@nolto.social</strong></div>
          <div className="home-network-names"><span>Nolto</span><span className="home-network-line" /><Globe2 /><span className="home-network-line" /><span>Mastodon</span></div>
        </div>
        <div className="home-feature-copy">
          <p className="home-eyebrow">{t("ui.unauthenticatedHomepage.yourNetworkCanGrow")}</p>
          <h2>{t("ui.unauthenticatedHomepage.goodConnectionsAreEverywhere")}</h2>
          <p>{t("ui.unauthenticatedHomepage.youAndYourContacts")}</p>
          <Link to="/federation" className="home-text-link">{t("ui.unauthenticatedHomepage.meetTheOpenNetwork")}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </div>
    </section>

    <section className="home-container home-closing">
      <div>
        <p className="home-eyebrow">{t("ui.unauthenticatedHomepage.seeYouOnNolto")}</p>
        <h2>{t("ui.unauthenticatedHomepage.makeRoomForYour")}</h2>
        <div className="home-actions"><Button asChild size="lg" className="rounded-full px-7"><Link to="/auth/signup">{t("ui.unauthenticatedHomepage.createYourAccount")}<ArrowUpRight className="ml-2 h-5 w-5" aria-hidden="true" /></Link></Button><Link to="/feed" className="home-text-link">{t("ui.unauthenticatedHomepage.lookAroundFirst")}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
      </div>
      <div className="home-open-source">
        <Code2 className="mb-4 h-7 w-7 text-primary" aria-hidden="true" />
        <h3>{t("ui.unauthenticatedHomepage.openToBuildUpon")}</h3>
        <p>{t("ui.unauthenticatedHomepage.readTheCodeContribute")}</p>
        <Link to="/hosting" className="home-text-link">{t("ui.unauthenticatedHomepage.aboutSelfhosting")}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
    </section>
  </div>;
}
