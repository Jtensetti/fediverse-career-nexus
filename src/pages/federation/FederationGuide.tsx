import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
export default function FederationGuide() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const sv = i18n.language.startsWith("sv");
  const rows = sv ? [
    ["Hitta din profil", "Sök efter @användarnamn@nolto.social i Mastodon. WebFinger översätter adressen till din offentliga ActivityPub-profil."],
    ["Följa och dela", "Aktivera federation på din Nolto-profil. ActivityPub används sedan för följningar och offentliga inlägg mellan servrarna."],
    ["Logga in med Mastodon", "Du identifierar dig på din Mastodon-server och kommer tillbaka till Nolto. Kontona är fortfarande separata, och du väljer en egen Nolto-adress."],
    ["Importera följningar", "Exportera en följlista som CSV från Mastodon och importera den i profilinställningarna. Det skickar följförfrågningar; vissa konton behöver godkänna dem."],
    ["Flytta ett konto", "Alias och ActivityPub Move kan användas för att begära flytt av följare till en kompatibel server. Mottagande servrar avgör om flytten godtas. Inlägg, filer och privata meddelanden flyttas inte med."],
  ] : [
    ["Find your profile", "Search for @username@nolto.social in Mastodon. WebFinger resolves the address to your public ActivityPub profile."],
    ["Follow and share", "Enable federation on your Nolto profile. ActivityPub then handles follows and public posts between servers."],
    ["Sign in with Mastodon", "Authenticate on your Mastodon server and return to Nolto. The accounts remain separate and you choose your own Nolto address."],
    ["Import follows", "Export your Mastodon following list as CSV and import it in profile settings. This sends follow requests; some accounts need to approve them."],
    ["Move an account", "Aliases and ActivityPub Move can request a follower migration to a compatible server. Receiving servers decide whether to honor the move. Posts, files and private messages are not transferred."],
  ];
  return <main className="container max-w-3xl px-4 py-12">
    <Link className="text-sm underline" to="/">← {sv ? "Till startsidan" : "Back to home"}</Link>
    <h1 className="text-3xl font-bold mt-8 mb-4">{sv ? "Nolto och Mastodon" : "Nolto and Mastodon"}</h1>
    <p className="text-lg text-muted-foreground mb-8">{sv ? "En Nolto-adress gör det möjligt att hitta och följa dig från andra tjänster i fediversum. Den är inte en e-postadress." : "Your Nolto address lets people find and follow you from other federated services. It is not an email address."}</p>
    <div className="divide-y">{rows.map(([title, text]) => <section key={title} className="py-6"><h2 className="text-xl font-semibold mb-2">{title}</h2><p className="text-muted-foreground leading-relaxed">{text}</p></section>)}</div>
    <section className="rounded-xl bg-muted p-6 my-8"><h2 className="font-semibold mb-2">{sv ? "Vad synkroniseras inte?" : "What is not synchronized?"}</h2><p>{sv ? "Fullständig tvåvägssynk mellan konton ingår inte. Privat meddelandehistorik, sparade inlägg och alla Mastodon-inställningar speglas inte i Nolto. Federerade direktmeddelanden stöds inte. AT Protocol, som används av Bluesky, är ett separat protokoll och ersätter inte Mastodon-kompatibilitet." : "Accounts are not fully mirrored in both directions. Private message history, bookmarks and all Mastodon preferences are not synchronized. Federated direct messages are unsupported. Bluesky's AT Protocol is a separate protocol and does not replace Mastodon compatibility."}</p></section>
    <p className="mb-6 text-sm text-muted-foreground">{sv ? "Offentligt innehåll kan lagras på andra servrar. Att stänga av federation tar inte bort redan mottagna kopior. När din federerade adress har publicerats är användarnamnet beständigt." : "Other servers may retain public content. Disabling federation does not remove existing remote copies. Once published, your federated username is permanent."}</p>
    <div className="flex flex-wrap gap-5"><Link className="underline" to={user ? "/profile/edit" : "/auth/signup"}>{sv ? user ? "Till profilinställningar" : "Skapa din Nolto-adress" : user ? "Open profile settings" : "Create your Nolto address"}</Link><Link className="underline" to="/privacy">{sv ? "Läs integritetspolicyn" : "Read the privacy policy"}</Link><a className="underline" href="https://docs.joinmastodon.org/user/moving/" target="_blank" rel="noopener noreferrer">{sv ? "Mastodons guide till kontoflytt" : "Mastodon account migration guide"}</a></div>
  </main>;
}
