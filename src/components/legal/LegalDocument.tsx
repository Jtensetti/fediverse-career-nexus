import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SEOHead } from "@/components/common/SEOHead";
import { documents, LegalKind } from "@/components/legal/legalContent";

export const legalContact = "jtensetti@protonmail.com";
export default function LegalDocument({ kind, embedded = false }: { kind: LegalKind; embedded?: boolean }) {
  const { i18n } = useTranslation();
  const sv = i18n.language.startsWith("sv");
  const doc = documents[sv ? "sv" : "en"][kind];
  const content = <article className="prose dark:prose-invert max-w-none">
    {doc.sections.map(([heading, text]) => <section key={heading} className="mb-8"><h2>{heading}</h2><p>{text}</p></section>)}
    <section><h2>{sv ? "Kontakt" : "Contact"}</h2><p><a href={`mailto:${legalContact}`}>{legalContact}</a></p></section>
  </article>;
  if (embedded) return content;
  return <main className="container max-w-3xl px-4 py-10 sm:py-16">
    <SEOHead title={doc.title} description={doc.intro} />
    <Link to="/" className="text-sm underline">← {sv ? "Till startsidan" : "Back to home"}</Link>
    <header className="my-8 space-y-3"><h1 className="text-3xl font-bold">{doc.title}</h1><p className="text-lg text-muted-foreground">{doc.intro}</p><p className="text-sm text-muted-foreground">{sv ? "Senast reviderad" : "Last revised"}: 2026-09-21</p></header>
    <nav aria-label={sv ? "Villkor och integritet" : "Policies"} className="flex flex-wrap gap-x-5 gap-y-2 border-y py-4 mb-8 text-sm">
      {Object.entries(documents[sv ? "sv" : "en"]).map(([key, value]) => <NavLink key={key} to={value.path} className={({ isActive }) => isActive ? "font-semibold underline" : "text-muted-foreground hover:underline"}>{value.title}</NavLink>)}
    </nav>
    {content}
    <p className="mt-10 text-sm"><Link className="underline" to="/federation">{sv ? "Så fungerar Nolto och Mastodon" : "How Nolto and Mastodon work together"}</Link></p>
  </main>;
}
