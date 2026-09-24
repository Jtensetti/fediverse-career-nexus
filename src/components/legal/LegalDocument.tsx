import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SEOHead } from "@/components/common/SEOHead";
import { LegalKind, LegalDocumentContent, legalOperator, legalPaths } from "@/components/legal/legalContent";

export const legalContact = "jtensetti@protonmail.com";
export default function LegalDocument({ kind, embedded = false }: { kind: LegalKind; embedded?: boolean }) {
  const { t, i18n } = useTranslation();
  const sv = i18n.language.startsWith("sv");
  const load = (k: LegalKind) => t(`legalDocs.${k}`, { returnObjects: true }) as LegalDocumentContent;
  const doc = load(kind);
  const content = <article className="prose dark:prose-invert max-w-none">
    {doc.sections.map(([heading, text]) => <section key={heading} className="mb-8"><h2>{heading}</h2><p>{text}</p></section>)}
    <section><h2>{t("ui.legalDocument.contact")}</h2><p>{legalOperator}<br /><a href={`mailto:${legalContact}`}>{legalContact}</a></p></section>
  </article>;
  if (embedded) return content;
  return <div className="container max-w-3xl px-4 py-10 sm:py-16">
    <SEOHead title={doc.title} description={doc.intro} />
    <Link to="/" className="text-sm underline">← {t("ui.legalDocument.backToHome")}</Link>
    <header className="my-8 space-y-3"><h1 className="text-3xl font-bold">{doc.title}</h1><p className="text-lg text-muted-foreground">{doc.intro}</p><p className="text-sm text-muted-foreground">{t("ui.legalDocument.lastRevised")}: 2026-09-22</p>{!sv && !i18n.language.startsWith("en") && <p className="text-sm text-muted-foreground">{t("ui.legalDocument.translationNotice")}</p>}</header>
    <nav aria-label={t("ui.legalDocument.policies")} className="flex flex-wrap gap-x-5 gap-y-2 border-y py-4 mb-8 text-sm">
      {(Object.keys(legalPaths) as LegalKind[]).map(key => [key, { ...load(key), path: legalPaths[key] }] as const).map(([key, value]) => <NavLink key={key} to={value.path} className={({ isActive }) => isActive ? "font-semibold underline" : "text-muted-foreground hover:underline"}>{value.title}</NavLink>)}
    </nav>
    {content}
    <p className="mt-10 text-sm"><Link className="underline" to="/federation">{t("ui.legalDocument.howNoltoAndMastodon")}</Link></p>
  </div>;
}
