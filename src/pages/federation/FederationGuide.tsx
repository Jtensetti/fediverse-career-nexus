import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
export default function FederationGuide() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const rows = (t("ui.federationGuide.findYourProfileSearch", { returnObjects: true }) as any);
  return <main className="container max-w-3xl px-4 py-12">
    <Link className="text-sm underline" to="/">← {t("ui.federationGuide.backToHome")}</Link>
    <h1 className="text-3xl font-bold mt-8 mb-4">{t("ui.federationGuide.noltoAndMastodon")}</h1>
    <p className="text-lg text-muted-foreground mb-8">{t("ui.federationGuide.yourNoltoAddressLets")}</p>
    <div className="divide-y">{rows.map(([title, text]: [string, string]) => <section key={title} className="py-6"><h2 className="text-xl font-semibold mb-2">{title}</h2><p className="text-muted-foreground leading-relaxed">{text}</p></section>)}</div>
    <section className="rounded-xl bg-muted p-6 my-8"><h2 className="font-semibold mb-2">{t("ui.federationGuide.whatIsNotSynchronized")}</h2><p>{t("ui.federationGuide.accountsAreNotFully")}</p></section>
    <p className="mb-6 text-sm text-muted-foreground">{t("ui.federationGuide.otherServersMayRetain")}</p>
    <div className="flex flex-wrap gap-5"><Link className="underline" to={user ? "/profile/edit" : "/auth/signup"}>{t(user ? "ui.federationGuide.openProfileSettings" : "ui.federationGuide.createYourNoltoAddress")}</Link><Link className="underline" to="/privacy">{t("ui.federationGuide.readThePrivacyPolicy")}</Link><a className="underline" href="https://docs.joinmastodon.org/user/moving/" target="_blank" rel="noopener noreferrer">{t("ui.federationGuide.mastodonAccountMigrationGuide")}</a></div>
  </main>;
}
