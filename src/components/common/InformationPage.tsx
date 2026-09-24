import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SEOHead } from "@/components/common/SEOHead";
import { legalContact } from "@/components/legal/LegalDocument";

type Props = { title: string; intro: string; sections: readonly (readonly [string, string])[] };
export default function InformationPage({ title, intro, sections }: Props) {
  const { t } = useTranslation();
  return <div className="container max-w-3xl px-4 py-10 sm:py-16">
    <SEOHead title={title} description={intro} />
    <Link to="/" className="text-sm underline">← {t("ui.informationPage.backToHome")}</Link>
    <header className="my-8 space-y-3"><h1 className="text-3xl font-bold">{title}</h1><p className="text-lg text-muted-foreground">{intro}</p></header>
    <nav aria-label={t("ui.informationPage.helpAndInformation")} className="mb-8 flex flex-wrap gap-x-5 gap-y-2 border-y py-4 text-sm">
      {[["/documentation", t("ui.informationPage.gettingStarted")], ["/federation", "Nolto & Mastodon"], ["/help", t("ui.informationPage.help")], ["/privacy", t("ui.informationPage.privacy")]].map(([path, label]) =>
        <NavLink key={path} to={path} className={({ isActive }) => isActive ? "font-semibold underline" : "hover:underline"}>{label}</NavLink>)}
    </nav>
    <article className="prose dark:prose-invert max-w-none">
      {sections.map(([heading, text]) => <section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}
    </article>
    <p className="mt-10 text-sm">{t("ui.informationPage.questions")} <a className="underline" href={`mailto:${legalContact}`}>{legalContact}</a></p>
  </div>;
}
